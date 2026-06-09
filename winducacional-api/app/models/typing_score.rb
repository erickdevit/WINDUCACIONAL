class TypingScore < ApplicationRecord
  before_create { self.id ||= SecureRandom.uuid }

  belongs_to :user

  validates :lesson_id, presence: true
  validates :wpm, presence: true
  validates :accuracy, presence: true
end
