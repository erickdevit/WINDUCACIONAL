require "rails_helper"

RSpec.describe "Turmas", type: :request do
  let(:professor) { create(:user, :professor) }
  let(:aluno) { create(:user) }

  describe "GET /api/turmas" do
    it "lista turmas para professores" do
      create(:turma, nome: "Turma A", student_type: "kids")
      create(:turma, nome: "Turma B", student_type: "normal")
      login_as(professor)
      get "/api/turmas"
      expect(response).to have_http_status(:ok)
      expect(json_body[:turmas].map { |t| t[:nome] }).to eq([ "Turma A", "Turma B" ])
    end

    it "filtra por studentType" do
      create(:turma, nome: "Turma Kids", student_type: "kids")
      create(:turma, nome: "Turma Normal", student_type: "normal")
      login_as(professor)
      get "/api/turmas", params: { studentType: "kids" }
      expect(response).to have_http_status(:ok)
      expect(json_body[:turmas].map { |t| t[:nome] }).to eq([ "Turma Kids" ])
    end

    it "nega acesso a alunos" do
      login_as(aluno)
      get "/api/turmas"
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "POST /api/turmas" do
    it "cria uma turma" do
      login_as(professor)
      post "/api/turmas", params: {
        nome: "Turma Nova", studentType: "kids",
        scheduleDays: [ 1, 3, 5 ], scheduleStartTime: "08:00", scheduleEndTime: "10:00"
      }, as: :json
      expect(response).to have_http_status(:created)
      expect(json_body[:turma]).to include(
        nome: "Turma Nova", studentType: "kids",
        scheduleDays: [ 1, 3, 5 ], scheduleStartTime: "08:00", scheduleEndTime: "10:00"
      )
      expect(json_body[:turma][:code]).to match(/\A[A-Z0-9]{6}\z/)
    end

    it "rejeita nome muito curto" do
      login_as(professor)
      post "/api/turmas", params: { nome: "A" }, as: :json
      expect(response).to have_http_status(:bad_request)
    end

    it "rejeita horário inicial maior que o final" do
      login_as(professor)
      post "/api/turmas", params: {
        nome: "Turma Inválida", scheduleStartTime: "10:00", scheduleEndTime: "08:00"
      }, as: :json
      expect(response).to have_http_status(:bad_request)
    end

    it "rejeita nome duplicado" do
      create(:turma, nome: "Turma Repetida")
      login_as(professor)
      post "/api/turmas", params: { nome: "Turma Repetida" }, as: :json
      expect(response).to have_http_status(:conflict)
    end
  end

  describe "PATCH /api/turmas/:id" do
    it "atualiza nome e horário" do
      turma = create(:turma, nome: "Turma Original")
      login_as(professor)
      patch "/api/turmas/#{turma.id}", params: {
        nome: "Turma Atualizada", scheduleStartTime: "09:00", scheduleEndTime: "11:00"
      }, as: :json
      expect(response).to have_http_status(:ok)
      expect(json_body[:turma][:nome]).to eq("Turma Atualizada")
      expect(json_body[:turma][:scheduleStartTime]).to eq("09:00")
      expect(json_body[:turma][:scheduleEndTime]).to eq("11:00")
    end

    it "propaga o novo studentType para os alunos da turma" do
      turma = create(:turma, student_type: "kids")
      estudante = create(:user, turma: turma, student_type: "kids")
      login_as(professor)
      patch "/api/turmas/#{turma.id}", params: { studentType: "normal" }, as: :json
      expect(response).to have_http_status(:ok)
      expect(estudante.reload.student_type).to eq("normal")
    end

    it "não propaga quando o novo studentType é reposicao" do
      turma = create(:turma, student_type: "kids")
      estudante = create(:user, turma: turma, student_type: "kids")
      login_as(professor)
      patch "/api/turmas/#{turma.id}", params: { studentType: "reposicao" }, as: :json
      expect(response).to have_http_status(:ok)
      expect(estudante.reload.student_type).to eq("kids")
    end

    it "retorna 400 quando nenhuma alteração é enviada" do
      turma = create(:turma)
      login_as(professor)
      patch "/api/turmas/#{turma.id}", params: {}, as: :json
      expect(response).to have_http_status(:bad_request)
    end

    it "retorna 404 para turma inexistente" do
      login_as(professor)
      patch "/api/turmas/#{SecureRandom.uuid}", params: { nome: "Turma X" }, as: :json
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "DELETE /api/turmas/:id" do
    it "remove a turma e desvincula os usuários" do
      turma = create(:turma)
      estudante = create(:user, turma: turma)
      login_as(professor)
      delete "/api/turmas/#{turma.id}"
      expect(response).to have_http_status(:no_content)
      expect(estudante.reload.turma_id).to be_nil
      expect(Turma.exists?(turma.id)).to be false
    end

    it "retorna 404 para turma inexistente" do
      login_as(professor)
      delete "/api/turmas/#{SecureRandom.uuid}"
      expect(response).to have_http_status(:not_found)
    end
  end
end
