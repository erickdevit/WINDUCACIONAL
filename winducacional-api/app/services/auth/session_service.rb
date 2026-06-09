module Auth
  # Sessões com cookie HTTP-only, compatíveis byte a byte com o servidor Node:
  # token aleatório de 32 bytes em hex, SHA-256 armazenado em sessions.token_hash.
  class SessionService
    def self.cookie_name
      Rails.application.config.x.session_cookie_name
    end

    def self.session_days
      Rails.application.config.x.session_days
    end

    # Política de sessão única por usuário (idêntica ao Node): derruba as
    # sessões anteriores e avisa os clientes conectados.
    def self.create_session(user)
      Session.where(user_id: user.id).delete_all
      NotificationBroadcaster.send_to(user.id, {
        type: "force_logout",
        title: "Sessão Encerrada",
        body: "Uma nova conexão foi detectada. Esta sessão foi encerrada."
      })

      token = SecureRandom.hex(32)
      Session.create!(
        user_id: user.id,
        token_hash: Session.hash_token(token),
        expires_at: session_days.days.from_now
      )
      Attendance::AttendanceService.record_login(user.id)
      token
    end

    def self.destroy_session(token)
      return if token.blank?
      Session.where(token_hash: Session.hash_token(token)).delete_all
    end

    def self.set_cookie(cookies, token, secure:)
      cookies[cookie_name] = {
        value: token,
        httponly: true,
        same_site: :lax,
        path: "/",
        expires: session_days.days.from_now,
        secure: secure
      }
    end

    def self.clear_cookie(cookies)
      cookies.delete(cookie_name, path: "/")
    end

    # Resolve o usuário da sessão com o student_type efetivo da turma,
    # como o requireAuth do Node.
    def self.user_for_token(token)
      return nil if token.blank?
      Session.valid
        .joins(:user)
        .where(token_hash: Session.hash_token(token), users: { active: true })
        .first
        &.user
    end
  end
end
