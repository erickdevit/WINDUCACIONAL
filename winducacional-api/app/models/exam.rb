class Exam < ApplicationRecord
  before_create { self.id ||= SecureRandom.uuid }

  belongs_to :turma, optional: true
  has_many :exam_questions, -> { order(:order_index) }, dependent: :destroy
  has_many :exam_submissions, dependent: :destroy
  has_many :exam_assignments, dependent: :destroy
  has_many :assigned_users, through: :exam_assignments, source: :user

  validates :title, presence: true

  scope :active, -> { where(active: true) }
  scope :published, -> { where(is_published: true) }
end
