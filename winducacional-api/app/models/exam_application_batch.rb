class ExamApplicationBatch < ApplicationRecord
  MODES = %w[all balanced].freeze

  before_create { self.id ||= SecureRandom.uuid }

  belongs_to :applied_by_user, class_name: "User", foreign_key: :applied_by, optional: true
  belongs_to :cancelled_by_user, class_name: "User", foreign_key: :cancelled_by, optional: true
  has_many :exam_application_items, foreign_key: :batch_id, dependent: :delete_all, inverse_of: :exam_application_batch

  validates :mode, inclusion: { in: MODES }
end
