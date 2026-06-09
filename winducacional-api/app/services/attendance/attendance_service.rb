module Attendance
  # Lógica de frequência portada do servidor Node: registro por login dentro
  # da agenda da turma (fuso de São Paulo), cálculo de dias esperados pela
  # agenda e verificação de presença dentro do horário de aula.
  class AttendanceService
    TIME_ZONE = "America/Sao_Paulo"

    # Registro de presença por login, idêntico ao recordAttendanceForLogin do
    # Node: só registra para aluno ativo, em turma ativa, dentro do dia e
    # horário de aula da turma. Usa SQL para manter o mesmo comportamento de
    # NOW() AT TIME ZONE e ON CONFLICT DO NOTHING.
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

    def self.today_in_zone
      Time.current.in_time_zone(TIME_ZONE).strftime("%Y-%m-%d")
    end

    # Intervalo padrão: últimos 30 dias no fuso de São Paulo.
    def self.default_date_range
      now = Time.current.in_time_zone(TIME_ZONE)
      {
        start_date: (now - 29.days).strftime("%Y-%m-%d"),
        end_date: now.strftime("%Y-%m-%d")
      }
    end

    def self.normalize_date_param(value)
      text = value.to_s.strip
      text.match?(/\A\d{4}-\d{2}-\d{2}\z/) ? text : ""
    end

    def self.date_list(start_date, end_date)
      (Date.parse(start_date)..Date.parse(end_date)).map(&:iso8601)
    end

    def self.date_weekday(date_string)
      Date.parse(date_string).wday
    end

    def self.time_to_minutes(value)
      hours, minutes = value.to_s[0, 5].split(":")
      hours.to_i * 60 + minutes.to_i
    end

    # Minutos do dia no fuso de São Paulo para um timestamp.
    def self.attendance_time_minutes(value)
      return nil if value.blank?
      time = value.is_a?(String) ? Time.zone.parse(value) : value
      return nil unless time
      local = time.in_time_zone(TIME_ZONE)
      local.hour * 60 + local.min
    rescue ArgumentError
      nil
    end

    def self.student_schedule(schedule_days:, schedule_start_time:, schedule_end_time:)
      {
        days: decode_days(schedule_days),
        start_time: format_schedule_time(schedule_start_time, Turma::DEFAULT_START_TIME),
        end_time: format_schedule_time(schedule_end_time, Turma::DEFAULT_END_TIME)
      }
    end

    # exec_query devolve arrays do PostgreSQL como texto "{1,2,3}".
    def self.decode_days(value)
      return value.map(&:to_i) if value.is_a?(Array)
      value.to_s.delete("{}").split(",").reject(&:blank?).map(&:to_i)
    end

    def self.format_schedule_time(value, fallback)
      text = value.respond_to?(:strftime) ? value.strftime("%H:%M") : value.to_s
      (text.presence || fallback)[0, 5]
    end

    def self.expected_dates_for_schedule(dates, schedule)
      dates.select { |date| schedule[:days].include?(date_weekday(date)) }
    end

    # Um registro conta como presença se houve login dentro da janela de aula.
    def self.record_inside_schedule?(record, schedule)
      return false unless schedule[:days].include?(date_weekday(record[:attendanceDate]))

      start_minutes = time_to_minutes(schedule[:start_time])
      end_minutes = time_to_minutes(schedule[:end_time])
      first_login = attendance_time_minutes(record[:firstLoginAt])
      last_login = attendance_time_minutes(record[:lastLoginAt])
      return false if first_login.nil? || last_login.nil?

      first_login <= end_minutes && last_login >= start_minutes
    end

    # Formato público idêntico ao publicAttendanceRecord do Node.
    def self.public_record(row)
      {
        id: row["id"],
        userId: row["user_id"],
        attendanceDate: row["attendance_date"].to_s,
        firstLoginAt: row["first_login_at"],
        lastLoginAt: row["last_login_at"],
        loginCount: row["login_count"].to_i,
        username: row["username"],
        displayName: row["display_name"],
        turmaId: row["turma_id"],
        turmaNome: row["turma_nome"] || "",
        classType: row["class_type"]
      }
    end
  end
end
