module ApplicationCable
  # Autentica a conexão WebSocket com o mesmo cookie HTTP-only de sessão
  # usado pelos controllers (substitui a autenticação dos SSE do Node).
  class Connection < ActionCable::Connection::Base
    identified_by :current_user

    def connect
      self.current_user = find_verified_user
    end

    private

    def find_verified_user
      token = request.cookies[Auth::SessionService.cookie_name]
      user = Auth::SessionService.user_for_token(token)
      reject_unauthorized_connection unless user
      user
    end
  end
end
