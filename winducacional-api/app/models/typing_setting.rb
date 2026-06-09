class TypingSetting < ApplicationRecord
  self.primary_key = "student_type"

  STUDENT_TYPES = %w[kids normal].freeze
  DEFAULTS = { pass_min_wpm: 40, pass_min_accuracy: 95, max_errors: 7 }.freeze

  validates :student_type, inclusion: { in: STUDENT_TYPES }

  def self.for_type(student_type)
    find_by(student_type: student_type) || new(student_type: student_type, **DEFAULTS)
  end

  def as_public_json
    {
      studentType: student_type,
      passMinWpm: pass_min_wpm,
      passMinAccuracy: pass_min_accuracy,
      maxErrors: max_errors,
      updatedAt: updated_at
    }
  end
end
