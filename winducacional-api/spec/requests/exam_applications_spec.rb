require "rails_helper"

RSpec.describe "Exam Applications", type: :request do
  let(:turma) { create(:turma) }
  let(:professor) { create(:user, :professor) }
  let(:secretaria) { create(:user, :secretaria) }
  let(:exam) { create(:exam, turma: turma, is_published: true, active: true) }
  let(:aluno) { create(:user, turma: turma) }

  describe "POST /api/exams/assign-batch" do
    it "cria atribuições novas para alunos válidos" do
      login_as(professor)
      post "/api/exams/assign-batch", params: {
        mode: "all",
        assignments: [ { userId: aluno.id, examId: exam.id } ]
      }, as: :json

      expect(response).to have_http_status(:ok)
      expect(json_body[:application]).to include(totalRequested: 1, totalCreated: 1, totalExisting: 0, totalSkipped: 0)
      expect(ExamAssignment.exists?(exam_id: exam.id, user_id: aluno.id)).to be true
    end

    it "marca como existente quando a atribuição já existe" do
      create(:exam_assignment, exam: exam, user: aluno)
      login_as(professor)
      post "/api/exams/assign-batch", params: {
        mode: "all",
        assignments: [ { userId: aluno.id, examId: exam.id } ]
      }, as: :json

      expect(response).to have_http_status(:ok)
      expect(json_body[:application]).to include(totalCreated: 0, totalExisting: 1)
    end

    it "ignora aluno inexistente, inativo ou que não seja aluno" do
      login_as(professor)
      post "/api/exams/assign-batch", params: {
        mode: "all",
        assignments: [ { userId: professor.id, examId: exam.id } ]
      }, as: :json

      expect(response).to have_http_status(:ok)
      expect(json_body[:application]).to include(totalSkipped: 1)
    end

    it "ignora prova inexistente, inativa ou não publicada" do
      rascunho = create(:exam, is_published: false, active: true)
      login_as(professor)
      post "/api/exams/assign-batch", params: {
        mode: "all",
        assignments: [ { userId: aluno.id, examId: rascunho.id } ]
      }, as: :json

      expect(response).to have_http_status(:ok)
      expect(json_body[:application]).to include(totalSkipped: 1)
    end

    it "nega acesso à secretaria" do
      login_as(secretaria)
      post "/api/exams/assign-batch", params: { mode: "all", assignments: [] }, as: :json
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "GET /api/exams/applications" do
    it "lista lotes de aplicação com seus itens" do
      login_as(professor)
      post "/api/exams/assign-batch", params: {
        mode: "all",
        assignments: [ { userId: aluno.id, examId: exam.id } ]
      }, as: :json

      get "/api/exams/applications"
      expect(response).to have_http_status(:ok)
      expect(json_body[:applications].length).to eq(1)
      item = json_body[:applications].first[:items].first
      expect(item).to include(examId: exam.id, userId: aluno.id, assignmentStatus: "created", removalStatus: "active")
    end

    it "filtra por turma" do
      outra_turma = create(:turma)
      outro_aluno = create(:user, turma: outra_turma)
      outro_exam = create(:exam, turma: outra_turma, is_published: true, active: true)

      login_as(professor)
      post "/api/exams/assign-batch", params: {
        mode: "all",
        assignments: [
          { userId: aluno.id, examId: exam.id },
          { userId: outro_aluno.id, examId: outro_exam.id }
        ]
      }, as: :json

      get "/api/exams/applications", params: { turmaId: turma.id }
      expect(response).to have_http_status(:ok)
      items = json_body[:applications].flat_map { |a| a[:items] }
      expect(items.map { |i| i[:userId] }).to contain_exactly(aluno.id)
    end

    it "permite acesso de leitura à secretaria" do
      login_as(secretaria)
      get "/api/exams/applications"
      expect(response).to have_http_status(:ok)
    end
  end

  describe "DELETE /api/exams/applications/:id" do
    it "remove atribuições criadas e mantém retenções" do
      outro_aluno = create(:user, turma: turma)
      create(:exam_assignment, exam: exam, user: outro_aluno) # já existia antes do lote

      login_as(professor)
      post "/api/exams/assign-batch", params: {
        mode: "all",
        assignments: [
          { userId: aluno.id, examId: exam.id },
          { userId: outro_aluno.id, examId: exam.id }
        ]
      }, as: :json
      batch_id = json_body[:application][:id]

      delete "/api/exams/applications/#{batch_id}", params: { reason: "Cancelado para teste" }, as: :json
      expect(response).to have_http_status(:ok)
      expect(json_body[:application]).to include(
        totalRemoved: 1, totalRetained: 1, cancellationReason: "Cancelado para teste"
      )
      expect(ExamAssignment.exists?(exam_id: exam.id, user_id: aluno.id)).to be false
      expect(ExamAssignment.exists?(exam_id: exam.id, user_id: outro_aluno.id)).to be true
    end

    it "retém itens cujo aluno já iniciou a prova" do
      login_as(professor)
      post "/api/exams/assign-batch", params: {
        mode: "all",
        assignments: [ { userId: aluno.id, examId: exam.id } ]
      }, as: :json
      batch_id = json_body[:application][:id]

      create(:exam_submission, exam: exam, user: aluno, status: "in_progress")

      delete "/api/exams/applications/#{batch_id}"
      expect(response).to have_http_status(:ok)
      expect(json_body[:application]).to include(totalRemoved: 0, totalRetained: 1)
      expect(ExamAssignment.exists?(exam_id: exam.id, user_id: aluno.id)).to be true
    end

    it "retorna 400 se a aplicação já foi removida" do
      login_as(professor)
      post "/api/exams/assign-batch", params: {
        mode: "all",
        assignments: [ { userId: aluno.id, examId: exam.id } ]
      }, as: :json
      batch_id = json_body[:application][:id]

      delete "/api/exams/applications/#{batch_id}"
      expect(response).to have_http_status(:ok)

      delete "/api/exams/applications/#{batch_id}"
      expect(response).to have_http_status(:bad_request)
    end

    it "retorna 404 para aplicação inexistente" do
      login_as(professor)
      delete "/api/exams/applications/#{SecureRandom.uuid}"
      expect(response).to have_http_status(:not_found)
    end
  end
end
