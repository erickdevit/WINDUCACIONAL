module Api
  class AuthController < ApplicationController
    include Authenticatable

    skip_before_action :authenticate_user!,
      only: %i[login register bootstrap bootstrap_status]

    def me
      render json: { user: current_user.as_public_json }
    end

    def login
      username = User.normalize_username(params[:username])
      user = User.active.find_by(username: username)

      unless user && Auth::PasswordService.verify_and_upgrade!(params[:password].to_s, user)
        return render json: { error: "Usuário ou senha inválidos." }, status: :unauthorized
      end

      token = Auth::SessionService.create_session(user)
      Auth::SessionService.set_cookie(cookies, token, secure: request.ssl?)
      render json: { user: user.as_public_json }
    end

    def register
      turma_code = Turma.normalize_code(params[:turmaCode])
      unless turma_code.match?(/\A[A-Z0-9]{6}\z/)
        return render json: { error: "Informe um código de turma válido com 6 caracteres." }, status: :bad_request
      end

      turma = Turma.active.find_by(code: turma_code)
      unless turma
        return render json: { error: "Código de turma não encontrado ou inativo." }, status: :not_found
      end

      user = Auth::UserCreator.create!(
        username: params[:username],
        display_name: params[:displayName],
        role: "aluno",
        student_type: turma.student_type,
        turma_id: turma.id,
        password: params[:password]
      )
      token = Auth::SessionService.create_session(user)
      Auth::SessionService.set_cookie(cookies, token, secure: request.ssl?)
      render json: { user: user.as_public_json }, status: :created
    end

    def logout
      Auth::SessionService.destroy_session(session_token)
      Auth::SessionService.clear_cookie(cookies)
      head :no_content
    end

    def update_display_name
      display_name = User.normalize_display_name(params[:displayName].to_s)
      if display_name.length < 2
        return render json: { error: "Informe o nome completo." }, status: :bad_request
      end

      current_user.update!(display_name: display_name, updated_at: Time.current)
      render json: { user: current_user.as_public_json }
    end

    def bootstrap_status
      render json: {
        needsBootstrap: User.count.zero?,
        requiresToken: Rails.env.production? || ENV["BOOTSTRAP_TOKEN"].present?
      }
    end

    def bootstrap
      if User.count.positive?
        return render json: { error: "Bootstrap já foi concluído." }, status: :conflict
      end

      bootstrap_token = ENV["BOOTSTRAP_TOKEN"]
      if (Rails.env.production? || bootstrap_token.present?) && params[:token] != bootstrap_token
        return render json: { error: "Token de bootstrap inválido." }, status: :forbidden
      end

      user = Auth::UserCreator.create!(
        username: params[:username],
        display_name: params[:displayName],
        role: "professor",
        password: params[:password]
      )
      token = Auth::SessionService.create_session(user)
      Auth::SessionService.set_cookie(cookies, token, secure: request.ssl?)
      render json: { user: user.as_public_json }, status: :created
    end
  end
end
