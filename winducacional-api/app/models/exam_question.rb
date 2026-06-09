class ExamQuestion < ApplicationRecord
  TYPES = %w[mcq practical].freeze

  before_create { self.id ||= SecureRandom.uuid }

  belongs_to :exam
  has_many :exam_answers, foreign_key: :question_id, dependent: :destroy, inverse_of: :exam_question

  validates :type, inclusion: { in: TYPES }
  validates :text, presence: true

  # type é coluna legada, não STI
  self.inheritance_column = :_type_disabled
end
