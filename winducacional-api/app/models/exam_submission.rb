class ExamSubmission < ApplicationRecord
  STATUSES = %w[in_progress completed].freeze

  before_create { self.id ||= SecureRandom.uuid }

  belongs_to :exam
  belongs_to :user
  has_many :exam_answers, foreign_key: :submission_id, dependent: :delete_all, inverse_of: :exam_submission

  validates :status, inclusion: { in: STATUSES }
  validates :user_id, uniqueness: { scope: :exam_id }
end
