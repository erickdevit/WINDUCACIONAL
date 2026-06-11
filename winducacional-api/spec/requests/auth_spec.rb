require "rails_helper"

RSpec.describe "Autenticação", type: :request do
  around do |example|
    old_period = ENV["RATE_LIMIT_PERIOD_SECONDS"]
    old_login_limit = ENV["AUTH_RATE_LIMIT_LOGIN_LIMIT"]
    old_register_limit = ENV["AUTH_RATE_LIMIT_REGISTER_LIMIT"]
    old_bootstrap_limit = ENV["AUTH_RATE_LIMIT_BOOTSTRAP_LIMIT"]
    old_bootstrap_token = ENV["BOOTSTRAP_TOKEN"]
    example.run
  ensure
    ENV["RATE_LIMIT_PERIOD_SECONDS"] = old_period
    ENV["AUTH_RATE_LIMIT_LOGIN_LIMIT"] = old_login_limit
    ENV["AUTH_RATE_LIMIT_REGISTER_LIMIT"] = old_register_limit
    ENV["AUTH_RATE_LIMIT_BOOTSTRAP_LIMIT"] = old_bootstrap_limit
    ENV["BOOTSTRAP_TOKEN"] = old_bootstrap_token
  end

  describe "POST /api/auth/login" do
    let!(:user) { create(:user, :professor, username: "professor.um") }

    it "autentica com credenciais válidas e cria cookie de sessão" do
      post "/api/auth/login", params: { username: "professor.um", password: "SenhaForte123" }, as: :json
      expect(response).to have_http_status(:ok)
      expect(json_body[:user]).to include(username: "professor.um", role: "professor")
      expect(response.cookies[Auth::SessionService.cookie_name]).to be_present
    end

    it "rejeita senha inválida" do
      post "/api/auth/login", params: { username: "professor.um", password: "errada" }, as: :json
      expect(response).to have_http_status(:unauthorized)
    end

    it "verifica senha legada scrypt e faz upgrade para bcrypt" do
      legacy = Auth::PasswordService.hash_legacy("SenhaLegada123")
      legacy_user = create(:user, username: "aluno.legado", bcrypt_hash: nil,
        password_salt: legacy[:salt], password_hash: legacy[:hash])

      post "/api/auth/login", params: { username: "aluno.legado", password: "SenhaLegada123" }, as: :json
      expect(response).to have_http_status(:ok)
      expect(legacy_user.reload.bcrypt_hash).to be_present
    end

    it "aplica rate limit por IP e usuário" do
      ENV["RATE_LIMIT_PERIOD_SECONDS"] = "60"
      ENV["AUTH_RATE_LIMIT_LOGIN_LIMIT"] = "2"

      2.times do
        post "/api/auth/login", params: { username: "professor.um", password: "errada" }, as: :json
        expect(response).to have_http_status(:unauthorized)
      end

      post "/api/auth/login", params: { username: "professor.um", password: "errada" }, as: :json
      expect(response).to have_http_status(:too_many_requests)
      expect(response.headers["Retry-After"]).to eq("60")
    end
  end

  describe "POST /api/auth/register" do
    let!(:turma) { create(:turma, code: "ABC123") }

    it "aplica rate limit ao cadastro público por código de turma" do
      ENV["RATE_LIMIT_PERIOD_SECONDS"] = "60"
      ENV["AUTH_RATE_LIMIT_REGISTER_LIMIT"] = "1"

      post "/api/auth/register",
        params: { username: "aluno.um", displayName: "Aluno Um", password: "SenhaForte123", turmaCode: turma.code },
        as: :json
      expect(response).to have_http_status(:created)

      post "/api/auth/register",
        params: { username: "aluno.dois", displayName: "Aluno Dois", password: "SenhaForte123", turmaCode: turma.code },
        as: :json
      expect(response).to have_http_status(:too_many_requests)
    end
  end

  describe "GET /api/auth/me" do
    it "retorna o usuário autenticado" do
      user = create(:user, :professor)
      login_as(user)
      get "/api/auth/me"
      expect(response).to have_http_status(:ok)
      expect(json_body[:user][:id]).to eq(user.id)
    end

    it "retorna 401 sem sessão" do
      get "/api/auth/me"
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "POST /api/bootstrap" do
    it "aplica rate limit ao bootstrap inicial" do
      ENV["RATE_LIMIT_PERIOD_SECONDS"] = "60"
      ENV["AUTH_RATE_LIMIT_BOOTSTRAP_LIMIT"] = "1"
      ENV["BOOTSTRAP_TOKEN"] = "token-secreto"

      post "/api/bootstrap",
        params: { username: "professor.um", displayName: "Professor Um", password: "SenhaForte123", token: "errado" },
        as: :json
      expect(response).to have_http_status(:forbidden)

      post "/api/bootstrap",
        params: { username: "professor.dois", displayName: "Professor Dois", password: "SenhaForte123", token: "errado" },
        as: :json
      expect(response).to have_http_status(:too_many_requests)
      expect(response.headers["Retry-After"]).to eq("60")
    end
  end
end
