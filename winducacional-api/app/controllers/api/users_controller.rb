module Api
  # Porta de server/routes/users.cjs: CRUD de usuários, restrito a
  # professores (secretaria tem acesso somente leitura via ProfessorRequired).
  class UsersController < ApplicationController
    include Authenticatable
    include ProfessorRequired

    skip_before_action :authenticate_user!, only: :username_availability
    skip_before_action :require_professor!, only: :username_availability

    # GET /api/users/username/:username/availability
    def username_availability
      render json: Auth::UserCreator.username_availability(params[:username])
    end

    # GET /api/users
    def index
      users = User.includes(:turma).order(role: :desc, username: :asc)
      render json: { users: users.map(&:as_public_json) }
    end

    # POST /api/users
    def create
      user = Auth::UserCreator.create!(
        username: params[:username],
        display_name: params[:displayName],
        role: params[:role].to_s,
        student_type: params[:studentType],
        turma_id: params[:turmaId],
        password: params[:password]
      )
      render json: { user: user.as_public_json }, status: :created
    end

    # PATCH /api/users/:id
    def update
      target = User.find_by(id: params[:id])
      return render json: { error: "Usuário não encontrado." }, status: :not_found unless target

      if would_remove_active_professor?(target) && !other_active_professor_exists?(target)
        return render json: { error: "Deve existir pelo menos um professor ativo." }, status: :bad_request
      end

      attrs = build_user_update_attrs(target)

      if attrs.empty?
        return render json: { error: "Nenhuma alteração enviada." }, status: :bad_request
      end

      attrs[:updated_at] = Time.current
      target.update!(attrs)
      render json: { user: target.as_public_json }
    end

    private

    def would_remove_active_professor?(target)
      target.role != "aluno" && target.active == true &&
        (params[:role] == "aluno" || params[:active] == false)
    end

    def other_active_professor_exists?(target)
      User.where(role: "professor", active: true).where.not(id: target.id).exists?
    end

    # Monta o hash de atualização espelhando as condições do PATCH /api/users/:id do Node.
    def build_user_update_attrs(target)
      attrs = {}

      if params.key?(:displayName)
        attrs[:display_name] = User.normalize_display_name(params[:displayName].to_s)
      end

      if params.key?(:username)
        normalized_username = Auth::UserCreator.username_availability(params[:username])[:username]
        if normalized_username != target.username
          taken = User.where(username: normalized_username).where.not(id: target.id).exists?
          raise ApiError.new("Este usuário já está em uso.", 409) if taken

          attrs[:username] = normalized_username
        end
      end

      next_role = target.role
      if params.key?(:role)
        unless User::ROLES.include?(params[:role])
          raise ApiError.new("Grupo inválido.", 400)
        end
        next_role = params[:role]
        attrs[:role] = next_role
      end

      next_turma_id = target.turma_id
      if params.key?(:turmaId) || (params.key?(:role) && next_role != "aluno")
        next_turma_id = next_role == "aluno" ? params[:turmaId].presence : nil
        attrs[:turma_id] = next_turma_id
      end

      if params.key?(:studentType) || params.key?(:turmaId) || params.key?(:role)
        attrs[:student_type] = Auth::UserCreator.resolve_student_type(
          role: next_role,
          student_type: params.key?(:studentType) ? params[:studentType] : target.student_type,
          turma_id: next_turma_id
        )
      end

      attrs[:active] = ActiveModel::Type::Boolean.new.cast(params[:active]) if params.key?(:active)

      if params[:password].present?
        if params[:password].to_s.length < 8
          raise ApiError.new("Senha deve ter pelo menos 8 caracteres.", 400)
        end

        legacy = Auth::PasswordService.hash_legacy(params[:password])
        attrs[:password_salt] = legacy[:salt]
        attrs[:password_hash] = legacy[:hash]
        attrs[:bcrypt_hash] = Auth::PasswordService.hash_new(params[:password])
        attrs[:legacy_auth_migrated_at] = Time.current
      end

      attrs
    end
  end
end
