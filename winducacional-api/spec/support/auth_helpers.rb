module AuthHelpers
  # Cria sessão e injeta o cookie HTTP-only nas requisições de request spec.
  def login_as(user)
    token = SecureRandom.hex(32)
    Session.create!(
      user_id: user.id,
      token_hash: Session.hash_token(token),
      expires_at: 7.days.from_now
    )
    cookies[Auth::SessionService.cookie_name] = token
    token
  end

  def json_body
    JSON.parse(response.body, symbolize_names: true)
  end
end
