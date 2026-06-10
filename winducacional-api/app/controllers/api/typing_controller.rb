module Api
  # Porta de server/routes/typing.cjs: configurações de digitação, pontuações
  # e rankings (views SQL typing_ranking / typing_game_ranking).
  class TypingController < ApplicationController
    include Authenticatable
    include ProfessorRequired

    skip_before_action :require_professor!, only: %i[
      show_settings show_game_settings create_score create_game_score
      ranking_global ranking_turma game_ranking_global game_ranking_turma
    ]

    RANKING_ORDER = "ORDER BY points DESC, best_wpm DESC, best_accuracy DESC, best_time ASC".freeze
    TYPING_RANKING_FIELDS = "name, lessons_completed, points, best_wpm, best_accuracy, best_time".freeze
    GAME_RANKING_FIELDS = "name, missions_completed, points, best_wpm, best_accuracy, best_time".freeze

    # GET /api/typing/settings/:studentType
    def show_settings
      student_type = normalize_student_type(params[:studentType])
      if current_user.role != "professor" && current_user.resolved_student_type != student_type
        return render json: { error: "Configuração de digitação restrita ao tipo do aluno." }, status: :forbidden
      end

      render json: { settings: TypingSetting.for_type(student_type).as_public_json }
    end

    # PUT /api/typing/settings/:studentType
    def update_settings
      student_type = normalize_student_type(params[:studentType])
      setting = TypingSetting.for_type(student_type)

      # Limites espelham os CHECK constraints do banco (clamp como no Node)
      setting.pass_min_wpm = clamp_integer(params[:passMinWpm], setting.pass_min_wpm, 10, 120)
      setting.pass_min_accuracy = clamp_integer(params[:passMinAccuracy], setting.pass_min_accuracy, 50, 100)
      setting.max_errors = clamp_integer(params[:maxErrors], setting.max_errors, 3, 10)
      setting.updated_at = Time.current
      setting.save!

      broadcast_settings(student_type)
      render json: { settings: setting.as_public_json }
    end

    # GET /api/typing/game/settings/:studentType
    def show_game_settings
      student_type = normalize_student_type(params[:studentType])
      if current_user.role != "professor" && current_user.resolved_student_type != student_type
        return render json: { error: "Configuração do game de digitação restrita ao tipo do aluno." }, status: :forbidden
      end

      render json: { settings: TypingGameSetting.for_type(student_type).as_public_json }
    end

    # PUT /api/typing/game/settings/:studentType
    def update_game_settings
      student_type = normalize_student_type(params[:studentType])
      setting = TypingGameSetting.for_type(student_type)

      setting.pass_min_wpm = clamp_integer(params[:passMinWpm], setting.pass_min_wpm, 10, 120)
      setting.pass_min_accuracy = clamp_integer(params[:passMinAccuracy], setting.pass_min_accuracy, 50, 100)
      setting.max_lives = clamp_integer(params[:maxLives], setting.max_lives, 3, 10)
      setting.game_speed = clamp_integer(params[:gameSpeed], setting.game_speed, 0, 100)
      setting.game_speed_boost = clamp_integer(params[:gameSpeedBoost], setting.game_speed_boost, 0, 100)
      setting.updated_at = Time.current
      setting.save!

      broadcast_settings(student_type)
      render json: { settings: setting.as_public_json }
    end

    # POST /api/typing/score
    def create_score
      if params[:lessonId].nil? || params[:wpm].nil? || params[:accuracy].nil?
        return render json: { error: "Dados incompletos." }, status: :bad_request
      end

      TypingScore.create!(
        user_id: current_user.id,
        lesson_id: params[:lessonId],
        wpm: params[:wpm],
        accuracy: params[:accuracy],
        time_ms: params[:timeMs] || 0
      )
      render json: { ok: true }, status: :created
    end

    # POST /api/typing/game/score
    def create_game_score
      if params[:missionId].blank? || params[:missionTitle].blank? ||
         params[:score].nil? || params[:wpm].nil? || params[:accuracy].nil?
        return render json: { error: "Dados incompletos." }, status: :bad_request
      end

      status = params[:status].nil? ? "lost" : params[:status]
      unless TypingGameScore::STATUSES.include?(status)
        return render json: { error: "Status do game inválido." }, status: :bad_request
      end

      TypingGameScore.create!(
        user_id: current_user.id,
        mission_id: params[:missionId].to_s[0, 80],
        mission_title: params[:missionTitle].to_s[0, 120],
        score: clamp_integer(params[:score], 0, 0, 1_000_000),
        wpm: clamp_integer(params[:wpm], 0, 0, 300),
        accuracy: clamp_integer(params[:accuracy], 0, 0, 100),
        hits: clamp_integer(params[:hits], 0, 0, 100_000),
        error_count: clamp_integer(params[:errors], 0, 0, 100_000),
        status: status,
        time_ms: clamp_integer(params[:timeMs], 0, 0, 24 * 60 * 60 * 1000)
      )
      render json: { ok: true }, status: :created
    end

    # GET /api/typing/ranking/global
    def ranking_global
      student_type = normalize_student_type(
        params[:studentType].presence || current_user.resolved_student_type
      )
      rows = select_ranking("typing_ranking", TYPING_RANKING_FIELDS, "student_type = ?", [ student_type ])
      render json: { ranking: rows }
    end

    # GET /api/typing/ranking/turma
    def ranking_turma
      return render json: { ranking: [] } if current_user.turma_id.blank?

      rows = select_ranking(
        "typing_ranking", TYPING_RANKING_FIELDS,
        "turma_id = ? AND student_type = ?",
        [ current_user.turma_id, current_user.resolved_student_type ]
      )
      render json: { ranking: rows }
    end

    # GET /api/typing/ranking/turma/:id (professor)
    def ranking_turma_by_id
      turma = Turma.find_by(id: params[:id])
      return render json: { error: "Turma não encontrada." }, status: :not_found unless turma

      rows = select_ranking(
        "typing_ranking", TYPING_RANKING_FIELDS,
        "turma_id = ? AND student_type = ?",
        [ turma.id, turma.student_type ]
      )
      render json: { ranking: rows }
    end

    # POST /api/typing/ranking/turma/reset (professor)
    def reset_turma_ranking
      reset_scores_for_turma(TypingScore)
    end

    # GET /api/typing/game/ranking/global
    def game_ranking_global
      student_type = normalize_student_type(
        params[:studentType].presence || current_user.resolved_student_type
      )
      rows = select_ranking("typing_game_ranking", GAME_RANKING_FIELDS, "student_type = ?", [ student_type ])
      render json: { ranking: rows }
    end

    # GET /api/typing/game/ranking/turma
    def game_ranking_turma
      return render json: { ranking: [] } if current_user.turma_id.blank?

      rows = select_ranking(
        "typing_game_ranking", GAME_RANKING_FIELDS,
        "turma_id = ? AND student_type = ?",
        [ current_user.turma_id, current_user.resolved_student_type ]
      )
      render json: { ranking: rows }
    end

    # GET /api/typing/game/ranking/turma/:id (professor)
    def game_ranking_turma_by_id
      turma = Turma.find_by(id: params[:id])
      return render json: { error: "Turma não encontrada." }, status: :not_found unless turma

      rows = select_ranking(
        "typing_game_ranking", GAME_RANKING_FIELDS,
        "turma_id = ? AND student_type = ?",
        [ turma.id, turma.student_type ]
      )
      render json: { ranking: rows }
    end

    # POST /api/typing/game/ranking/turma/reset (professor)
    def reset_game_turma_ranking
      reset_scores_for_turma(TypingGameScore)
    end

    private

    # Equivalente ao normalizeTypingStudentType do Node
    def normalize_student_type(value)
      normalized = value.to_s.strip.downcase
      normalized = "normal" if normalized.blank?
      unless TypingSetting::STUDENT_TYPES.include?(normalized)
        raise ApiError.new("Tipo de digitação inválido.", 400)
      end
      normalized
    end

    # Equivalente ao clampInteger do Node (fallback quando não numérico)
    def clamp_integer(value, fallback, min, max)
      parsed = begin
        Float(value)
      rescue ArgumentError, TypeError
        nil
      end
      safe = parsed&.finite? ? parsed.truncate : fallback
      safe.clamp(min, max)
    end

    # Mesmo shape transmitido pelo TypingSettingsChannel no subscribe
    def broadcast_settings(student_type)
      ActionCable.server.broadcast("typing_settings:#{student_type}", {
        event: "typing-settings",
        settings: TypingSetting.for_type(student_type).as_public_json,
        gameSettings: TypingGameSetting.for_type(student_type).as_public_json
      })
    end

    # Consulta as views SQL de ranking (mantém as chaves snake_case do Node)
    def select_ranking(view, fields, where_sql, binds)
      sql = "SELECT #{fields} FROM #{view} WHERE #{where_sql} #{RANKING_ORDER}"
      ApplicationRecord.connection.select_all(
        ApplicationRecord.sanitize_sql_array([ sql, *binds ])
      ).to_a
    end

    # Lógica compartilhada dos dois endpoints de reset de ranking por turma
    def reset_scores_for_turma(score_model)
      turma_code = Turma.normalize_code(params[:turmaCode])
      unless turma_code.match?(/\A[A-Z0-9]{6}\z/)
        return render json: { error: "Informe um código de turma válido com 6 caracteres." }, status: :bad_request
      end

      turma = Turma.find_by(code: turma_code)
      return render json: { error: "Código de turma não encontrado." }, status: :not_found unless turma

      deleted = score_model
        .where(user_id: User.where(turma_id: turma.id, student_type: turma.student_type).select(:id))
        .delete_all

      render json: {
        ok: true,
        deletedScores: deleted,
        turma: {
          id: turma.id,
          nome: turma.nome,
          code: turma.code,
          studentType: turma.student_type
        }
      }
    end
  end
end
