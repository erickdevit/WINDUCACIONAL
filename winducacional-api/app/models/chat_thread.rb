class ChatThread < ApplicationRecord
  TYPES = %w[dm group].freeze

  before_create { self.id ||= SecureRandom.uuid }

  belongs_to :turma, optional: true
  belongs_to :user_a_record, class_name: "User", foreign_key: :user_a, optional: true
  belongs_to :user_b_record, class_name: "User", foreign_key: :user_b, optional: true
  has_many :chat_messages, foreign_key: :thread_id, dependent: :delete_all, inverse_of: :chat_thread

  validates :type, inclusion: { in: TYPES }

  # type é coluna legada (dm/group), não STI
  self.inheritance_column = :_type_disabled

  def participant?(user)
    return user_a == user.id || user_b == user.id if type == "dm"
    type == "group" && (user.role != "aluno" || turma_id == user.turma_id)
  end
end
