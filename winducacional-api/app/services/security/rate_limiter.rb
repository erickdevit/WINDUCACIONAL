module Security
  # Fixed-window rate limiter para endpoints sensíveis. Em produção usa Redis
  # quando REDIS_URL está presente; em desenvolvimento/teste usa memória local.
  class RateLimiter
    @memory = {}
    @mutex = Mutex.new

    class << self
      def exceeded?(scope:, discriminator:, limit:, period:)
        count = increment(scope: scope, discriminator: discriminator, period: period)
        count > limit.to_i
      end

      def reset!
        @mutex.synchronize { @memory.clear }
      end

      private

      def increment(scope:, discriminator:, period:)
        redis_increment(scope: scope, discriminator: discriminator, period: period) || memory_increment(
          scope: scope,
          discriminator: discriminator,
          period: period
        )
      end

      def redis_increment(scope:, discriminator:, period:)
        return nil unless Rails.env.production? && ENV["REDIS_URL"].present?

        key = key_for(scope, discriminator, period)
        count = redis.incr(key)
        redis.expire(key, period.to_i * 2) if count == 1
        count
      rescue Redis::BaseError => error
        Rails.logger.warn("Rate limiter Redis indisponível: #{error.class}")
        nil
      end

      def memory_increment(scope:, discriminator:, period:)
        key = key_for(scope, discriminator, period)
        now = Time.current.to_i
        @mutex.synchronize do
          entry = @memory[key]
          if entry.nil? || entry[:expires_at] <= now
            entry = { count: 0, expires_at: now + period.to_i }
            @memory[key] = entry
          end
          entry[:count] += 1
        end
      end

      def key_for(scope, discriminator, period)
        window = Time.current.to_i / period.to_i
        safe_discriminator = discriminator.to_s.gsub(/[^a-zA-Z0-9:._-]/, "_")
        "rate_limit:#{scope}:#{safe_discriminator}:#{window}"
      end

      def redis
        @redis ||= Redis.new(url: ENV.fetch("REDIS_URL"))
      end
    end
  end
end
