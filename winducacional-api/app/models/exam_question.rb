class ExamQuestion < ApplicationRecord
  TYPES = %w[mcq practical].freeze

  before_create { self.id ||= SecureRandom.uuid }

  belongs_to :exam
  has_many :exam_answers, foreign_key: :question_id, dependent: :destroy, inverse_of: :exam_question

  validates :type, inclusion: { in: TYPES }
  validates :text, presence: true

  # type é coluna legada, não STI
  self.inheritance_column = :_type_disabled

  def as_public_json
    {
      id: id,
      examId: exam_id,
      type: type,
      text: text,
      options: options,
      points: points.to_i,
      timeLimit: time_limit.to_i,
      orderIndex: order_index
    }
  end

  def as_public_json_full
    as_public_json.merge(
      correctAnswer: correct_answer,
      validationRules: validation_rules
    )
  end
end
