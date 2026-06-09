class TypingGameScore < ApplicationRecord
  STATUSES = %w[won lost].freeze

  before_create { self.id ||= SecureRandom.uuid }

  belongs_to :user

  validates :mission_id, presence: true
  validates :status, inclusion: { in: STATUSES }
end
