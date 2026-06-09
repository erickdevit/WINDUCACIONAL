# Autenticação via cookie HTTP-only customizado, equivalente ao requireAuth
# do servidor Node. Define current_user para os controllers.
module Authenticatable
  extend ActiveSupport::Concern

  included do
    before_action :authenticate_user!
  end

  def authenticate_user!
    token = cookies[Auth::SessionService.cookie_name]
    return render_unauthorized("Sessão ausente.") if token.blank?

    user = Auth::SessionService.user_for_token(token)
    return render_unauthorized("Sessão inválida ou expirada.") unless user

    @current_user = user
  end

  def current_user
    @current_user
  end

  def session_token
    cookies[Auth::SessionService.cookie_name]
  end

  private

  def render_unauthorized(message)
    render json: { error: message }, status: :unauthorized
  end
end
