require "rails_helper"

RSpec.describe "Gestor", type: :request do
  let(:turma) { create(:turma) }
  let(:professor) { create(:user, :professor) }
  let(:secretaria) { create(:user, :secretaria) }
  let(:aluno) { create(:user, turma: turma) }

  def create_session_for(user)
    Session.create!(user_id: user.id, token_hash: Session.hash_token(SecureRandom.hex(32)), expires_at: 1.day.from_now)
  end

  describe "GET /api/gestor/sessions" do
    it "lista sessões ativas de alunos para o professor" do
      create_session_for(aluno)
      login_as(professor)

      get "/api/gestor/sessions"
      expect(response).to have_http_status(:ok)
      expect(json_body[:sessions].length).to eq(1)
      expect(json_body[:sessions].first).to include(
        userId: aluno.id, username: aluno.username, turmaId: turma.id, turmaNome: turma.nome
      )
    end

    it "permite acesso de leitura à secretaria" do
      login_as(secretaria)
      get "/api/gestor/sessions"
      expect(response).to have_http_status(:ok)
    end

    it "nega acesso a alunos" do
      login_as(aluno)
      get "/api/gestor/sessions"
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "POST /api/gestor/sessions/logout" do
    it "encerra a sessão de um usuário específico" do
      session = create_session_for(aluno)
      login_as(professor)

      post "/api/gestor/sessions/logout", params: { target: "user", userId: aluno.id }, as: :json
      expect(response).to have_http_status(:no_content)
      expect(Session.exists?(session.id)).to be false
    end

    it "encerra as sessões de uma turma" do
      outro_aluno = create(:user, turma: turma)
      session_aluno = create_session_for(aluno)
      session_outro = create_session_for(outro_aluno)
      login_as(professor)

      post "/api/gestor/sessions/logout", params: { target: "turma", turmaId: turma.id }, as: :json
      expect(response).to have_http_status(:no_content)
      expect(Session.exists?(session_aluno.id)).to be false
      expect(Session.exists?(session_outro.id)).to be false
    end

    it "encerra as sessões de todos os alunos" do
      session = create_session_for(aluno)
      session_professor = create_session_for(professor)
      login_as(professor)

      post "/api/gestor/sessions/logout", params: { target: "all" }, as: :json
      expect(response).to have_http_status(:no_content)
      expect(Session.exists?(session.id)).to be false
      expect(Session.exists?(session_professor.id)).to be true
    end

    it "rejeita alvo inválido ou incompleto" do
      login_as(professor)

      post "/api/gestor/sessions/logout", params: { target: "turma" }, as: :json
      expect(response).to have_http_status(:bad_request)
      expect(json_body[:error]).to eq("Alvo de logout inválido ou incompleto.")
    end

    it "nega acesso à secretaria" do
      login_as(secretaria)
      post "/api/gestor/sessions/logout", params: { target: "all" }, as: :json
      expect(response).to have_http_status(:forbidden)
    end
  end
end
