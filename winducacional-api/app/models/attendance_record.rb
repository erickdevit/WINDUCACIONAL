class AttendanceRecord < ApplicationRecord
  SOURCES = %w[login manual].freeze

  before_create { self.id ||= SecureRandom.uuid }

  belongs_to :user
  belongs_to :turma, optional: true

  validates :attendance_date, presence: true, uniqueness: { scope: :user_id }
  validates :source, inclusion: { in: SOURCES }
end
