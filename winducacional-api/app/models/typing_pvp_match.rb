class TypingPvpMatch < ApplicationRecord
  before_create { self.id ||= SecureRandom.uuid }

  belongs_to :winner, class_name: "User", foreign_key: :winner_id, optional: true
  belongs_to :loser, class_name: "User", foreign_key: :loser_id, optional: true
  belongs_to :turma, optional: true
end
