class ExamApplicationItem < ApplicationRecord
  STATUSES = %w[created existing skipped].freeze
  REMOVAL_STATUSES = %w[active removed retained].freeze

  before_create { self.id ||= SecureRandom.uuid }

  belongs_to :exam_application_batch, foreign_key: :batch_id, inverse_of: :exam_application_items
  belongs_to :exam, optional: true
  belongs_to :user, optional: true

  validates :status, inclusion: { in: STATUSES }
  validates :removal_status, inclusion: { in: REMOVAL_STATUSES }
end
