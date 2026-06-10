# Substitui o stream SSE /api/typing-pvp/stream: entrega os eventos de
# duelo (challenge_received, match_started, sync, match_finished,
# opponent_disconnected, challenge_rejected) para o usuário autenticado.
class TypingPvpChannel < ApplicationCable::Channel
  def subscribed
    stream_from "typing_pvp:#{current_user.id}"
    transmit(type: "connected", user: current_user.as_public_json)
  end

  def unsubscribed
    Typing::PvpLobby.leave(current_user.id)
    stop_all_streams
  end
end
