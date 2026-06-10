require "rails_helper"

RSpec.describe "Exam Submissions", type: :request do
  let(:turma) { create(:turma) }
  let(:professor) { create(:user, :professor) }
  let(:aluno) { create(:user, turma: turma) }
  let(:outro_aluno) { create(:user, turma: turma) }
  let(:exam) { create(:exam, turma: turma, is_published: true, active: true, time_limit: 0) }

  before do
    create(:exam_assignment, exam: exam, user: aluno)
  end

  describe "GET /api/exams/student/history" do
    it "retorna submissões do aluno com o título da prova" do
      create(:exam_submission, exam: exam, user: aluno, status: "completed", completed_at: Time.current)
      login_as(aluno)
      get "/api/exams/student/history"
      expect(response).to have_http_status(:ok)
      expect(json_body[:submissions].first).to include(examId: exam.id, examTitle: exam.title, status: "completed")
    end
  end

  describe "POST /api/exams/:id/submit" do
    let!(:mcq) { create(:exam_question, exam: exam, type: "mcq", correct_answer: "b", points: 2, order_index: 0) }
    let!(:practical) do
      create(:exam_question, :practical, exam: exam, points: 3, order_index: 1,
        validation_rules: [ { "type" => "FILE_EXISTS", "path" => "C:\\teste.txt", "content" => "", "name" => "" } ])
    end

    let(:practical_snapshot) do
      {
        files: {
          "C:" => { type: "folder", data: { "teste.txt" => { type: "file", data: "conteudo" } } }
        },
        actions: []
      }
    end

    it "salva progresso parcial sem finalizar" do
      login_as(aluno)
      post "/api/exams/#{exam.id}/submit", params: {
        status: "in_progress",
        answers: [ { questionId: mcq.id, answerText: "a" } ]
      }, as: :json

      expect(response).to have_http_status(:ok)
      expect(json_body[:submission]).to include(status: "in_progress")
      expect(ExamSubmission.find_by(exam_id: exam.id, user_id: aluno.id).status).to eq("in_progress")
    end

    it "finaliza a prova e calcula as pontuações" do
      login_as(aluno)
      post "/api/exams/#{exam.id}/submit", params: {
        status: "completed",
        answers: [
          { questionId: mcq.id, answerText: "b" }
        ],
        practicalSnapshot: practical_snapshot
      }, as: :json

      expect(response).to have_http_status(:ok)
      expect(json_body[:submission]).to include(status: "completed", scoreMcq: 2.0, scorePractical: 3.0, totalScore: 5.0)
    end

    it "marca resposta de múltipla escolha incorreta como zero pontos" do
      login_as(aluno)
      post "/api/exams/#{exam.id}/submit", params: {
        status: "completed",
        answers: [ { questionId: mcq.id, answerText: "a" } ],
        practicalSnapshot: practical_snapshot
      }, as: :json

      expect(response).to have_http_status(:ok)
      expect(json_body[:submission]).to include(scoreMcq: 0.0)
    end

    it "rejeita nova submissão após a prova ser finalizada" do
      login_as(aluno)
      post "/api/exams/#{exam.id}/submit", params: { status: "completed", answers: [] }, as: :json
      expect(response).to have_http_status(:ok)

      post "/api/exams/#{exam.id}/submit", params: { status: "completed", answers: [] }, as: :json
      expect(response).to have_http_status(:bad_request)
      expect(json_body[:error]).to eq("Prova já finalizada.")
    end

    it "rejeita finalização após o tempo limite" do
      timed_exam = create(:exam, turma: turma, is_published: true, active: true, time_limit: 1)
      create(:exam_assignment, exam: timed_exam, user: aluno)

      login_as(aluno)
      post "/api/exams/#{timed_exam.id}/submit", params: { status: "in_progress", answers: [] }, as: :json
      expect(response).to have_http_status(:ok)

      submission = ExamSubmission.find_by(exam_id: timed_exam.id, user_id: aluno.id)
      submission.update_column(:started_at, 2.minutes.ago)

      post "/api/exams/#{timed_exam.id}/submit", params: { status: "completed", answers: [] }, as: :json
      expect(response).to have_http_status(:bad_request)
      expect(json_body[:error]).to eq("O tempo da prova terminou.")
    end

    it "nega acesso a aluno sem atribuição" do
      login_as(outro_aluno)
      post "/api/exams/#{exam.id}/submit", params: { status: "in_progress", answers: [] }, as: :json
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "GET /api/exams/:id/submissions" do
    it "lista submissões da prova para o professor" do
      create(:exam_submission, exam: exam, user: aluno, status: "completed", total_score: 7, completed_at: Time.current)
      login_as(professor)
      get "/api/exams/#{exam.id}/submissions"
      expect(response).to have_http_status(:ok)
      expect(json_body[:submissions].first).to include(userId: aluno.id, examTitle: exam.title, totalScore: 7.0)
    end

    it "nega acesso a alunos" do
      login_as(aluno)
      get "/api/exams/#{exam.id}/submissions"
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "GET /api/exams/:examId/submissions/:submissionId" do
    let!(:question) { create(:exam_question, exam: exam, type: "mcq", correct_answer: "a", points: 1, order_index: 0) }
    let!(:submission) { create(:exam_submission, exam: exam, user: aluno, status: "completed", completed_at: Time.current) }
    let!(:answer) do
      create(:exam_answer, exam_submission: submission, exam_question: question,
        answer_text: "a", is_correct: true, points_awarded: 1)
    end

    it "permite que o aluno veja a própria submissão sem o gabarito" do
      login_as(aluno)
      get "/api/exams/#{exam.id}/submissions/#{submission.id}"
      expect(response).to have_http_status(:ok)
      expect(json_body[:submission]).to include(id: submission.id, examTitle: exam.title)
      expect(json_body[:answers].first).not_to include(:correctAnswer)
      expect(json_body[:answers].first).to include(answerText: "a", isCorrect: true, pointsAwarded: 1, pointsTotal: 1)
    end

    it "permite que o professor veja o gabarito" do
      login_as(professor)
      get "/api/exams/#{exam.id}/submissions/#{submission.id}"
      expect(response).to have_http_status(:ok)
      expect(json_body[:answers].first).to include(correctAnswer: "a")
    end

    it "nega acesso a outro aluno" do
      login_as(outro_aluno)
      get "/api/exams/#{exam.id}/submissions/#{submission.id}"
      expect(response).to have_http_status(:forbidden)
    end

    it "retorna 404 para submissão inexistente" do
      login_as(professor)
      get "/api/exams/#{exam.id}/submissions/#{SecureRandom.uuid}"
      expect(response).to have_http_status(:not_found)
    end
  end
end
