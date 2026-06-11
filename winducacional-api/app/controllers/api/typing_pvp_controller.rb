module Api
  # Duelos de digitação entre colegas de turma. Porta de server/typingPvp.cjs;
  # o stream SSE virou o TypingPvpChannel (ActionCable), usado para entregar
  # os eventos match_started/sync/match_finished/opponent_disconnected etc.
  class TypingPvpController < ApplicationController
    include Authenticatable

    # GET /api/typing-pvp/lobby
    def lobby
      players = Typing::PvpLobby.lobby_players(current_user).map(&:as_public_json)
      render json: { players: players }
    end

    # POST /api/typing-pvp/challenge
    def challenge
      target = Typing::PvpLobby.available_player(current_user, params[:targetId].to_s)
      return render json: { error: "Jogador não disponível" }, status: :bad_request unless target

      Typing::PvpLobby.notify(target.id, type: "challenge_received", challenger: current_user.as_public_json)
      NotificationBroadcaster.send_to(target.id, {
        source: "typing-pvp",
        title: "Desafio de duelo",
        body: "#{current_user.username} quer disputar uma partida de digitação.",
        icon: "typing",
        action: { type: "open-typing-pvp", challenge: { challenger: current_user.as_public_json } }
      })
      render json: { success: true }
    end

    # POST /api/typing-pvp/accept
    def accept
      result = Typing::PvpLobby.accept(current_user, params[:challengerId].to_s)
      render json: { success: true, roomId: result[:room_id] }
    end

    # POST /api/typing-pvp/reject
    def reject
      Typing::PvpLobby.reject(current_user, params[:challengerId].to_s)
      render json: { success: true }
    end

    # POST /api/typing-pvp/random
    def random
      result = Typing::PvpLobby.random_match(current_user)
      render json: { success: true, status: result[:status], roomId: result[:room_id] }.compact
    end

    # POST /api/typing-pvp/cancel-random
    def cancel_random
      Typing::PvpLobby.cancel_random(current_user.id)
      render json: { success: true }
    end

    # POST /api/typing-pvp/sync
    def sync
      state = params[:state]
      state = state.to_unsafe_h if state.is_a?(ActionController::Parameters)
      Typing::PvpLobby.sync(current_user, state)
      render json: { success: true }
    end

    # POST /api/typing-pvp/leave
    def leave
      Typing::PvpLobby.leave(current_user.id)
      render json: { success: true }
    end

    # POST /api/typing-pvp/win
    def win
      match = Typing::PvpLobby.finish_match(current_user, role: :winner)
      render json: { success: true, match: match }
    end

    # POST /api/typing-pvp/lose
    def lose
      match = Typing::PvpLobby.finish_match(current_user, role: :loser)
      render json: { success: true, match: match }
    end

    # GET /api/typing-pvp/scores
    def scores
      scope = params[:scope] == "global" ? "global" : "turma"
      matches = Typing::PvpLobby.matches(current_user, scope: scope, turma_id_param: params[:turmaId])
      render json: { matches: matches }
    end
  end
end
