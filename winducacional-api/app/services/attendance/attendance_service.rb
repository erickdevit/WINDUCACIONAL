module Attendance
  # Registro de presença por login, idêntico ao recordAttendanceForLogin do
  # Node: só registra para aluno ativo, em turma ativa, dentro do dia e
  # horário de aula da turma no fuso de São Paulo. Usa SQL para manter o
  # mesmo comportamento de NOW() AT TIME ZONE e ON CONFLICT DO NOTHING.
  class AttendanceService
    TIME_ZONE = "America/Sao_Paulo"

    def self.record_login(user_id)
      ActiveRecord::Base.connection.exec_query(
        <<~SQL.squish, "attendance_login", [user_id, SecureRandom.uuid, TIME_ZONE]
          INSERT INTO attendance_records
            (id, user_id, attendance_date, first_login_at, last_login_at, login_count, turma_id)
          SELECT
            $2, u.id, (NOW() AT TIME ZONE $3)::date, NOW(), NOW(), 1, u.turma_id
          FROM users u
          JOIN turmas t ON t.id = u.turma_id
          WHERE u.id = $1 AND u.role = 'aluno'
            AND u.active = TRUE
            AND t.active = TRUE
            AND EXTRACT(DOW FROM NOW() AT TIME ZONE $3)::int = ANY(t.schedule_days)
            AND (NOW() AT TIME ZONE $3)::time >= t.schedule_start_time
            AND (NOW() AT TIME ZONE $3)::time <= t.schedule_end_time
          ON CONFLICT (user_id, attendance_date) DO NOTHING
        SQL
      )
    end
  end
end
