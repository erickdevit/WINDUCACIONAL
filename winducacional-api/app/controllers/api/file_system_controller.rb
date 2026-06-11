module Api
  # Porta de server/routes/fs.cjs: árvore de arquivos visível ao usuário
  # (C:\Users) e configurações pessoais salvas em data/users/<storage_key>.
  class FileSystemController < ApplicationController
    include Authenticatable

    # GET /api/fs/tree
    def show_tree
      render json: { tree: Filesystem::TreeBuilder.build_visible_tree(current_user) }
    end

    # PUT /api/fs/tree
    def update_tree
      tree = params[:tree]
      tree = tree.to_unsafe_h if tree.is_a?(ActionController::Parameters)

      users_data = Filesystem::TreeBuilder.extract_visible_homes(tree)
      return render json: { error: "Árvore de arquivos inválida." }, status: :bad_request unless users_data

      if current_user.role == "professor"
        writable_homes = []
        User.active.each do |user|
          home_data = users_data.dig(user.username, "data")
          next unless home_data

          unless home_data.is_a?(Hash)
            return render json: { error: "Disco de usuário inválido." }, status: :bad_request
          end

          writable_homes << [ user, home_data ]
        end
        writable_homes.each { |user, home_data| Filesystem::UserDiskService.write_home(user, home_data) }
      elsif current_user.role == "aluno"
        home_data = users_data.dig(current_user.username, "data")
        return render json: { error: "Disco do usuário ausente." }, status: :forbidden unless home_data
        return render json: { error: "Disco de usuário inválido." }, status: :bad_request unless home_data.is_a?(Hash)

        Filesystem::UserDiskService.write_home(current_user, home_data)
      else
        return render json: { error: "Acesso restrito a professores ou ao próprio aluno." }, status: :forbidden
      end

      head :no_content
    end

    # GET /api/user/config
    def show_config
      render json: { config: Filesystem::UserDiskService.load_config(current_user.storage_key) || {} }
    end

    # PUT /api/user/config
    def update_config
      config = params[:config]
      return render json: { error: "Configuração inválida." }, status: :bad_request unless config.is_a?(ActionController::Parameters)

      Filesystem::UserDiskService.save_config(current_user, config.to_unsafe_h)
      head :no_content
    end
  end
end
