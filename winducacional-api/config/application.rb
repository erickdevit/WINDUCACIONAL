require_relative "boot"

require "rails"
# Pick the frameworks you want:
require "active_model/railtie"
require "active_job/railtie"
require "active_record/railtie"
# require "active_storage/engine"
require "action_controller/railtie"
# require "action_mailer/railtie"
# require "action_mailbox/engine"
# require "action_text/engine"
require "action_view/railtie"
require "action_cable/engine"
# require "rails/test_unit/railtie"

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

module WinducacionalApi
  class Application < Rails::Application
    # Initialize configuration defaults for originally generated Rails version.
    config.load_defaults 7.2

    # Please, add to the `ignore` list any other `lib` subdirectories that do
    # not contain `.rb` files, or that should not be reloaded or eager loaded.
    # Common ones are `templates`, `generators`, or `middleware`, for example.
    config.autoload_lib(ignore: %w[assets tasks])

    # Configuration for the application, engines, and railties goes here.
    #
    # These settings can be overridden in specific environments using the files
    # in config/environments, which are processed later.
    #
    # config.time_zone = "Central Time (US & Canada)"
    # config.eager_load_paths << Rails.root.join("extras")

    # Only loads a smaller set of middleware suitable for API only apps.
    # Middleware like session, flash, cookies can be added back manually.
    # Skip views, helpers and assets when generating a new resource.
    config.api_only = true

    # A autenticação usa cookie HTTP-only customizado (compatível com as
    # sessões do servidor Node legado), então o middleware de cookies é
    # necessário mesmo em modo API.
    config.middleware.use ActionDispatch::Cookies

    # O schema legado usa SQL puro (views, constraints CHECK e índices
    # parciais que schema.rb não representa).
    config.active_record.schema_format = :sql

    config.time_zone = "America/Sao_Paulo"
    config.active_record.default_timezone = :utc

    # Configurações compartilhadas com o servidor legado
    config.x.session_cookie_name = ENV.fetch("SESSION_COOKIE_NAME", "simulador.sid")
    config.x.session_days = Integer(ENV.fetch("SESSION_DAYS", "7"))
    config.x.data_dir = ENV.fetch("PERSISTENT_DATA_DIR") { Rails.root.join("data").to_s }
    config.x.booklet_library_dir = ENV.fetch("BOOKLET_LIBRARY_DIR") {
      Rails.root.join("..", "src", "containers", "applications", "apps", "booklets", "library").to_s
    }
    config.x.base_tree_path = ENV.fetch("BASE_TREE_PATH") {
      Rails.root.join("..", "src", "reducers", "dir.json").to_s
    }
  end
end
