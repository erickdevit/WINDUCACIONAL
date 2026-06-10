# Rotas do domínio fs (porta de server/routes/fs.cjs): árvore de arquivos
# visível ao usuário e configurações pessoais.
scope "/api", module: :api do
  get "fs/tree", to: "file_system#show_tree"
  put "fs/tree", to: "file_system#update_tree"
  get "user/config", to: "file_system#show_config"
  put "user/config", to: "file_system#update_config"
end
