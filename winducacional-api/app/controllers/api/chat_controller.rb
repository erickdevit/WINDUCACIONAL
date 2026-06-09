module Api
  # Chat de turma (grupo) e mensagens diretas. Portado de
  # server/routes/chat.cjs; o SSE de mensagens virou o ChatChannel
  # (ActionCable), mantendo o mesmo payload de mensagem.
  class ChatController < ApplicationController
    include Authenticatable

    def turmas
      rows =
        if current_user.role != "aluno"
          Turma.active.order(:nome).select(:id, :nome)
        elsif current_user.turma_id.present?
          Turma.where(id: current_user.turma_id).select(:id, :nome)
        else
          []
        end
      render json: { turmas: rows.map { |turma| { id: turma.id, nome: turma.nome } } }
    end

    def members
      return render_access_denied unless can_view_turma?(params[:turma_id])

      members = User.active
        .where(turma_id: params[:turma_id])
        .where.not(id: current_user.id)
        .order(:display_name)
        .map do |user|
          { id: user.id, username: user.username, displayName: user.display_name, role: user.role }
        end
      render json: { members: members }
    end

    def group_thread
      return render_access_denied unless can_view_turma?(params[:turma_id])

      render json: { threadId: Chat::ThreadService.ensure_group_thread(params[:turma_id]) }
    end

    def dm
      peer_id = params[:peerId]
      if peer_id.blank? || peer_id == current_user.id
        return render json: { error: "Destinatário inválido." }, status: :bad_request
      end

      peer = User.active.find_by(id: peer_id)
      return render json: { error: "Usuário não encontrado." }, status: :not_found unless peer

      # Alunos só conversam com colegas da mesma turma ou com professor/secretaria.
      student_pair = !%w[professor secretaria].include?(current_user.role) &&
        !%w[professor secretaria].include?(peer.role)
      if student_pair && current_user.turma_id != peer.turma_id
        return render json: { error: "Vocês não pertencem à mesma turma." }, status: :forbidden
      end

      render json: { threadId: Chat::ThreadService.ensure_dm_thread(current_user.id, peer_id) }
    end

    def messages
      thread = accessible_thread(params[:thread_id])
      return render_access_denied unless thread

      limit = [params[:limit].to_i.nonzero? || 100, 200].min
      scope = ChatMessage.joins(:sender)
        .where(thread_id: thread.id)
        .order(created_at: :desc)
        .limit(limit)
      scope = scope.where("chat_messages.created_at < ?", params[:before]) if params[:before].present?

      messages = scope.select(
        "chat_messages.*",
        "users.display_name AS sender_name",
        "users.username AS sender_username",
        "users.role AS sender_role"
      ).to_a.reverse.map { |message| Chat::ThreadService.public_message(message) }

      render json: { messages: messages }
    end

    def create_message
      thread = accessible_thread(params[:thread_id])
      return render_access_denied unless thread

      body = params[:body].to_s.strip
      attachment = params[:attachment]

      if body.blank? && attachment.blank?
        return render json: { error: "Mensagem vazia." }, status: :bad_request
      end
      if body.length > 2000
        return render json: { error: "Mensagem muito longa (máximo 2000 caracteres)." }, status: :bad_request
      end

      safe_attachment = nil
      if attachment.present?
        unless attachment.respond_to?(:[]) && attachment[:name].present? && attachment[:content].present?
          return render json: { error: "Anexo inválido." }, status: :bad_request
        end
        safe_attachment = {
          name: attachment[:name].to_s[0, 255],
          content: attachment[:content].to_s[0, 100_000],
          type: (attachment[:type].presence || "txt").to_s[0, 10]
        }
      end

      message = ChatMessage.create!(
        thread_id: thread.id,
        sender_id: current_user.id,
        body: body,
        attachment: safe_attachment
      )

      payload = Chat::ThreadService.public_message(message, sender: current_user)
      ActionCable.server.broadcast("chat:thread:#{thread.id}", payload)
      Chat::ThreadService.notify_recipients(thread, payload)

      render json: { message: payload }, status: :created
    end

    def my_threads
      rows = ActiveRecord::Base.connection.exec_query(
        <<~SQL.squish, "chat_my_threads", [current_user.id]
          SELECT t.id, t.type, t.turma_id, t.user_a, t.user_b,
                 ua.display_name AS user_a_name, ua.username AS user_a_username,
                 ub.display_name AS user_b_name, ub.username AS user_b_username,
                 lm.body AS last_body, lm.created_at AS last_at, lm.sender_id AS last_sender_id
          FROM chat_threads t
          LEFT JOIN users ua ON ua.id = t.user_a
          LEFT JOIN users ub ON ub.id = t.user_b
          LEFT JOIN LATERAL (
            SELECT body, created_at, sender_id FROM chat_messages
            WHERE thread_id = t.id ORDER BY created_at DESC LIMIT 1
          ) lm ON TRUE
          WHERE t.type = 'dm' AND (t.user_a = $1 OR t.user_b = $1)
          ORDER BY lm.created_at DESC NULLS LAST
        SQL
      )
      render json: { threads: rows.to_a }
    end

    private

    def can_view_turma?(turma_id)
      %w[professor secretaria].include?(current_user.role) || current_user.turma_id == turma_id
    end

    def accessible_thread(thread_id)
      Chat::ThreadService.accessible_thread(current_user, thread_id)
    end

    def render_access_denied
      render json: { error: "Acesso negado." }, status: :forbidden
    end
  end
end
