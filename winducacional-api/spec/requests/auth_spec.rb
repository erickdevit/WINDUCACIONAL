require "rails_helper"

RSpec.describe "Autenticação", type: :request do
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
end
