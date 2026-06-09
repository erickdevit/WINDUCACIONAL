# Substitui o SSE /api/notifications/events: notificações por usuário e
# rastreio de usuários online.
class NotificationsChannel < ApplicationCable::Channel
  def subscribed
    stream_from "notifications:#{current_user.id}"
    OnlineUserTracker.add(current_user)
  end

  def unsubscribed
    OnlineUserTracker.remove(current_user)
    stop_all_streams
  end
end
