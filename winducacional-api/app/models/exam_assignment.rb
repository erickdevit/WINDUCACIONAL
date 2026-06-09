class ExamAssignment < ApplicationRecord
  before_create { self.id ||= SecureRandom.uuid }

  belongs_to :exam
  belongs_to :user

  validates :user_id, uniqueness: { scope: :exam_id }
end
