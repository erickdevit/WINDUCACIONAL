module Api
  # Porta de server/routes/exams.cjs: histórico, submissão e correção de
  # provas. Apenas a listagem por prova (#index) é restrita a professores
  # (secretaria tem acesso somente leitura via ProfessorRequired); as demais
  # ações são acessíveis a qualquer usuário autenticado, com regras de
  # acesso do aluno aplicadas via Exams::AccessGuard.
  class ExamSubmissionsController < ApplicationController
    include Authenticatable
    include ProfessorRequired
    include ExamNormalization
    include RawSql

    skip_before_action :require_professor!, only: [ :history, :submit, :show ]

    # GET /api/exams/student/history
    def history
      rows = exec_all(<<~SQL.squish, [ current_user.id ])
        SELECT s.*, e.title as exam_title
        FROM exam_submissions s
        JOIN exams e ON e.id = s.exam_id
        WHERE s.user_id = $1
        ORDER BY s.completed_at DESC NULLS LAST
      SQL

      render json: {
        submissions: rows.map { |row| ExamSubmission.public_row(row).merge(examTitle: row["exam_title"]) }
      }
    end

    # POST /api/exams/:id/submit
    def submit
      normalized_status = params[:status] == "completed" ? "completed" : "in_progress"

      ActiveRecord::Base.transaction do
        exam = Exams::AccessGuard.call(
          user: current_user, exam_id: params[:id], for_submit: current_user.role != "professor"
        )

        submission = ExamSubmission.find_or_initialize_by(exam_id: params[:id], user_id: current_user.id)

        if submission.persisted? && submission.status == "completed"
          render json: { error: "Prova já finalizada." }, status: :bad_request
          raise ActiveRecord::Rollback
        end

        submission.status = normalized_status
        submission.student_display_name = User.normalize_display_name(current_user.display_name)
        submission.completed_at = Time.current if normalized_status == "completed" && submission.completed_at.nil?
        submission.save!

        is_timed_out = current_user.role != "professor" &&
          exam.time_limit.to_i.positive? &&
          (Time.current - submission.started_at) * 1000 > exam.time_limit.to_i * 60 * 1000 + 30_000

        if is_timed_out
          render json: { error: "O tempo da prova terminou." }, status: :bad_request
          raise ActiveRecord::Rollback
        end

        answers = params[:answers]
        if answers.is_a?(Array)
          answers_by_question = {}
          answers.each do |answer|
            question_id = answer[:questionId]
            answers_by_question[question_id] = answer if question_id.present?
          end

          ExamQuestion.where(exam_id: params[:id]).order(:order_index).each do |question|
            answer = answers_by_question[question.id] || {}
            answer_text = question.type == "mcq" ? normalize_exam_text(answer[:answerText]) : nil
            is_correct = if question.type == "mcq"
                           answer_text == question.correct_answer
            else
                           Exams::PracticalGrader.grade(question.validation_rules, params[:practicalSnapshot])
            end
            points_awarded = is_correct ? question.points.to_i : 0

            exec_all(<<~SQL.squish, [ SecureRandom.uuid, submission.id, question.id, answer_text, is_correct, points_awarded ])
              INSERT INTO exam_answers (id, submission_id, question_id, answer_text, is_correct, points_awarded)
              VALUES ($1, $2, $3, $4, $5, $6)
              ON CONFLICT (submission_id, question_id) DO UPDATE
              SET answer_text = EXCLUDED.answer_text,
                  is_correct = EXCLUDED.is_correct,
                  points_awarded = EXCLUDED.points_awarded
            SQL
          end

          if normalized_status == "completed"
            scores = exec_one(<<~SQL.squish, [ submission.id ])
              SELECT
                SUM(CASE WHEN q.type = 'mcq' THEN a.points_awarded ELSE 0 END) as score_mcq,
                SUM(CASE WHEN q.type = 'practical' THEN a.points_awarded ELSE 0 END) as score_practical
              FROM exam_answers a
              JOIN exam_questions q ON q.id = a.question_id
              WHERE a.submission_id = $1
            SQL

            score_mcq = scores["score_mcq"].to_f
            score_practical = scores["score_practical"].to_f

            submission.update!(
              score_mcq: score_mcq,
              score_practical: score_practical,
              total_score: score_mcq + score_practical,
              practical_snapshot: normalize_json_param(params[:practicalSnapshot])
            )
          end
        end

        render json: { submission: submission.as_public_json }
      end
    end

    # GET /api/exams/:id/submissions
    def index
      turma_id = params[:turmaId].presence
      binds = turma_id ? [ params[:id], turma_id ] : [ params[:id] ]
      turma_filter = turma_id ? " AND u.turma_id = $2" : ""

      rows = exec_all(<<~SQL.squish, binds)
        SELECT s.*, u.username, COALESCE(NULLIF(s.student_display_name, ''), u.display_name) AS display_name, u.turma_id,
               e.title AS exam_title,
               t.nome AS turma_name,
               (SELECT prof.display_name
                FROM exam_application_items eai
                JOIN exam_application_batches eab ON eab.id = eai.batch_id
                JOIN users prof ON prof.id = eab.applied_by
                WHERE eai.exam_id = s.exam_id AND eai.user_id = s.user_id
                ORDER BY eab.created_at DESC
                LIMIT 1) AS applied_by_name
        FROM exam_submissions s
        JOIN users u ON u.id = s.user_id
        JOIN exams e ON e.id = s.exam_id
        LEFT JOIN turmas t ON t.id = u.turma_id
        WHERE s.exam_id = $1#{turma_filter}
        ORDER BY s.completed_at DESC
      SQL

      render json: {
        submissions: rows.map do |row|
          ExamSubmission.public_row(row).merge(
            examTitle: row["exam_title"] || "",
            turmaName: row["turma_name"] || "",
            appliedByName: row["applied_by_name"] || ""
          )
        end
      }
    end

    # GET /api/exams/:examId/submissions/:submissionId
    def show
      row = exec_one(<<~SQL.squish, [ params[:submissionId], params[:examId] ])
        SELECT s.*, u.username, COALESCE(NULLIF(s.student_display_name, ''), u.display_name) AS display_name, u.turma_id,
               e.title AS exam_title, e.description AS exam_description,
               e.time_limit AS exam_time_limit,
               t.nome AS turma_name, t.code AS turma_code,
               (SELECT prof.display_name
                FROM exam_application_items eai
                JOIN exam_application_batches eab ON eab.id = eai.batch_id
                JOIN users prof ON prof.id = eab.applied_by
                WHERE eai.exam_id = s.exam_id AND eai.user_id = s.user_id
                ORDER BY eab.created_at DESC
                LIMIT 1) AS applied_by_name
        FROM exam_submissions s
        JOIN users u ON u.id = s.user_id
        JOIN exams e ON e.id = s.exam_id
        LEFT JOIN turmas t ON t.id = u.turma_id
        WHERE s.id = $1 AND s.exam_id = $2
      SQL

      return render json: { error: "Submissão não encontrada." }, status: :not_found unless row

      if current_user.role != "professor" && row["user_id"] != current_user.id
        return render json: { error: "Acesso negado." }, status: :forbidden
      end

      answer_rows = exec_all(<<~SQL.squish, [ params[:submissionId] ])
        SELECT a.*, q.type, q.text, q.options, q.correct_answer, q.validation_rules, q.points, q.order_index
        FROM exam_answers a
        JOIN exam_questions q ON q.id = a.question_id
        WHERE a.submission_id = $1
        ORDER BY q.order_index ASC
      SQL

      is_professor = current_user.role != "aluno"
      answers = answer_rows.map do |a|
        answer = {
          questionId: a["question_id"],
          type: a["type"],
          text: a["text"],
          options: parse_jsonb(a["options"]),
          answerText: a["answer_text"],
          isCorrect: a["is_correct"],
          pointsAwarded: a["points_awarded"].to_i,
          pointsTotal: a["points"].to_i
        }
        answer[:correctAnswer] = a["correct_answer"] if is_professor
        answer[:validationRules] = parse_jsonb(a["validation_rules"]) if is_professor && a["type"] == "practical"
        answer
      end

      response = {
        submission: ExamSubmission.public_row(row).merge(
          examTitle: row["exam_title"],
          examDescription: row["exam_description"],
          examTimeLimit: row["exam_time_limit"].to_i,
          turmaName: row["turma_name"] || "",
          turmaCode: row["turma_code"] || "",
          appliedByName: row["applied_by_name"] || ""
        ),
        answers: answers
      }
      response[:practicalSnapshot] = parse_jsonb(row["practical_snapshot"]) if is_professor

      render json: response
    end
  end
end
