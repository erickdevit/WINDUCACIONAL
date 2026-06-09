# Substitui o SSE /api/typing/settings/events: o professor salva as
# configurações e todos os alunos conectados recebem a atualização ao vivo.
class TypingSettingsChannel < ApplicationCable::Channel
  def subscribed
    student_type = resolved_student_type
    return reject unless TypingSetting::STUDENT_TYPES.include?(student_type)

    stream_from "typing_settings:#{student_type}"

    transmit({
      event: "typing-settings",
      settings: TypingSetting.for_type(student_type).as_public_json,
      gameSettings: TypingGameSetting.for_type(student_type).as_public_json
    })
  end

  def unsubscribed
    stop_all_streams
  end

  private

  # Aluno recebe sempre o canal do próprio tipo; professor pode escolher.
  def resolved_student_type
    if current_user.role == "aluno"
      current_user.resolved_student_type
    else
      params[:student_type].to_s.presence || "normal"
    end
  end
end
