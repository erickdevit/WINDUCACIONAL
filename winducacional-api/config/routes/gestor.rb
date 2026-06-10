# Rotas do domínio gestor (porta de server/routes/gestor.cjs): monitoramento
# e encerramento de sessões de alunos.
scope "/api", module: :api do
  get "gestor/sessions", to: "gestor#sessions"
  post "gestor/sessions/logout", to: "gestor#logout_sessions"
end
