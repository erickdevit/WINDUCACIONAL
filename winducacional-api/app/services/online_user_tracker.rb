# Rastreia usuários online (substitui o Map onlineUsers do Node).
# Usa o cache do Rails (Redis em produção) para funcionar entre processos.
class OnlineUserTracker
  TTL = 90.seconds
  PREFIX = "online_user:".freeze

  def self.add(user)
    Rails.cache.write("#{PREFIX}#{user.id}", user.as_public_json, expires_in: TTL)
  end

  def self.remove(user)
    Rails.cache.delete("#{PREFIX}#{user.id}")
  end

  def self.touch(user)
    add(user)
  end

  def self.online?(user_id)
    Rails.cache.exist?("#{PREFIX}#{user_id}")
  end
end
