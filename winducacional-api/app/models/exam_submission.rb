class ExamSubmission < ApplicationRecord
  STATUSES = %w[in_progress completed].freeze

  before_create { self.id ||= SecureRandom.uuid }

  belongs_to :exam
  belongs_to :user
  has_many :exam_answers, foreign_key: :submission_id, dependent: :delete_all, inverse_of: :exam_submission

  validates :status, inclusion: { in: STATUSES }
  validates :user_id, uniqueness: { scope: :exam_id }

  def as_public_json
    {
      id: id,
      examId: exam_id,
      userId: user_id,
      status: status,
      scoreMcq: score_mcq.to_f,
      scorePractical: score_practical.to_f,
      totalScore: total_score.to_f,
      startedAt: started_at,
      completedAt: completed_at,
      username: nil,
      displayName: student_display_name.presence
    }
  end

  # Equivalente ao publicExamSubmission do Node para linhas cruas (com joins)
  # vindas de exec_query, com chaves string.
  def self.public_row(row)
    {
      id: row["id"],
      examId: row["exam_id"],
      userId: row["user_id"],
      status: row["status"],
      scoreMcq: row["score_mcq"].to_f,
      scorePractical: row["score_practical"].to_f,
      totalScore: row["total_score"].to_f,
      startedAt: row["started_at"],
      completedAt: row["completed_at"],
      username: row["username"],
      displayName: row["student_display_name"].presence || row["display_name"]
    }
  end
end
