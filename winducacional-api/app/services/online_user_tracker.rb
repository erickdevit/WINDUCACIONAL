# Rastreia usuários online (substitui o Map onlineUsers do Node).
# Usa um sorted set no Redis (score = último heartbeat) para funcionar
# entre processos/workers e permitir consultas por turma.
class OnlineUserTracker
  TTL = 90 # segundos
  KEY = "online_users".freeze

  def self.redis
    @redis ||= Redis.new(url: ENV.fetch("REDIS_URL", "redis://localhost:6379/1"))
  end

  def self.add(user)
    redis.zadd(KEY, Time.now.to_i, user.id)
  end

  def self.remove(user)
    redis.zrem(KEY, user.id)
  end

  def self.touch(user)
    add(user)
  end

  def self.online?(user_id)
    score = redis.zscore(KEY, user_id)
    score.present? && score >= cutoff
  end

  # Ids de todos os usuários online (heartbeat dentro do TTL).
  def self.online_ids
    redis.zrangebyscore(KEY, cutoff, "+inf")
  end

  # Equivalente ao getOnlinePvpUsers do Node: alunos online da mesma turma,
  # exceto o próprio usuário.
  def self.online_classmates(viewer)
    return User.none if viewer.turma_id.blank?

    ids = online_ids - [ viewer.id ]
    return User.none if ids.empty?

    User.where(id: ids, role: "aluno", active: true, turma_id: viewer.turma_id)
  end

  def self.cutoff
    Time.now.to_i - TTL
  end
end
