class Turma < ApplicationRecord
  STUDENT_TYPES = %w[kids normal reposicao].freeze
  DEFAULT_SCHEDULE_DAYS = [1, 2, 3, 4, 5].freeze
  DEFAULT_START_TIME = "00:00"
  DEFAULT_END_TIME = "23:59"

  before_create { self.id ||= SecureRandom.uuid }

  has_many :users, dependent: :nullify
  has_many :attendance_records, dependent: :nullify
  has_many :exams, dependent: :destroy
  has_many :chat_threads, dependent: :destroy
  has_many :typing_pvp_matches, dependent: :destroy

  validates :nome, presence: true, uniqueness: true
  validates :code, presence: true, uniqueness: true,
    format: { with: /\A[A-Z0-9]{6}\z/, message: "deve ter 6 letras ou números maiúsculos" }
  validates :student_type, inclusion: { in: STUDENT_TYPES }

  scope :active, -> { where(active: true) }

  def as_public_json
    {
      id: id,
      nome: nome,
      code: code,
      studentType: student_type || "normal",
      scheduleDays: schedule_days || DEFAULT_SCHEDULE_DAYS,
      scheduleStartTime: schedule_start_time&.strftime("%H:%M") || DEFAULT_START_TIME,
      scheduleEndTime: schedule_end_time&.strftime("%H:%M") || DEFAULT_END_TIME,
      descricao: descricao || "",
      active: active,
      createdAt: created_at,
      updatedAt: updated_at
    }
  end

  def self.generate_code
    chars = ("A".."Z").to_a + ("0".."9").to_a
    SecureRandom.bytes(6).bytes.map { |byte| chars[byte % chars.length] }.join
  end

  def self.normalize_code(code)
    code.to_s.strip.upcase.gsub(/[^A-Z0-9]/, "")
  end

  # Garante um código único: usa o solicitado se livre, ou gera um novo.
  def self.ensure_code(requested_code = nil)
    normalized = normalize_code(requested_code)
    if normalized.present? && !normalized.match?(/\A[A-Z0-9]{6}\z/)
      raise ApiError.new("Código da turma deve ter 6 letras ou números maiúsculos.", 400)
    end

    12.times do |attempt|
      code = attempt.zero? && normalized.present? ? normalized : generate_code
      return code unless exists?(code: code)
      raise ApiError.new("Código da turma já está em uso.", 409) if normalized.present?
    end

    raise ApiError.new("Não foi possível gerar um código de turma único.", 500)
  end
end
