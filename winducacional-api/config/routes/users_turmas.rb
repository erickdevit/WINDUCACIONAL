# Rotas de usuários e turmas (contrato idêntico ao Express legado).
scope "/api", module: :api do
  get "users/username/:username/availability", to: "users#username_availability",
    constraints: { username: /[^\/]+/ }
  get "users", to: "users#index"
  post "users", to: "users#create"
  patch "users/:id", to: "users#update"

  get "turmas", to: "turmas#index"
  post "turmas", to: "turmas#create"
  patch "turmas/:id", to: "turmas#update"
  delete "turmas/:id", to: "turmas#destroy"
end
