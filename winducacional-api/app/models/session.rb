class Session < ApplicationRecord
  before_create { self.id ||= SecureRandom.uuid }

  belongs_to :user

  scope :valid, -> { where("expires_at > ?", Time.current) }

  def self.hash_token(token)
    Digest::SHA256.hexdigest(token.to_s)
  end
end
