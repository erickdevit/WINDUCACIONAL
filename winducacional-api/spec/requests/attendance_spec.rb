require "rails_helper"

RSpec.describe "Frequência", type: :request do
  let(:turma) { create(:turma, schedule_days: [0, 1, 2, 3, 4, 5, 6]) }
  let(:aluno) { create(:user, turma: turma) }
  let(:professor) { create(:user, :professor) }

  describe "GET /api/attendance/me" do
    it "retorna histórico do aluno com registro de hoje" do
      today = Attendance::AttendanceService.today_in_zone
      AttendanceRecord.create!(
        user: aluno, attendance_date: today,
        first_login_at: Time.current, last_login_at: Time.current,
        login_count: 1, turma_id: turma.id
      )
      login_as(aluno)
      get "/api/attendance/me"
      expect(response).to have_http_status(:ok)
      expect(json_body[:today]).to eq(today)
      expect(json_body[:todayRecord]).to be_present
      expect(json_body[:records].length).to eq(1)
    end

    it "nega acesso a professores" do
      login_as(professor)
      get "/api/attendance/me"
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "GET /api/attendance/summary" do
    it "calcula presenças e ausências pela agenda da turma" do
      aluno # cria o aluno na turma
      date = Attendance::AttendanceService.today_in_zone
      AttendanceRecord.create!(
        user: aluno, attendance_date: date,
        first_login_at: Time.current, last_login_at: Time.current,
        login_count: 1, turma_id: turma.id
      )
      login_as(professor)
      get "/api/attendance/summary", params: { startDate: date, endDate: date, turmaId: turma.id }
      expect(response).to have_http_status(:ok)
      expect(json_body[:totals][:students]).to eq(1)
      expect(json_body[:totals][:presences]).to eq(1)
      expect(json_body[:students].first[:presentDays]).to eq(1)
    end

    it "rejeita intervalo invertido" do
      login_as(professor)
      get "/api/attendance/summary", params: { startDate: "2026-06-10", endDate: "2026-06-01" }
      expect(response).to have_http_status(:bad_request)
    end

    it "nega acesso a alunos" do
      login_as(aluno)
      get "/api/attendance/summary"
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "POST /api/attendance/register" do
    it "registra presença manual e remove ausência" do
      date = Attendance::AttendanceService.today_in_zone
      login_as(professor)
      post "/api/attendance/register",
        params: { date: date, turmaId: turma.id, students: [{ id: aluno.id, isPresent: true }] },
        as: :json
      expect(response).to have_http_status(:no_content)
      expect(AttendanceRecord.find_by(user_id: aluno.id, attendance_date: date).source).to eq("manual")

      post "/api/attendance/register",
        params: { date: date, turmaId: turma.id, students: [{ id: aluno.id, isPresent: false }] },
        as: :json
      expect(response).to have_http_status(:no_content)
      expect(AttendanceRecord.find_by(user_id: aluno.id, attendance_date: date)).to be_nil
    end

    it "permissão de secretaria é somente leitura" do
      secretaria = create(:user, :secretaria)
      login_as(secretaria)
      post "/api/attendance/register",
        params: { date: "2026-06-09", turmaId: turma.id, students: [] }, as: :json
      expect(response).to have_http_status(:forbidden)
    end
  end
end
