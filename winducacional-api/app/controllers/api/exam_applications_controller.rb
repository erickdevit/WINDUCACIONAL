module Api
  # Porta de server/routes/exams.cjs: aplicações em lote de provas
  # (atribuição e cancelamento), restrito a professores (secretaria tem
  # acesso somente leitura via ProfessorRequired).
  class ExamApplicationsController < ApplicationController
    include Authenticatable
    include ProfessorRequired
    include ExamNormalization
    include RawSql

    # GET /api/exams/applications
    def index
      turma_id = params[:turmaId].presence
      binds = turma_id ? [ turma_id ] : []
      turma_filter = turma_id ? "WHERE student.turma_id = $1" : ""

      rows = exec_all(<<~SQL.squish, binds)
        SELECT
          b.id, b.mode, b.total_requested, b.total_created, b.total_existing,
          b.total_skipped, b.total_removed, b.total_retained, b.cancelled_at,
          b.cancellation_reason, b.created_at,
          teacher.id as applied_by, teacher.username as applied_by_username,
          teacher.display_name as applied_by_display_name,
          canceller.id as cancelled_by, canceller.username as cancelled_by_username,
          canceller.display_name as cancelled_by_display_name,
          i.id as item_id, i.exam_id, i.user_id, i.status as assignment_status,
          i.removal_status, i.removal_reason, i.removed_at, i.reason,
          i.created_at as item_created_at,
          e.title as exam_title, e.time_limit as exam_time_limit,
          t.nome as turma_name,
          student.username, student.display_name,
          s.status as submission_status, s.score_mcq, s.score_practical,
          s.total_score, s.started_at, s.completed_at
        FROM (
          SELECT * FROM exam_application_batches ORDER BY created_at DESC LIMIT 50
        ) b
        LEFT JOIN users teacher ON teacher.id = b.applied_by
        LEFT JOIN users canceller ON canceller.id = b.cancelled_by
        LEFT JOIN exam_application_items i ON i.batch_id = b.id
        LEFT JOIN exams e ON e.id = i.exam_id
        LEFT JOIN turmas t ON t.id = e.turma_id
        LEFT JOIN users student ON student.id = i.user_id
        LEFT JOIN exam_submissions s
          ON s.exam_id = i.exam_id AND s.user_id = i.user_id
        #{turma_filter}
        ORDER BY b.created_at DESC, i.created_at ASC
      SQL

      batches = {}
      rows.each do |row|
        batches[row["id"]] ||= { batch: row, items: [] }
        batches[row["id"]][:items] << ExamApplicationItem.public_row(row) if row["item_id"]
      end

      render json: {
        applications: batches.values.map { |b| ExamApplicationBatch.public_row(b[:batch], b[:items]) }
      }
    end

    # DELETE /api/exams/applications/:id
    def destroy
      ActiveRecord::Base.transaction do
        batch_row = exec_one("SELECT * FROM exam_application_batches WHERE id = $1 FOR UPDATE", [ params[:id] ])
        unless batch_row
          render json: { error: "Aplicação não encontrada." }, status: :not_found
          raise ActiveRecord::Rollback
        end

        if batch_row["cancelled_at"]
          render json: { error: "Esta aplicação já foi removida." }, status: :bad_request
          raise ActiveRecord::Rollback
        end

        items = exec_all(<<~SQL.squish, [ params[:id] ])
          SELECT i.*, s.id as submission_id, s.status as submission_status
          FROM exam_application_items i
          LEFT JOIN exam_submissions s
            ON s.exam_id = i.exam_id AND s.user_id = i.user_id
          WHERE i.batch_id = $1
          FOR UPDATE OF i
        SQL

        removed_count = 0
        retained_count = 0

        items.each do |item|
          if item["status"] != "created"
            retained_count += 1
            reason = item["status"] == "existing" ? "A atribuição já existia antes desta aplicação." : "A aplicação original já havia ignorado este item."
            retain_item(item["id"], reason)
            next
          end

          if item["submission_id"]
            retained_count += 1
            retain_item(item["id"], "O aluno já iniciou ou concluiu esta prova.")
            next
          end

          exec_all("DELETE FROM exam_assignments WHERE exam_id = $1 AND user_id = $2", [ item["exam_id"], item["user_id"] ])
          exec_all(
            "UPDATE exam_application_items SET removal_status = 'removed', removal_reason = $1, removed_at = NOW() WHERE id = $2",
            [ "A atribuição criada nesta aplicação foi removida.", item["id"] ]
          )
          removed_count += 1
        end

        reason = normalize_exam_text(params[:reason], "Aplicação removida pelo professor.")
        exec_one(<<~SQL.squish, [ current_user.id, reason, removed_count, retained_count, params[:id] ])
          UPDATE exam_application_batches
          SET cancelled_at = NOW(), cancelled_by = $1, cancellation_reason = $2,
              total_removed = $3, total_retained = $4
          WHERE id = $5
          RETURNING *
        SQL

        updated_batch = ExamApplicationBatch.find(params[:id])
        render json: { success: true, application: updated_batch.as_public_json }
      end
    end

    # POST /api/exams/assign-batch
    def assign_batch
      mode = params[:mode] == "balanced" ? "balanced" : "all"
      assignments = params[:assignments].is_a?(Array) ? params[:assignments] : []
      counters = { created: 0, existing: 0, skipped: 0 }

      batch = ActiveRecord::Base.transaction do
        new_batch = ExamApplicationBatch.create!(
          applied_by: current_user.id,
          mode: mode,
          total_requested: assignments.length,
          total_created: 0,
          total_existing: 0,
          total_skipped: 0
        )

        assignments.each { |item| process_assignment(new_batch, item, counters) }

        new_batch.update!(
          total_created: counters[:created],
          total_existing: counters[:existing],
          total_skipped: counters[:skipped]
        )
        new_batch
      end

      render json: { success: true, application: batch.as_public_json }
    end

    private

    def retain_item(item_id, reason)
      exec_all(
        "UPDATE exam_application_items SET removal_status = 'retained', removal_reason = $1, removed_at = NOW() WHERE id = $2",
        [ reason, item_id ]
      )
    end

    def process_assignment(batch, item, counters)
      target = User.find_by(id: item[:userId], active: true)
      unless target && target.role == "aluno"
        counters[:skipped] += 1
        ExamApplicationItem.create!(
          exam_application_batch: batch, exam_id: nil, user_id: nil,
          status: "skipped", reason: "Aluno inexistente, inativo ou sem papel de aluno."
        )
        return
      end

      exam = Exam.find_by(id: item[:examId])
      unless exam&.is_published? && exam&.active?
        counters[:skipped] += 1
        ExamApplicationItem.create!(
          exam_application_batch: batch, exam_id: nil, user_id: target.id,
          status: "skipped", reason: "Prova inexistente, inativa ou não publicada."
        )
        return
      end

      inserted = exec_all(
        "INSERT INTO exam_assignments (id, exam_id, user_id) VALUES ($1, $2, $3) " \
        "ON CONFLICT (exam_id, user_id) DO NOTHING RETURNING id",
        [ SecureRandom.uuid, exam.id, target.id ]
      )

      if inserted.empty?
        counters[:existing] += 1
        status = "existing"
        reason = "Atribuição já existia antes desta aplicação."
      else
        counters[:created] += 1
        status = "created"
        reason = "Atribuição criada nesta aplicação."
      end

      ExamApplicationItem.create!(
        exam_application_batch: batch, exam_id: exam.id, user_id: target.id,
        status: status, reason: reason
      )
    end
  end
end
