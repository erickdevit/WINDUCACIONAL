Rails.application.routes.draw do
  # Contrato de API idêntico ao servidor Express legado (paths /api/*),
  # permitindo que o frontend React migre sem alterar chamadas.
  scope "/api", module: :api do
    # Saúde e versão
    get "health", to: "health#show"
    get "app/version", to: "health#version"

    # Bootstrap do primeiro professor
    get "bootstrap/status", to: "auth#bootstrap_status"
    post "bootstrap", to: "auth#bootstrap"

    # Autenticação
    get "auth/me", to: "auth#me"
    patch "auth/me/display-name", to: "auth#update_display_name"
    post "auth/login", to: "auth#login"
    post "auth/register", to: "auth#register"
    post "auth/logout", to: "auth#logout"
  end

  # Rotas por domínio (config/routes/*.rb)
  draw(:users_turmas)
  draw(:exams)
  draw(:typing)
  draw(:apps)
  draw(:fs)
  draw(:gestor)
  draw(:imagegen)
  draw(:edge_proxy)

  mount ActionCable.server => "/cable"
end
