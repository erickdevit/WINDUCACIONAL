# Envia notificações em tempo real para um usuário via ActionCable
# (substitui o sendUserNotification baseado em SSE do Node).
module NotificationBroadcaster
  def self.send_to(user_id, notification)
    payload = notification.symbolize_keys
    payload[:id] ||= SecureRandom.uuid
    payload[:createdAt] ||= Time.current.iso8601
    ActionCable.server.broadcast("notifications:#{user_id}", { notification: payload })
  end
end
