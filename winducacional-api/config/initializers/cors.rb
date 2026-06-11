# CORS para o frontend React em porta separada durante desenvolvimento.
# Em produção, o compose final serve o frontend e a API no mesmo domínio; só
# anuncie CORS quando CORS_ORIGINS for definido explicitamente.
default_origins = Rails.env.production? ? "" : "http://localhost:5173,http://localhost:3000,http://localhost:8080"
allowed_origins = ENV.fetch("CORS_ORIGINS", default_origins).split(",").map(&:strip).reject(&:blank?)

if allowed_origins.any?
  Rails.application.config.middleware.insert_before 0, Rack::Cors do
    allow do
      origins(*allowed_origins)
      resource "/api/*",
        headers: :any,
        methods: %i[get post put patch delete options head],
        credentials: true
    end
  end
end
