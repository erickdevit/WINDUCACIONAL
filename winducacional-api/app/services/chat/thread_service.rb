module Chat
  # Regras de acesso e criação de threads de chat, portadas de chat.cjs.
  class ThreadService
    # Professor e secretaria acessam qualquer thread; aluno acessa o grupo da
    # própria turma e DMs das quais participa.
    def self.accessible_thread(user, thread_id)
      thread = ChatThread.find_by(id: thread_id)
      return nil unless thread
      return thread if %w[professor secretaria].include?(user.role)

      if thread.type == "group"
        thread.turma_id == user.turma_id ? thread : nil
      else
        [thread.user_a, thread.user_b].include?(user.id) ? thread : nil
      end
    end

    def self.ensure_group_thread(turma_id)
      existing = ChatThread.find_by(type: "group", turma_id: turma_id)
      return existing.id if existing

      ChatThread.create!(type: "group", turma_id: turma_id).id
    rescue ActiveRecord::RecordNotUnique
      ChatThread.find_by!(type: "group", turma_id: turma_id).id
    end

    def self.ensure_dm_thread(user_a, user_b)
      existing = find_dm(user_a, user_b)
      return existing.id if existing

      ChatThread.create!(type: "dm", user_a: user_a, user_b: user_b).id
    rescue ActiveRecord::RecordNotUnique
      find_dm(user_a, user_b).id
    end

    def self.find_dm(user_a, user_b)
      ChatThread.where(type: "dm")
        .where("(user_a = :a AND user_b = :b) OR (user_a = :b AND user_b = :a)", a: user_a, b: user_b)
        .first
    end

    # Payload de mensagem no mesmo formato snake_case do Node (o frontend
    # legado consome estes campos diretamente).
    def self.public_message(message, sender: nil)
      sender_name = sender&.display_name || message.try(:sender_name) || message.sender.display_name
      sender_username = sender&.username || message.try(:sender_username) || message.sender.username
      sender_role = sender&.role || message.try(:sender_role) || message.sender.role
      {
        id: message.id,
        thread_id: message.thread_id,
        sender_id: message.sender_id,
        body: message.body,
        attachment: message.attachment,
        created_at: message.created_at,
        sender_name: sender_name,
        sender_username: sender_username,
        sender_role: sender_role
      }
    end

    def self.notify_recipients(thread, message_payload)
      title =
        if thread.type == "group"
          "Nova mensagem no grupo"
        else
          "Mensagem de #{message_payload[:sender_username]}"
        end
      body = message_payload[:body].to_s.strip
      body = message_payload[:attachment] ? "Enviou um arquivo." : "Enviou uma mensagem." if body.blank?

      notification = {
        source: "chat",
        title: title,
        body: body,
        icon: "chat",
        action: {
          type: "open-chat",
          threadId: thread.id,
          threadType: thread.type,
          turmaId: thread.turma_id,
          peer: {
            id: message_payload[:sender_id],
            username: message_payload[:sender_username],
            displayName: message_payload[:sender_name]
          }
        }
      }

      if thread.type == "dm"
        [thread.user_a, thread.user_b]
          .compact
          .reject { |user_id| user_id == message_payload[:sender_id] }
          .each { |user_id| NotificationBroadcaster.send_to(user_id, notification) }
        return
      end

      return if thread.turma_id.blank?

      User.active
        .where(turma_id: thread.turma_id)
        .where.not(id: message_payload[:sender_id])
        .pluck(:id)
        .each { |user_id| NotificationBroadcaster.send_to(user_id, notification) }
    end
  end
end
