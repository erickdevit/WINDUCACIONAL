module Api
  # Porta de server/routes/gestor.cjs: monitoramento de sessões ativas de
  # alunos e logout forçado (individual, por turma ou geral).
  class GestorController < ApplicationController
    include Authenticatable
    include ProfessorRequired
    include RawSql

    # GET /api/gestor/sessions
    def sessions
      rows = exec_all(<<~SQL.squish)
        SELECT s.id as session_id, s.created_at as login_at,
               u.id as user_id, u.username, u.display_name,
               t.id as turma_id, t.nome as turma_nome
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        LEFT JOIN turmas t ON t.id = u.turma_id
        WHERE u.role = 'aluno' AND s.expires_at > NOW()
        ORDER BY t.nome ASC, u.username ASC
      SQL

      render json: {
        sessions: rows.map do |row|
          {
            sessionId: row["session_id"],
            loginAt: row["login_at"],
            userId: row["user_id"],
            username: row["username"],
            displayName: row["display_name"],
            turmaId: row["turma_id"],
            turmaNome: row["turma_nome"]
          }
        end
      }
    end

    # POST /api/gestor/sessions/logout
    def logout_sessions
      case params[:target]
      when "all"
        force_logout(User.where(role: "aluno").select(:id))
      when "turma"
        return invalid_logout_target unless params[:turmaId].present?

        force_logout(User.where(turma_id: params[:turmaId]).select(:id))
      when "user"
        return invalid_logout_target unless params[:userId].present?

        Session.where(user_id: params[:userId]).delete_all
        notify_force_logout([ params[:userId] ])
      else
        return invalid_logout_target
      end

      head :no_content
    end

    private

    def invalid_logout_target
      render json: { error: "Alvo de logout inválido ou incompleto." }, status: :bad_request
    end

    def force_logout(users_scope)
      sessions_scope = Session.where(user_id: users_scope)
      user_ids = sessions_scope.distinct.pluck(:user_id)
      sessions_scope.delete_all
      notify_force_logout(user_ids)
    end

    def notify_force_logout(user_ids)
      user_ids.each do |user_id|
        NotificationBroadcaster.send_to(user_id, {
          type: "force_logout",
          title: "Sessão Encerrada",
          body: "Sua sessão foi encerrada por um administrador."
        })
      end
    end
  end
end
