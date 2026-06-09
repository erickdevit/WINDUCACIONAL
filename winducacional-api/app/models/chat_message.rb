class ChatMessage < ApplicationRecord
  before_create { self.id ||= SecureRandom.uuid }

  belongs_to :chat_thread, foreign_key: :thread_id, inverse_of: :chat_messages
  belongs_to :sender, class_name: "User", foreign_key: :sender_id, inverse_of: :chat_messages

  validates :body, presence: true, allow_blank: true
end
