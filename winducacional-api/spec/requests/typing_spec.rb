require "rails_helper"

RSpec.describe "Digitação", type: :request do
  let(:turma) { create(:turma, student_type: "normal") }
  let(:aluno) { create(:user, turma: turma, student_type: "normal") }
  let(:professor) { create(:user, :professor) }

  describe "GET /api/typing/settings/:studentType" do
    it "aluno acessa configurações do próprio tipo" do
      login_as(aluno)
      get "/api/typing/settings/normal"
      expect(response).to have_http_status(:ok)
      expect(json_body[:settings][:studentType]).to eq("normal")
    end

    it "aluno não acessa configurações de outro tipo" do
      login_as(aluno)
      get "/api/typing/settings/kids"
      expect(response).to have_http_status(:forbidden)
    end

    it "rejeita tipo inválido" do
      login_as(aluno)
      get "/api/typing/settings/adulto"
      expect(response).to have_http_status(:bad_request)
    end
  end

  describe "PUT /api/typing/settings/:studentType" do
    it "professor atualiza e aplica os limites (clamp)" do
      login_as(professor)
      put "/api/typing/settings/normal",
        params: { passMinWpm: 5, passMinAccuracy: 999, maxErrors: 1 }, as: :json
      expect(response).to have_http_status(:ok)
      expect(json_body[:settings][:passMinWpm]).to eq(10)
      expect(json_body[:settings][:passMinAccuracy]).to eq(100)
      expect(json_body[:settings][:maxErrors]).to eq(3)
    end

    it "aluno não pode atualizar" do
      login_as(aluno)
      put "/api/typing/settings/normal", params: {}, as: :json
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "POST /api/typing/score" do
    it "registra pontuação de digitação" do
      login_as(aluno)
      post "/api/typing/score", params: { lessonId: 1, wpm: 50, accuracy: 98 }, as: :json
      expect(response).to have_http_status(:created)
      expect(TypingScore.where(user_id: aluno.id).count).to eq(1)
    end

    it "rejeita dados incompletos" do
      login_as(aluno)
      post "/api/typing/score", params: { lessonId: 1 }, as: :json
      expect(response).to have_http_status(:bad_request)
    end
  end

  describe "POST /api/typing/game/score" do
    it "registra pontuação do game de digitação" do
      login_as(aluno)
      post "/api/typing/game/score", params: {
        missionId: "m1", missionTitle: "Missão 1", score: 100, wpm: 40, accuracy: 95, status: "won"
      }, as: :json
      expect(response).to have_http_status(:created)
      expect(TypingGameScore.where(user_id: aluno.id).first.status).to eq("won")
    end

    it "rejeita status inválido" do
      login_as(aluno)
      post "/api/typing/game/score", params: {
        missionId: "m1", missionTitle: "Missão 1", score: 100, wpm: 40, accuracy: 95, status: "empate"
      }, as: :json
      expect(response).to have_http_status(:bad_request)
    end
  end

  describe "GET /api/typing/ranking/global e /turma" do
    it "retorna ranking global do tipo do aluno" do
      login_as(aluno)
      get "/api/typing/ranking/global"
      expect(response).to have_http_status(:ok)
      expect(json_body[:ranking]).to be_an(Array)
    end

    it "retorna ranking da turma do aluno" do
      login_as(aluno)
      get "/api/typing/ranking/turma"
      expect(response).to have_http_status(:ok)
      expect(json_body[:ranking]).to be_an(Array)
    end
  end

  describe "POST /api/typing/ranking/turma/reset" do
    it "professor reseta as pontuações da turma" do
      TypingScore.create!(user_id: aluno.id, lesson_id: 1, wpm: 50, accuracy: 98)
      login_as(professor)
      post "/api/typing/ranking/turma/reset", params: { turmaCode: turma.code }, as: :json
      expect(response).to have_http_status(:ok)
      expect(json_body[:deletedScores]).to eq(1)
      expect(TypingScore.where(user_id: aluno.id).count).to eq(0)
    end

    it "rejeita código de turma inválido" do
      login_as(professor)
      post "/api/typing/ranking/turma/reset", params: { turmaCode: "abc" }, as: :json
      expect(response).to have_http_status(:bad_request)
    end
  end
end
