class ExamApplicationItem < ApplicationRecord
  STATUSES = %w[created existing skipped].freeze
  REMOVAL_STATUSES = %w[active removed retained].freeze

  before_create { self.id ||= SecureRandom.uuid }

  belongs_to :exam_application_batch, foreign_key: :batch_id, inverse_of: :exam_application_items
  belongs_to :exam, optional: true
  belongs_to :user, optional: true

  validates :status, inclusion: { in: STATUSES }
  validates :removal_status, inclusion: { in: REMOVAL_STATUSES }

  # Equivalente ao publicExamApplicationItem do Node para linhas cruas (com
  # joins) vindas de exec_query, com chaves string.
  def self.public_row(row)
    {
      id: row["item_id"],
      examId: row["exam_id"],
      examTitle: row["exam_title"],
      examTimeLimit: row["exam_time_limit"].to_i,
      turmaName: row["turma_name"],
      userId: row["user_id"],
      username: row["username"],
      displayName: row["display_name"],
      assignmentStatus: row["assignment_status"],
      reason: row["reason"],
      removalStatus: row["removal_status"] || "active",
      removalReason: row["removal_reason"] || "",
      removedAt: row["removed_at"],
      createdAt: row["item_created_at"],
      submissionStatus: row["submission_status"] || "pending",
      scoreMcq: row["score_mcq"].to_f,
      scorePractical: row["score_practical"].to_f,
      totalScore: row["total_score"].to_f,
      startedAt: row["started_at"],
      completedAt: row["completed_at"]
    }
  end
end
