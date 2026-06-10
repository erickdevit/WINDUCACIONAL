require "rails_helper"

RSpec.describe "Exams", type: :request do
  let(:turma) { create(:turma) }
  let(:professor) { create(:user, :professor) }
  let(:secretaria) { create(:user, :secretaria) }
  let(:aluno) { create(:user, turma: turma) }

  describe "GET /api/exams" do
    it "lista todas as provas para professores" do
      create(:exam, title: "Prova A")
      create(:exam, title: "Prova B")
      login_as(professor)
      get "/api/exams"
      expect(response).to have_http_status(:ok)
      expect(json_body[:exams].map { |e| e[:title] }).to contain_exactly("Prova A", "Prova B")
    end

    it "lista provas atribuídas, ativas e publicadas para alunos" do
      assigned = create(:exam, title: "Atribuída", is_published: true, active: true)
      create(:exam_assignment, exam: assigned, user: aluno)
      create(:exam, title: "Não atribuída", is_published: true, active: true)

      login_as(aluno)
      get "/api/exams"
      expect(response).to have_http_status(:ok)
      expect(json_body[:exams].length).to eq(1)
      expect(json_body[:exams].first[:title]).to eq("Atribuída")
      expect(json_body[:exams].first[:submissionStatus]).to eq("pending")
    end
  end

  describe "GET /api/exams/analytics" do
    it "retorna estatísticas para professores" do
      login_as(professor)
      get "/api/exams/analytics"
      expect(response).to have_http_status(:ok)
      expect(json_body).to include(:totalSubmissions, :averageScore, :completionRate, :byTurma)
    end

    it "nega acesso a alunos" do
      login_as(aluno)
      get "/api/exams/analytics"
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "POST /api/exams" do
    it "cria uma prova" do
      login_as(professor)
      post "/api/exams", params: { title: "Nova Prova", turmaId: turma.id, timeLimit: 30 }, as: :json
      expect(response).to have_http_status(:created)
      expect(json_body[:exam]).to include(title: "Nova Prova", turmaId: turma.id, timeLimit: 30)
    end

    it "rejeita título em branco" do
      login_as(professor)
      post "/api/exams", params: { title: "  " }, as: :json
      expect(response).to have_http_status(:bad_request)
    end

    it "nega criação para secretaria" do
      login_as(secretaria)
      post "/api/exams", params: { title: "Nova Prova" }, as: :json
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "GET /api/exams/:id" do
    it "retorna prova com questões completas para professor" do
      exam = create(:exam, title: "Prova Completa")
      create(:exam_question, exam: exam, order_index: 0)
      login_as(professor)
      get "/api/exams/#{exam.id}"
      expect(response).to have_http_status(:ok)
      expect(json_body[:exam][:title]).to eq("Prova Completa")
      expect(json_body[:questions].first).to include(:correctAnswer, :validationRules)
    end

    it "oculta gabarito de questões para alunos" do
      exam = create(:exam, is_published: true, active: true)
      create(:exam_question, exam: exam, order_index: 0)
      create(:exam_assignment, exam: exam, user: aluno)
      login_as(aluno)
      get "/api/exams/#{exam.id}"
      expect(response).to have_http_status(:ok)
      expect(json_body[:questions].first).not_to include(:correctAnswer, :validationRules)
    end

    it "nega acesso a aluno sem atribuição" do
      exam = create(:exam, is_published: true, active: true)
      login_as(aluno)
      get "/api/exams/#{exam.id}"
      expect(response).to have_http_status(:forbidden)
    end

    it "retorna 404 para prova inexistente" do
      login_as(professor)
      get "/api/exams/#{SecureRandom.uuid}"
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "PUT /api/exams/:id" do
    it "atualiza campos da prova" do
      exam = create(:exam, title: "Original")
      login_as(professor)
      put "/api/exams/#{exam.id}", params: { title: "Atualizada", active: false }, as: :json
      expect(response).to have_http_status(:ok)
      expect(json_body[:exam][:title]).to eq("Atualizada")
      expect(json_body[:exam][:active]).to be false
    end

    it "rejeita título em branco" do
      exam = create(:exam)
      login_as(professor)
      put "/api/exams/#{exam.id}", params: { title: "" }, as: :json
      expect(response).to have_http_status(:bad_request)
    end

    it "retorna 404 para prova inexistente" do
      login_as(professor)
      put "/api/exams/#{SecureRandom.uuid}", params: { title: "X" }, as: :json
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "PATCH /api/exams/:id/publish" do
    it "rejeita publicação sem questões" do
      exam = create(:exam)
      login_as(professor)
      patch "/api/exams/#{exam.id}/publish", params: { isPublished: true }, as: :json
      expect(response).to have_http_status(:bad_request)
    end

    it "publica prova com questões" do
      exam = create(:exam)
      create(:exam_question, exam: exam)
      login_as(professor)
      patch "/api/exams/#{exam.id}/publish", params: { isPublished: true }, as: :json
      expect(response).to have_http_status(:ok)
      expect(json_body[:exam][:isPublished]).to be true
    end

    it "permite despublicar mesmo sem questões" do
      exam = create(:exam, is_published: true)
      login_as(professor)
      patch "/api/exams/#{exam.id}/publish", params: { isPublished: false }, as: :json
      expect(response).to have_http_status(:ok)
      expect(json_body[:exam][:isPublished]).to be false
    end
  end

  describe "DELETE /api/exams/:id" do
    it "remove a prova" do
      exam = create(:exam)
      login_as(professor)
      delete "/api/exams/#{exam.id}"
      expect(response).to have_http_status(:no_content)
      expect(Exam.exists?(exam.id)).to be false
    end

    it "retorna 404 para prova inexistente" do
      login_as(professor)
      delete "/api/exams/#{SecureRandom.uuid}"
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "POST /api/exams/:id/questions" do
    it "cria questão de múltipla escolha" do
      exam = create(:exam)
      login_as(professor)
      post "/api/exams/#{exam.id}/questions", params: {
        type: "mcq", text: "2 + 2 = ?", options: [ "3", "4", "5" ], correctAnswer: "b", points: 2
      }, as: :json
      expect(response).to have_http_status(:created)
      expect(json_body[:question]).to include(type: "mcq", text: "2 + 2 = ?", correctAnswer: "b", points: 2)
      expect(json_body[:question][:options]).to eq([ "3", "4", "5" ])
    end

    it "cria questão prática com regras de validação" do
      exam = create(:exam)
      login_as(professor)
      post "/api/exams/#{exam.id}/questions", params: {
        type: "practical", text: "Crie um arquivo",
        validationRules: [ { type: "file_exists", path: "C:\\teste.txt" } ]
      }, as: :json
      expect(response).to have_http_status(:created)
      expect(json_body[:question][:validationRules]).to eq(
        [ { type: "FILE_EXISTS", path: "C:\\teste.txt", content: "", name: "" } ]
      )
    end

    it "rejeita enunciado em branco" do
      exam = create(:exam)
      login_as(professor)
      post "/api/exams/#{exam.id}/questions", params: { type: "mcq", text: "" }, as: :json
      expect(response).to have_http_status(:bad_request)
    end

    it "retorna 404 para prova inexistente" do
      login_as(professor)
      post "/api/exams/#{SecureRandom.uuid}/questions", params: { type: "mcq", text: "X" }, as: :json
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "PATCH /api/exams/:id/questions/:questionId" do
    it "atualiza a questão" do
      exam = create(:exam)
      question = create(:exam_question, exam: exam, text: "Original")
      login_as(professor)
      patch "/api/exams/#{exam.id}/questions/#{question.id}", params: { text: "Atualizada", points: 5 }, as: :json
      expect(response).to have_http_status(:ok)
      expect(json_body[:question]).to include(text: "Atualizada", points: 5)
    end

    it "retorna 404 para questão inexistente" do
      exam = create(:exam)
      login_as(professor)
      patch "/api/exams/#{exam.id}/questions/#{SecureRandom.uuid}", params: { text: "X" }, as: :json
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "DELETE /api/exams/:id/questions/:questionId" do
    it "remove a questão" do
      exam = create(:exam)
      question = create(:exam_question, exam: exam)
      login_as(professor)
      delete "/api/exams/#{exam.id}/questions/#{question.id}"
      expect(response).to have_http_status(:no_content)
      expect(ExamQuestion.exists?(question.id)).to be false
    end

    it "retorna 404 para questão inexistente" do
      exam = create(:exam)
      login_as(professor)
      delete "/api/exams/#{exam.id}/questions/#{SecureRandom.uuid}"
      expect(response).to have_http_status(:not_found)
    end
  end
end
