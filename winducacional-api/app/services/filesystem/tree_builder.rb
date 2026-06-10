module Filesystem
  # Monta a árvore de arquivos visível ao usuário (C:\Users com o disco de
  # cada aluno/professor visível) e extrai os discos editáveis de uma árvore
  # recebida do cliente. Porta de buildVisibleTree/extractVisibleHomes do
  # servidor Node (server/index.cjs).
  class TreeBuilder
    def self.base_tree_path
      Rails.application.config.x.base_tree_path
    end

    def self.load_base_tree
      JSON.parse(File.read(base_tree_path))
    end

    def self.build_visible_tree(viewer)
      tree = load_base_tree
      users_folder = tree["C:"]["data"]["Users"]
      visible_users = viewer.role != "aluno" ? User.active.order(role: :desc, username: :asc) : [ viewer ]

      users_folder["data"] = { "Public" => users_folder["data"]["Public"] }
      visible_users.each do |user|
        users_folder["data"][user.username] = UserDiskService.read_home(user, viewer.username)
      end

      tree
    end

    # Retorna o mapa de discos de usuários (C:\Users\*) de uma árvore
    # recebida do cliente, ou nil se a árvore estiver malformada.
    def self.extract_visible_homes(tree)
      return nil unless tree.is_a?(Hash)

      users_data = tree.dig("C:", "data", "Users", "data")
      users_data.is_a?(Hash) ? users_data : nil
    end
  end
end
