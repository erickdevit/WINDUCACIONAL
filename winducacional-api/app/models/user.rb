class User < ApplicationRecord
  ROLES = %w[aluno professor secretaria].freeze
  STUDENT_TYPES = %w[kids normal].freeze

  before_create { self.id ||= SecureRandom.uuid }

  belongs_to :turma, optional: true
  has_many :sessions, dependent: :delete_all
  has_many :attendance_records, dependent: :delete_all
  has_many :typing_scores, dependent: :delete_all
  has_many :typing_game_scores, dependent: :delete_all
  has_many :exam_assignments, dependent: :delete_all
  has_many :assigned_exams, through: :exam_assignments, source: :exam
  has_many :exam_submissions, dependent: :delete_all
  has_many :chat_messages, foreign_key: :sender_id, dependent: :delete_all, inverse_of: :sender
  has_many :booklet_student_module_accesses, dependent: :delete_all

  validates :username, presence: true, uniqueness: true,
    format: { with: /\A[a-z0-9._-]+\z/, message: "deve conter apenas letras minúsculas, números, ponto, hífen ou sublinhado" }
  validates :display_name, presence: true
  validates :role, inclusion: { in: ROLES }
  validates :student_type, inclusion: { in: STUDENT_TYPES }
  validates :storage_key, presence: true, uniqueness: true

  scope :active, -> { where(active: true) }
  scope :alunos, -> { where(role: "aluno") }

  # Tipo de aluno efetivo: a turma é a fonte de verdade quando existe.
  def resolved_student_type
    return "normal" unless role == "aluno"
    turma&.student_type.presence || student_type || "normal"
  end

  # Formato público idêntico ao publicUser do servidor Node
  def as_public_json
    {
      id: id,
      username: username,
      displayName: display_name,
      role: role,
      studentType: resolved_student_type,
      turmaId: turma_id,
      active: active,
      createdAt: created_at,
      updatedAt: updated_at
    }
  end

  def self.normalize_username(value)
    value.to_s.strip.downcase.gsub(/[^a-z0-9._-]/, "")
  end

  def self.normalize_display_name(value)
    return "" if value.blank?
    value.to_s.strip.split(/\s+/).map do |word|
      word.length <= 1 ? word.upcase : word[0].upcase + word[1..].downcase
    end.join(" ")
  end
end
