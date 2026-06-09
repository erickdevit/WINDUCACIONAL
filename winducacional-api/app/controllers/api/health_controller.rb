module Api
  class HealthController < ApplicationController
    def show
      ActiveRecord::Base.connection.execute("SELECT 1")
      render json: { ok: true }
    rescue StandardError
      render json: { ok: false, error: "Banco de dados indisponível." }, status: :service_unavailable
    end

    def version
      response.headers["Cache-Control"] = "no-store"
      render json: { version: AppVersionService.sync! }
    end
  end
end
