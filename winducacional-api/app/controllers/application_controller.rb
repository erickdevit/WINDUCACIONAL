class ApplicationController < ActionController::API
  include ActionController::Cookies

  rescue_from ApiError do |error|
    render json: { error: error.message }, status: error.status
  end

  rescue_from ActiveRecord::RecordNotFound do
    render json: { error: "Registro não encontrado." }, status: :not_found
  end

  rescue_from ActiveRecord::RecordInvalid do |error|
    render json: { error: error.record.errors.full_messages.first }, status: :bad_request
  end

  private

  def enforce_rate_limit!(scope:, discriminator:, limit:, period:)
    return false unless Security::RateLimiter.exceeded?(
      scope: scope,
      discriminator: discriminator,
      limit: limit,
      period: period
    )

    response.set_header("Retry-After", period.to_i.to_s)
    render json: { error: "Muitas tentativas. Tente novamente em instantes." }, status: :too_many_requests
    true
  end

  def rate_limit_period
    [Integer(ENV.fetch("RATE_LIMIT_PERIOD_SECONDS", "300")), 1].max
  rescue ArgumentError
    300
  end

  def rate_limit_value(env_key, default)
    [Integer(ENV.fetch(env_key, default.to_s)), 1].max
  rescue ArgumentError
    default
  end
end
