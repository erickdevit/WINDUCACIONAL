class ExamApplicationBatch < ApplicationRecord
  MODES = %w[all balanced].freeze

  before_create { self.id ||= SecureRandom.uuid }

  belongs_to :applied_by_user, class_name: "User", foreign_key: :applied_by, optional: true
  belongs_to :cancelled_by_user, class_name: "User", foreign_key: :cancelled_by, optional: true
  has_many :exam_application_items, foreign_key: :batch_id, dependent: :delete_all, inverse_of: :exam_application_batch

  validates :mode, inclusion: { in: MODES }

  def as_public_json(items = [])
    {
      id: id,
      mode: mode,
      modeLabel: mode == "balanced" ? "Distribuir versões" : "Todas para todos",
      totalRequested: total_requested,
      totalCreated: total_created,
      totalExisting: total_existing,
      totalSkipped: total_skipped,
      totalRemoved: total_removed,
      totalRetained: total_retained,
      createdAt: created_at,
      cancelledAt: cancelled_at,
      cancellationReason: cancellation_reason || "",
      appliedBy: applied_by ? { id: applied_by, username: applied_by_user&.username, displayName: applied_by_user&.display_name } : nil,
      cancelledBy: cancelled_by ? { id: cancelled_by, username: cancelled_by_user&.username, displayName: cancelled_by_user&.display_name } : nil,
      items: items
    }
  end

  # Equivalente ao publicExamApplication do Node para linhas cruas (com joins)
  # vindas de exec_query, com chaves string.
  def self.public_row(row, items = [])
    {
      id: row["id"],
      mode: row["mode"],
      modeLabel: row["mode"] == "balanced" ? "Distribuir versões" : "Todas para todos",
      totalRequested: row["total_requested"].to_i,
      totalCreated: row["total_created"].to_i,
      totalExisting: row["total_existing"].to_i,
      totalSkipped: row["total_skipped"].to_i,
      totalRemoved: row["total_removed"].to_i,
      totalRetained: row["total_retained"].to_i,
      createdAt: row["created_at"],
      cancelledAt: row["cancelled_at"],
      cancellationReason: row["cancellation_reason"] || "",
      appliedBy: row["applied_by"] ? { id: row["applied_by"], username: row["applied_by_username"], displayName: row["applied_by_display_name"] } : nil,
      cancelledBy: row["cancelled_by"] ? { id: row["cancelled_by"], username: row["cancelled_by_username"], displayName: row["cancelled_by_display_name"] } : nil,
      items: items
    }
  end
end
