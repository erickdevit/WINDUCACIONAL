module Typing
  # Estado das salas de duelo de digitação (substitui os Maps em memória
  # pvpLobby/pvpClients de server/typingPvp.cjs). Usa Redis para que o
  # estado seja compartilhado entre processos/workers do Puma.
  class PvpLobby
    MATCH_WORD_COUNT = 20
    SCORE_LIMIT = 1_000_000

    def self.redis
      @redis ||= Redis.new(url: ENV.fetch("REDIS_URL", "redis://localhost:6379/1"))
    end

    def self.player_key(user_id)
      "typing_pvp:player:#{user_id}"
    end

    def self.room_key(room_id)
      "typing_pvp:room:#{room_id}"
    end

    # GET /api/typing-pvp/lobby: colegas online sem partida em andamento.
    def self.lobby_players(viewer)
      OnlineUserTracker.online_classmates(viewer).select do |player|
        room_id_for(player.id).blank?
      end
    end

    # POST /api/typing-pvp/challenge: alvo precisa estar online, na mesma
    # turma e sem partida em andamento.
    def self.available_player(current_user, target_id)
      return nil if target_id.blank?

      OnlineUserTracker.online_classmates(current_user).find do |player|
        player.id == target_id && room_id_for(player.id).blank?
      end
    end

    def self.room_id_for(user_id)
      redis.hget(player_key(user_id), "room_id").presence
    end

    # POST /api/typing-pvp/accept
    def self.accept(current_user, challenger_id)
      challenger = available_classmate(current_user, challenger_id)
      raise ApiError.new("Desafiante não está mais disponível", 400) unless challenger

      build_match(current_user, challenger)
    end

    # POST /api/typing-pvp/random
    def self.random_match(current_user)
      matched = find_random_opponent(current_user)
      if matched
        redis.hset(player_key(matched.id), "waiting_random", "0")
        build_match(current_user, matched).merge(status: "matched")
      else
        redis.hset(player_key(current_user.id), "waiting_random", "1")
        { status: "waiting" }
      end
    end

    def self.cancel_random(user_id)
      redis.hset(player_key(user_id), "waiting_random", "0") if redis.exists?(player_key(user_id))
    end

    # POST /api/typing-pvp/reject
    def self.reject(current_user, challenger_id)
      challenger = available_classmate(current_user, challenger_id)
      return unless challenger

      notify(challenger.id, type: "challenge_rejected", rejecter: current_user.as_public_json)
    end

    # POST /api/typing-pvp/sync: repassa o estado para o adversário e
    # acompanha a pontuação (wordsCompleted) para o resultado final.
    def self.sync(current_user, state)
      room_id = room_id_for(current_user.id)
      raise ApiError.new("Não está em uma partida", 400) if room_id.blank?

      if state.is_a?(Hash) && state.key?("wordsCompleted")
        record_progress(current_user.id, state["wordsCompleted"])
      end

      other_id = opponent_id(room_id, current_user.id)
      notify(other_id, type: "sync", userId: current_user.id, state: state) if other_id
    end

    # POST /api/typing-pvp/leave
    def self.leave(user_id)
      room_id = room_id_for(user_id)
      return if room_id.blank?

      other_id = opponent_id(room_id, user_id)
      redis.del(room_key(room_id))
      redis.hset(player_key(user_id), "room_id", "")

      return unless other_id

      redis.hset(player_key(other_id), "room_id", "")
      notify(other_id, type: "opponent_disconnected")
    end

    # POST /api/typing-pvp/win e /api/typing-pvp/lose
    def self.finish_match(current_user, role: nil)
      room_id = room_id_for(current_user.id)
      raise ApiError.new("Não está em uma partida", 400) if room_id.blank?

      opponent = User.find_by(id: opponent_id(room_id, current_user.id))
      unless opponent
        message = role == :winner ? "Não foi possível identificar o oponente do duelo." : "Não foi possível identificar o vencedor do duelo."
        raise ApiError.new(message, 409)
      end

      winner, loser = result_for(room_id)
      raise ApiError.new("Partida ainda não concluída.", 409) unless winner && loser

      final_winner_score = score_for(winner.id)
      final_loser_score = score_for(loser.id)

      TypingPvpMatch.create!(
        winner_id: winner.id,
        loser_id: loser.id,
        winner_score: final_winner_score,
        loser_score: final_loser_score,
        turma_id: current_user.turma_id
      )

      match = {
        winnerId: winner.id,
        loserId: loser.id,
        winnerScore: final_winner_score,
        loserScore: final_loser_score
      }

      [ winner.id, loser.id ].each do |id|
        notify(id, match.merge(type: "match_finished"))
        redis.hset(player_key(id), "room_id", "")
      end
      redis.del(room_key(room_id))

      match
    end

    # GET /api/typing-pvp/scores
    def self.matches(current_user, scope:, turma_id_param:)
      where = "WHERE w.role = 'aluno' AND l.role = 'aluno'"
      binds = []

      if scope != "global"
        turma_id = current_user.role == "professor" && turma_id_param.present? ? turma_id_param : current_user.turma_id
        return [] if turma_id.blank?

        binds << turma_id
        where += " AND m.turma_id = $1"
      end

      sql = <<~SQL.squish
        SELECT m.id, m.created_at, m.winner_score, m.loser_score,
               w.username AS winner_name, w.id AS winner_id,
               l.username AS loser_name, l.id AS loser_id
        FROM typing_pvp_matches m
        LEFT JOIN users w ON w.id = m.winner_id
        LEFT JOIN users l ON l.id = m.loser_id
        #{where}
        ORDER BY m.created_at DESC LIMIT 50
      SQL
      ApplicationRecord.connection.exec_query(sql, "typing_pvp_scores", binds).to_a
    end

    def self.notify(user_id, payload)
      ActionCable.server.broadcast("typing_pvp:#{user_id}", payload)
    end

    # --- Auxiliares ---

    def self.available_classmate(current_user, target_id)
      return nil if target_id.blank?

      OnlineUserTracker.online_classmates(current_user).find do |player|
        player.id == target_id && room_id_for(player.id).blank?
      end
    end
    private_class_method :available_classmate

    def self.find_random_opponent(current_user)
      OnlineUserTracker.online_classmates(current_user).find do |player|
        redis.hget(player_key(player.id), "waiting_random") == "1" && room_id_for(player.id).blank?
      end
    end
    private_class_method :find_random_opponent

    # Cria a sala da partida e retorna o payload de match_started.
    def self.build_match(player_a, player_b)
      room_id = SecureRandom.uuid
      redis.sadd(room_key(room_id), [ player_a.id, player_b.id ])
      [ player_a, player_b ].each do |player|
        redis.hset(player_key(player.id), "room_id", room_id, "words_completed", 0, "completed_at", "")
      end

      payload = {
        type: "match_started",
        roomId: room_id,
        seed: pvp_seed,
        players: [ player_a, player_b ].map(&:as_public_json)
      }
      [ player_a, player_b ].each { |player| notify(player.id, payload) }

      { room_id: room_id, seed: payload[:seed], players: [ player_a, player_b ] }
    end
    private_class_method :build_match

    def self.opponent_id(room_id, user_id)
      (redis.smembers(room_key(room_id)) - [ user_id ]).first
    end
    private_class_method :opponent_id

    def self.score_for(user_id)
      redis.hget(player_key(user_id), "words_completed").to_i
    end
    private_class_method :score_for

    def self.completed_at_for(user_id)
      value = redis.hget(player_key(user_id), "completed_at")
      value.present? ? value.to_f : Float::INFINITY
    end
    private_class_method :completed_at_for

    def self.record_progress(user_id, value)
      score = [ score_for(user_id), coerce_score(value) ].max.clamp(0, MATCH_WORD_COUNT)
      redis.hset(player_key(user_id), "words_completed", score)
      if score >= MATCH_WORD_COUNT && redis.hget(player_key(user_id), "completed_at").blank?
        redis.hset(player_key(user_id), "completed_at", Time.current.to_f)
      end
      score
    end
    private_class_method :record_progress

    def self.result_for(room_id)
      users = User.where(id: redis.smembers(room_key(room_id))).index_by(&:id)
      players = users.values
      return [ nil, nil ] unless players.length == 2

      finished = players.select { |player| score_for(player.id) >= MATCH_WORD_COUNT }
      return [ nil, nil ] if finished.empty?

      winner = finished.min_by { |player| [ completed_at_for(player.id), player.id ] }
      loser = players.find { |player| player.id != winner.id }
      [ winner, loser ]
    end
    private_class_method :result_for

    def self.coerce_score(value)
      number = Float(value)
      return 0 unless number.finite?

      number.truncate.clamp(0, SCORE_LIMIT)
    rescue ArgumentError, TypeError
      0
    end
    private_class_method :coerce_score

    def self.pvp_seed
      (Time.now.to_f * 1000).to_i + rand(99_999)
    end
    private_class_method :pvp_seed
  end
end
