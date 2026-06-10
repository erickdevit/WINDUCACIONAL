module Api
  # Porta de server/routes/exams.cjs: provas e questões. Listagem e detalhe
  # são acessíveis a qualquer usuário autenticado (com regras de acesso do
  # aluno aplicadas via Exams::AccessGuard); demais ações são restritas a
  # professores (secretaria tem acesso somente leitura via ProfessorRequired).
  class ExamsController < ApplicationController
    include Authenticatable
    include ProfessorRequired
    include ExamNormalization
    include RawSql

    skip_before_action :require_professor!, only: [ :index, :show ]

    # GET /api/exams
    def index
      if current_user.role != "aluno"
        exams = Exam.order(created_at: :desc)
        render json: { exams: exams.map(&:as_public_json) }
      else
        rows = Exam
          .joins("JOIN exam_assignments ea ON ea.exam_id = exams.id")
          .joins("LEFT JOIN exam_submissions s ON s.exam_id = exams.id AND s.user_id = ea.user_id")
          .where("ea.user_id = ?", current_user.id)
          .where(active: true, is_published: true)
          .select("exams.*, s.status AS submission_status")
          .order("exams.created_at DESC")

        render json: {
          exams: rows.map { |row| row.as_public_json.merge(submissionStatus: row["submission_status"] || "pending") }
        }
      end
    end

    # GET /api/exams/analytics
    def analytics
      turma_id = params[:turmaId].presence
      binds = turma_id ? [ turma_id ] : []
      turma_filter = turma_id ? " AND u.turma_id = $1" : ""

      stats = exec_one(<<~SQL.squish, binds)
        SELECT
          COUNT(s.id) FILTER (WHERE s.status = 'completed') as completed_submissions,
          COUNT(ea.id) as assigned_submissions,
          AVG(s.total_score) FILTER (WHERE s.status = 'completed') as average_score
        FROM exam_assignments ea
        JOIN users u ON u.id = ea.user_id
        LEFT JOIN exam_submissions s
          ON s.exam_id = ea.exam_id AND s.user_id = ea.user_id
        WHERE 1=1#{turma_filter}
      SQL

      by_turma = exec_all(<<~SQL.squish, binds)
        SELECT
          t.nome as name,
          AVG(s.total_score) as avg,
          COUNT(s.id) as count
        FROM exam_submissions s
        JOIN users u ON u.id = s.user_id
        JOIN turmas t ON t.id = u.turma_id
        WHERE s.status = 'completed'#{turma_filter}
        GROUP BY t.id, t.nome
      SQL

      assigned_count = stats["assigned_submissions"].to_i
      completed_count = stats["completed_submissions"].to_i

      render json: {
        totalSubmissions: completed_count,
        averageScore: format("%.1f", stats["average_score"].to_f),
        completionRate: assigned_count.positive? ? ((completed_count.to_f / assigned_count) * 100).round : 0,
        byTurma: by_turma.map { |row| { name: row["name"], avg: format("%.1f", row["avg"].to_f), count: row["count"].to_i } }
      }
    end

    # POST /api/exams
    def create
      title = normalize_exam_text(params[:title])
      if title.blank?
        return render json: { error: "Título da prova é obrigatório." }, status: :bad_request
      end

      exam = Exam.create!(
        title: title,
        description: normalize_exam_text(params[:description]),
        turma_id: params[:turmaId].presence,
        container_initial_state: normalize_json_param(params[:containerInitialState]) || {},
        time_limit: normalize_exam_time_limit(params[:timeLimit])
      )
      render json: { exam: exam.as_public_json }, status: :created
    end

    # GET /api/exams/:id
    def show
      exam = Exams::AccessGuard.call(
        user: current_user, exam_id: params[:id], for_submit: current_user.role != "professor"
      )

      questions = ExamQuestion.where(exam_id: params[:id]).order(:order_index)
      serialized = questions.map do |question|
        current_user.role != "aluno" ? question.as_public_json_full : question.as_public_json
      end

      render json: { exam: exam.as_public_json, questions: serialized }
    end

    # PUT /api/exams/:id
    def update
      exam = Exam.find_by(id: params[:id])
      return render json: { error: "Prova não encontrada." }, status: :not_found unless exam

      attrs = {}

      if params.key?(:title)
        title = normalize_exam_text(params[:title])
        if title.blank?
          return render json: { error: "Título da prova é obrigatório." }, status: :bad_request
        end
        attrs[:title] = title
      end

      attrs[:description] = normalize_exam_text(params[:description]) if params.key?(:description)
      attrs[:active] = ActiveModel::Type::Boolean.new.cast(params[:active]) if params.key?(:active)

      if params.key?(:containerInitialState) && !params[:containerInitialState].nil?
        attrs[:container_initial_state] = normalize_json_param(params[:containerInitialState])
      end

      attrs[:time_limit] = normalize_exam_time_limit(params[:timeLimit]) if params.key?(:timeLimit)
      attrs[:is_published] = ActiveModel::Type::Boolean.new.cast(params[:isPublished]) if params.key?(:isPublished)

      attrs[:updated_at] = Time.current
      exam.update!(attrs)
      render json: { exam: exam.as_public_json }
    end

    # PATCH /api/exams/:id/publish
    def publish
      is_published = js_truthy?(params[:isPublished])

      exam = Exam.find_by(id: params[:id])
      unless exam && (!is_published || ExamQuestion.exists?(exam_id: exam.id))
        return render json: { error: "Prova não encontrada ou sem questões." }, status: :bad_request
      end

      exam.update!(is_published: is_published, updated_at: Time.current)
      render json: { exam: exam.as_public_json }
    end

    # DELETE /api/exams/:id
    def destroy
      exam = Exam.find_by(id: params[:id])
      return render json: { error: "Prova não encontrada." }, status: :not_found unless exam

      exam.destroy!
      head :no_content
    end

    # POST /api/exams/:id/questions
    def create_question
      exam = Exam.find_by(id: params[:id])
      return render json: { error: "Prova não encontrada." }, status: :not_found unless exam

      type = normalize_exam_question_type(params[:type])
      text = normalize_exam_text(params[:text])
      if text.blank?
        return render json: { error: "Enunciado da questão é obrigatório." }, status: :bad_request
      end

      question = ExamQuestion.create!(
        exam_id: exam.id,
        type: type,
        text: text,
        options: type == "mcq" ? normalize_question_options(params[:options]) : [],
        correct_answer: type == "mcq" ? normalize_exam_text(params[:correctAnswer], "a") : nil,
        validation_rules: type == "practical" ? normalize_validation_rules(params[:validationRules]) : [],
        points: normalize_question_points(params[:points]),
        time_limit: normalize_exam_time_limit(params[:timeLimit]),
        order_index: params[:orderIndex].presence || 0
      )
      render json: { question: question.as_public_json_full }, status: :created
    end

    # PATCH /api/exams/:id/questions/:questionId
    def update_question
      question = ExamQuestion.find_by(id: params[:questionId], exam_id: params[:id])
      return render json: { error: "Questão não encontrada." }, status: :not_found unless question

      attrs = {}

      attrs[:type] = normalize_exam_question_type(params[:type]) if params.key?(:type)

      if params.key?(:text)
        text = normalize_exam_text(params[:text])
        if text.blank?
          return render json: { error: "Enunciado da questão é obrigatório." }, status: :bad_request
        end
        attrs[:text] = text
      end

      attrs[:options] = normalize_question_options(params[:options]) if params[:options].is_a?(Array)
      attrs[:correct_answer] = normalize_exam_text(params[:correctAnswer], "a") if params.key?(:correctAnswer)
      attrs[:validation_rules] = normalize_validation_rules(params[:validationRules]) if params[:validationRules].is_a?(Array)
      attrs[:points] = normalize_question_points(params[:points]) if params.key?(:points)
      attrs[:time_limit] = normalize_exam_time_limit(params[:timeLimit]) if params.key?(:timeLimit)
      attrs[:order_index] = params[:orderIndex] unless params[:orderIndex].nil?

      question.update!(attrs) if attrs.any?
      render json: { question: question.as_public_json_full }
    end

    # DELETE /api/exams/:id/questions/:questionId
    def destroy_question
      question = ExamQuestion.find_by(id: params[:questionId], exam_id: params[:id])
      return render json: { error: "Questão não encontrada." }, status: :not_found unless question

      question.destroy!
      head :no_content
    end
  end
end
