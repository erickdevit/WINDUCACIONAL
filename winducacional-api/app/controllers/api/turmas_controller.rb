module Api
  # Porta de server/routes/turmas.cjs: CRUD de turmas, restrito a
  # professores (secretaria tem acesso somente leitura via ProfessorRequired).
  class TurmasController < ApplicationController
    include Authenticatable
    include ProfessorRequired

    # GET /api/turmas
    def index
      scope = Turma.order(:nome)
      scope = scope.where(student_type: params[:studentType]) if Turma::STUDENT_TYPES.include?(params[:studentType])
      render json: { turmas: scope.map(&:as_public_json) }
    end

    # POST /api/turmas
    def create
      nome = params[:nome].to_s.strip
      if nome.length < 2
        return render json: { error: "Nome da turma deve ter pelo menos 2 caracteres." }, status: :bad_request
      end

      student_type = normalize_class_student_type(params[:studentType])
      schedule = normalize_class_schedule(params)
      code = Turma.ensure_code(params[:code])

      turma = Turma.create!(
        nome: nome,
        code: code,
        student_type: student_type,
        schedule_days: schedule[:days],
        schedule_start_time: schedule[:start_time],
        schedule_end_time: schedule[:end_time],
        descricao: params[:descricao].to_s.strip
      )
      render json: { turma: turma.as_public_json }, status: :created
    rescue ActiveRecord::RecordNotUnique
      render json: { error: "Já existe uma turma com esse nome ou código." }, status: :conflict
    rescue ActiveRecord::RecordInvalid => e
      raise unless e.record.errors.of_kind?(:nome, :taken) || e.record.errors.of_kind?(:code, :taken)

      render json: { error: "Já existe uma turma com esse nome ou código." }, status: :conflict
    end

    # PATCH /api/turmas/:id
    def update
      turma = Turma.find_by(id: params[:id])
      return render json: { error: "Turma não encontrada." }, status: :not_found unless turma

      attrs = {}

      if params.key?(:nome)
        nome = params[:nome].to_s.strip
        if nome.length < 2
          return render json: { error: "Nome da turma deve ter pelo menos 2 caracteres." }, status: :bad_request
        end
        attrs[:nome] = nome
      end

      next_student_type = nil
      if params.key?(:studentType)
        next_student_type = normalize_class_student_type(params[:studentType])
        attrs[:student_type] = next_student_type
      end

      attrs[:descricao] = params[:descricao].to_s.strip if params.key?(:descricao)

      if params.key?(:scheduleDays) || params.key?(:scheduleStartTime) || params.key?(:scheduleEndTime)
        schedule = normalize_class_schedule(params)
        attrs[:schedule_days] = schedule[:days]
        attrs[:schedule_start_time] = schedule[:start_time]
        attrs[:schedule_end_time] = schedule[:end_time]
      end

      attrs[:active] = ActiveModel::Type::Boolean.new.cast(params[:active]) if params.key?(:active)

      if attrs.empty?
        return render json: { error: "Nenhuma alteração enviada." }, status: :bad_request
      end

      attrs[:updated_at] = Time.current

      ActiveRecord::Base.transaction do
        turma.update!(attrs)

        if next_student_type.present? && next_student_type != "reposicao"
          User.where(role: "aluno", turma_id: turma.id)
              .update_all(student_type: next_student_type, updated_at: Time.current)
        end
      end

      render json: { turma: turma.as_public_json }
    rescue ActiveRecord::RecordNotUnique
      render json: { error: "Já existe uma turma com esse nome ou código." }, status: :conflict
    rescue ActiveRecord::RecordInvalid => e
      raise unless e.record.errors.of_kind?(:nome, :taken)

      render json: { error: "Já existe uma turma com esse nome ou código." }, status: :conflict
    end

    # DELETE /api/turmas/:id
    def destroy
      turma = Turma.find_by(id: params[:id])
      return render json: { error: "Turma não encontrada." }, status: :not_found unless turma

      ActiveRecord::Base.transaction do
        User.where(turma_id: turma.id).update_all(turma_id: nil)
        turma.destroy!
      end
      head :no_content
    end

    private

    # Equivalente ao normalizeClassStudentType do Node
    def normalize_class_student_type(value)
      normalized = value.to_s.strip.downcase
      normalized = "normal" if normalized.blank?
      raise ApiError.new("Tipo de turma inválido.", 400) unless Turma::STUDENT_TYPES.include?(normalized)

      normalized
    end

    # Equivalente ao normalizeClassSchedule do Node
    def normalize_class_schedule(params)
      days = normalize_schedule_days(params[:scheduleDays])
      start_time = normalize_schedule_time(params[:scheduleStartTime], Turma::DEFAULT_START_TIME)
      end_time = normalize_schedule_time(params[:scheduleEndTime], Turma::DEFAULT_END_TIME)
      if start_time >= end_time
        raise ApiError.new("Horário inicial da turma deve ser menor que o horário final.", 400)
      end

      { days: days, start_time: start_time, end_time: end_time }
    end

    def normalize_schedule_days(days)
      source = days.is_a?(Array) && days.present? ? days : Turma::DEFAULT_SCHEDULE_DAYS
      normalized = source.map { |day| Integer(day) }.uniq.sort
      raise ApiError.new("Dias de aula inválidos.", 400) if normalized.empty? || normalized.any? { |d| d.negative? || d > 6 }

      normalized
    rescue ArgumentError, TypeError
      raise ApiError.new("Dias de aula inválidos.", 400)
    end

    def normalize_schedule_time(value, fallback)
      normalized = value.presence || fallback
      normalized = normalized.to_s.strip
      unless normalized.match?(/\A\d{2}:\d{2}\z/)
        raise ApiError.new("Horário da turma deve usar o formato HH:MM.", 400)
      end

      hours, minutes = normalized.split(":").map(&:to_i)
      raise ApiError.new("Horário da turma inválido.", 400) if hours > 23 || minutes > 59

      normalized
    end
  end
end
