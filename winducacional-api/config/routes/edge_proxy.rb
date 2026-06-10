# Rotas do domínio edge_proxy (porta de server/routes/edgeProxy.cjs): proxy
# para exibir páginas do Google/YouTube no navegador simulado.
scope "/api", module: :api do
  get "edge-proxy", to: "edge_proxy#show"
end
