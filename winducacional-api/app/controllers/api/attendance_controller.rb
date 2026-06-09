module Api
  # Frequência: histórico do aluno, resumo do professor com cálculo por agenda
  # de turma e registro manual em lote. Portado de server/routes/attendance.cjs.
  class AttendanceController < ApplicationController
    include Authenticatable
    include ProfessorRequired

    skip_before_action :require_professor!, only: %i[me]

    RECORD_SELECT = <<~SQL.squish.freeze
      SELECT ar.id,
             ar.user_id,
             to_char(ar.attendance_date, 'YYYY-MM-DD') AS attendance_date,
             ar.first_login_at,
             ar.last_login_at,
             ar.login_count,
             u.username,
             u.display_name,
             COALESCE(ar.turma_id, u.turma_id) AS turma_id,
             t.nome AS turma_nome,
             t.student_type AS class_type
      FROM attendance_records ar
      JOIN users u ON u.id = ar.user_id
      LEFT JOIN turmas t ON t.id = COALESCE(ar.turma_id, u.turma_id)
    SQL

    def me
      unless current_user.role == "aluno"
        return render json: { error: "Histórico individual disponível apenas para alunos." }, status: :forbidden
      end

      rows = exec_select(
        <<~SQL.squish, [current_user.id]
          #{RECORD_SELECT}
          WHERE ar.user_id = $1
            AND (ar.turma_id IS NULL OR ar.turma_id NOT IN (SELECT id FROM turmas WHERE student_type = 'reposicao'))
          ORDER BY ar.attendance_date DESC
          LIMIT 90
        SQL
      )
      records = rows.map { |row| Attendance::AttendanceService.public_record(row) }
      today = Attendance::AttendanceService.today_in_zone

      render json: {
        today: today,
        todayRecord: records.find { |record| record[:attendanceDate] == today },
        records: records
      }
    end

    def summary
      defaults = Attendance::AttendanceService.default_date_range
      start_date = Attendance::AttendanceService.normalize_date_param(params[:startDate]).presence || defaults[:start_date]
      end_date = Attendance::AttendanceService.normalize_date_param(params[:endDate]).presence || defaults[:end_date]
      turma_id = params[:turmaId].to_s

      if start_date > end_date
        return render json: { error: "Data inicial não pode ser maior que a final." }, status: :bad_request
      end

      days = Attendance::AttendanceService.date_list(start_date, end_date)
      if days.length > 366
        return render json: { error: "O período de frequência não pode passar de 366 dias." }, status: :bad_request
      end

      reposicao = turma_id.present? && Turma.find_by(id: turma_id)&.student_type == "reposicao"

      student_rows = fetch_students(turma_id, reposicao)
      records = fetch_records(start_date, end_date, turma_id, reposicao)
      records = records.reject { |record| record[:classType] == "reposicao" } unless reposicao

      records_by_student = records.group_by { |record| record[:userId] }
      daily_map = days.to_h do |date|
        [date, { date: date, expected: 0, present: 0, absent: 0, attendanceRate: 0 }]
      end

      total_possible = 0
      total_presences = 0

      students = student_rows.map do |student|
        schedule = Attendance::AttendanceService.student_schedule(
          schedule_days: student["schedule_days"],
          schedule_start_time: student["schedule_start_time"],
          schedule_end_time: student["schedule_end_time"]
        )
        student_records = records_by_student[student["id"]] || []
        expected_dates =
          if reposicao
            student_records.map { |record| record[:attendanceDate] }
          else
            Attendance::AttendanceService.expected_dates_for_schedule(days, schedule)
          end
        expected_set = expected_dates.to_set
        expected_dates.each { |date| daily_map[date][:expected] += 1 if daily_map[date] }

        counted_records = student_records.select do |record|
          expected_set.include?(record[:attendanceDate]) &&
            (reposicao || Attendance::AttendanceService.record_inside_schedule?(record, schedule))
        end
        present_days = counted_records.map { |record| record[:attendanceDate] }.uniq.size
        absent_days = [expected_dates.length - present_days, 0].max
        total_possible += expected_dates.length
        total_presences += present_days

        counted_records.each do |record|
          daily_map[record[:attendanceDate]][:present] += 1 if daily_map[record[:attendanceDate]]
        end

        last_login_at = student_records.filter_map { |record| record[:lastLoginAt] }.max

        {
          id: student["id"],
          username: student["username"],
          displayName: student["display_name"],
          turmaId: student["turma_id"],
          turmaNome: student["turma_nome"] || "",
          presentDays: present_days,
          absentDays: absent_days,
          attendanceRate: expected_dates.empty? ? 0 : ((present_days.to_f / expected_dates.length) * 100).round,
          lastLoginAt: last_login_at,
          records: student_records
        }
      end

      daily = daily_map.values.select { |day| day[:expected].positive? }.map do |day|
        day.merge(
          absent: [day[:expected] - day[:present], 0].max,
          attendanceRate: ((day[:present].to_f / day[:expected]) * 100).round
        )
      end

      total_absences = [total_possible - total_presences, 0].max

      render json: {
        range: { startDate: start_date, endDate: end_date, totalDays: daily.length },
        totals: {
          students: students.length,
          presences: total_presences,
          absences: total_absences,
          attendanceRate: total_possible.positive? ? ((total_presences.to_f / total_possible) * 100).round : 0
        },
        students: students,
        daily: daily,
        records: records
      }
    end

    def register
      date = params[:date]
      turma_id = params[:turmaId]
      students = params[:students]

      unless date.present? && turma_id.present? && students.is_a?(Array)
        return render json: { error: "Parâmetros inválidos." }, status: :bad_request
      end

      ActiveRecord::Base.transaction do
        students.each do |student|
          if student[:isPresent]
            exec_select(
              <<~SQL.squish, [SecureRandom.uuid, student[:id], date, turma_id]
                INSERT INTO attendance_records
                  (id, user_id, attendance_date, first_login_at, last_login_at, login_count, source, turma_id)
                VALUES ($1, $2, $3, NOW(), NOW(), 1, 'manual', $4)
                ON CONFLICT (user_id, attendance_date)
                DO UPDATE SET first_login_at = COALESCE(attendance_records.first_login_at, NOW()),
                              last_login_at = NOW(),
                              source = 'manual',
                              turma_id = EXCLUDED.turma_id
              SQL
            )
          else
            # "Ausente" apaga o registro do dia, mas só da turma sendo alterada
            # para não remover presenças de outras turmas na mesma data.
            exec_select(
              <<~SQL.squish, [student[:id], date, turma_id]
                DELETE FROM attendance_records
                WHERE user_id = $1 AND attendance_date = $2 AND (turma_id = $3 OR turma_id IS NULL)
              SQL
            )
          end
        end
      end

      head :no_content
    end

    private

    def fetch_students(turma_id, reposicao)
      if reposicao
        exec_select(
          <<~SQL.squish, [turma_id]
            SELECT DISTINCT u.id, u.username, u.display_name, u.turma_id,
                   t.nome AS turma_nome,
                   NULL::smallint[] AS schedule_days,
                   '00:00'::time AS schedule_start_time,
                   '23:59'::time AS schedule_end_time
            FROM users u
            JOIN attendance_records ar ON ar.user_id = u.id
            LEFT JOIN turmas t ON t.id = u.turma_id
            WHERE u.role = 'aluno' AND u.active = TRUE AND ar.turma_id = $1
            ORDER BY u.display_name ASC
          SQL
        )
      else
        binds = []
        filter = "WHERE u.role = 'aluno' AND u.active = TRUE"
        if turma_id.present?
          binds << turma_id
          filter += " AND u.turma_id = $#{binds.length}"
        end
        exec_select(
          <<~SQL.squish, binds
            SELECT u.id, u.username, u.display_name, u.turma_id,
                   t.nome AS turma_nome, t.schedule_days,
                   t.schedule_start_time, t.schedule_end_time
            FROM users u
            LEFT JOIN turmas t ON t.id = u.turma_id
            #{filter}
            ORDER BY t.nome ASC NULLS LAST, u.display_name ASC
          SQL
        )
      end
    end

    def fetch_records(start_date, end_date, turma_id, reposicao)
      binds = [start_date, end_date]
      filter = "WHERE ar.attendance_date BETWEEN $1 AND $2"
      if turma_id.present?
        binds << turma_id
        filter +=
          if reposicao
            " AND ar.turma_id = $#{binds.length}"
          else
            " AND (ar.turma_id = $#{binds.length} OR (ar.turma_id IS NULL AND u.turma_id = $#{binds.length}))"
          end
      end

      exec_select(
        <<~SQL.squish, binds
          #{RECORD_SELECT}
          #{filter}
          ORDER BY ar.attendance_date DESC, u.display_name ASC
        SQL
      ).map { |row| Attendance::AttendanceService.public_record(row) }
    end

    def exec_select(sql, binds)
      ActiveRecord::Base.connection.exec_query(sql, "attendance", binds).to_a
    end
  end
end
