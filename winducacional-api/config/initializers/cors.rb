# CORS para o frontend React em porta separada durante o desenvolvimento.
# Em produção o frontend é servido pelo mesmo domínio (reverse proxy),
# então a lista de origens vem de CORS_ORIGINS.
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins(*ENV.fetch("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(","))
    resource "/api/*",
      headers: :any,
      methods: %i[get post put patch delete options head],
      credentials: true
  end
end
