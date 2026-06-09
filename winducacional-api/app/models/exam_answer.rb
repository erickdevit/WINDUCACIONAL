class ExamAnswer < ApplicationRecord
  before_create { self.id ||= SecureRandom.uuid }

  belongs_to :exam_submission, foreign_key: :submission_id, inverse_of: :exam_answers
  belongs_to :exam_question, foreign_key: :question_id, inverse_of: :exam_answers

  validates :question_id, uniqueness: { scope: :submission_id }
end
