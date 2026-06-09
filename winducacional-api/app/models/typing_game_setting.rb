class TypingGameSetting < ApplicationRecord
  self.primary_key = "student_type"

  STUDENT_TYPES = %w[kids normal].freeze
  DEFAULTS = {
    pass_min_wpm: 40, pass_min_accuracy: 95, max_lives: 7,
    game_speed: 100, game_speed_boost: 3
  }.freeze

  validates :student_type, inclusion: { in: STUDENT_TYPES }

  def self.for_type(student_type)
    find_by(student_type: student_type) || new(student_type: student_type, **DEFAULTS)
  end

  def as_public_json
    {
      studentType: student_type,
      passMinWpm: pass_min_wpm,
      passMinAccuracy: pass_min_accuracy,
      maxLives: max_lives,
      gameSpeed: game_speed,
      gameSpeedBoost: game_speed_boost,
      updatedAt: updated_at
    }
  end
end
