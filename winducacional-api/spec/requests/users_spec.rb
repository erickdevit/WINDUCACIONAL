require "rails_helper"

RSpec.describe "Usuários", type: :request do
  let(:turma) { create(:turma, student_type: "kids") }
  let(:professor) { create(:user, :professor) }
  let(:aluno) { create(:user, turma: turma, student_type: "kids") }

  describe "GET /api/users/username/:username/availability" do
    it "informa disponibilidade sem exigir autenticação" do
      get "/api/users/username/novo.usuario/availability"
      expect(response).to have_http_status(:ok)
      expect(json_body).to eq(username: "novo.usuario", available: true)
    end

    it "informa indisponível quando o usuário já existe" do
      get "/api/users/username/#{aluno.username}/availability"
      expect(response).to have_http_status(:ok)
      expect(json_body).to eq(username: aluno.username, available: false)
    end

    it "rejeita formato inválido" do
      get "/api/users/username/a/availability"
      expect(response).to have_http_status(:bad_request)
    end
  end

  describe "GET /api/users" do
    it "lista usuários para professores" do
      professor
      aluno
      login_as(professor)
      get "/api/users"
      expect(response).to have_http_status(:ok)
      expect(json_body[:users].map { |u| u[:id] }).to include(professor.id, aluno.id)
    end

    it "permite leitura para secretaria" do
      aluno
      login_as(create(:user, :secretaria))
      get "/api/users"
      expect(response).to have_http_status(:ok)
    end

    it "nega acesso a alunos" do
      login_as(aluno)
      get "/api/users"
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "POST /api/users" do
    it "cria um novo usuário" do
      login_as(professor)
      post "/api/users", params: {
        username: "aluno.novo", displayName: "Aluno Novo", role: "aluno",
        turmaId: turma.id, password: "SenhaForte123"
      }, as: :json
      expect(response).to have_http_status(:created)
      expect(json_body[:user]).to include(username: "aluno.novo", role: "aluno", studentType: "kids")
    end

    it "rejeita grupo inválido" do
      login_as(professor)
      post "/api/users", params: {
        username: "fulano", displayName: "Fulano", role: "admin", password: "SenhaForte123"
      }, as: :json
      expect(response).to have_http_status(:bad_request)
    end

    it "nega acesso a alunos" do
      login_as(aluno)
      post "/api/users", params: {
        username: "fulano", displayName: "Fulano", role: "aluno", password: "SenhaForte123"
      }, as: :json
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "PATCH /api/users/:id" do
    it "atualiza o nome de exibição" do
      login_as(professor)
      patch "/api/users/#{aluno.id}", params: { displayName: "novo nome" }, as: :json
      expect(response).to have_http_status(:ok)
      expect(json_body[:user][:displayName]).to eq("Novo Nome")
    end

    it "move o aluno para outra turma e ajusta o tipo de aluno" do
      outra_turma = create(:turma, student_type: "normal")
      login_as(professor)
      patch "/api/users/#{aluno.id}", params: { turmaId: outra_turma.id }, as: :json
      expect(response).to have_http_status(:ok)
      expect(json_body[:user][:turmaId]).to eq(outra_turma.id)
      expect(json_body[:user][:studentType]).to eq("normal")
    end

    it "rejeita username já utilizado" do
      outro = create(:user, username: "ocupado")
      login_as(professor)
      patch "/api/users/#{aluno.id}", params: { username: "ocupado" }, as: :json
      expect(response).to have_http_status(:conflict)
      outro.destroy!
    end

    it "impede remover o último professor ativo" do
      login_as(professor)
      patch "/api/users/#{professor.id}", params: { active: false }, as: :json
      expect(response).to have_http_status(:bad_request)
    end

    it "permite desativar professor quando há outro professor ativo" do
      outro_professor = create(:user, :professor)
      login_as(professor)
      patch "/api/users/#{outro_professor.id}", params: { active: false }, as: :json
      expect(response).to have_http_status(:ok)
      expect(json_body[:user][:active]).to eq(false)
    end

    it "retorna 400 quando nenhuma alteração é enviada" do
      login_as(professor)
      patch "/api/users/#{aluno.id}", params: {}, as: :json
      expect(response).to have_http_status(:bad_request)
    end

    it "retorna 404 para usuário inexistente" do
      login_as(professor)
      patch "/api/users/#{SecureRandom.uuid}", params: { displayName: "Outro" }, as: :json
      expect(response).to have_http_status(:not_found)
    end

    it "atualiza a senha" do
      login_as(professor)
      patch "/api/users/#{aluno.id}", params: { password: "NovaSenhaForte123" }, as: :json
      expect(response).to have_http_status(:ok)
      expect(Auth::PasswordService.verify("NovaSenhaForte123", aluno.reload)).to be true
    end
  end
end
