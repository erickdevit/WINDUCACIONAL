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

  def as_public_json
    {
      id: id,
      turmaId: turma_id,
      title: title,
      description: description,
      containerInitialState: container_initial_state,
      timeLimit: time_limit.to_i,
      isPublished: is_published,
      active: active,
      createdAt: created_at,
      updatedAt: updated_at
    }
  end
end
