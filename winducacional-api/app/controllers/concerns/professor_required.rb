# Equivalente ao requireProfessor do Node: professores têm acesso total,
# secretaria tem acesso somente leitura (GET).
module ProfessorRequired
  extend ActiveSupport::Concern

  included do
    before_action :require_professor!
  end

  def require_professor!
    return if current_user&.role == "professor"
    return if current_user&.role == "secretaria" && request.get?

    render json: {
      error: "Acesso restrito a professores ou secretaria (apenas leitura)."
    }, status: :forbidden
  end
end
