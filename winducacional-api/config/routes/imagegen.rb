# Rotas do domínio imagegen (porta de server/routes/imagegen.cjs): status e
# geração de imagens via proxy.
scope "/api", module: :api do
  get "imagegen/config", to: "imagegen#show_config"
  post "imagegen/generate", to: "imagegen#generate"
end
