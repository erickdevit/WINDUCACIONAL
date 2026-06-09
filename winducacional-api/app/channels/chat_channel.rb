# Substitui o SSE /api/chat/threads/:threadId/events: mensagens novas da
# thread chegam em tempo real com o mesmo payload do endpoint REST.
class ChatChannel < ApplicationCable::Channel
  def subscribed
    thread = Chat::ThreadService.accessible_thread(current_user, params[:thread_id])
    return reject unless thread

    stream_from "chat:thread:#{thread.id}"
  end

  def unsubscribed
    stop_all_streams
  end
end
