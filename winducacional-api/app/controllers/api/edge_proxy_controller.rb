module Api
  # Porta de server/routes/edgeProxy.cjs: proxy para exibir páginas do
  # Google/YouTube dentro do navegador simulado, removendo a restrição de
  # iframe (X-Frame-Options/CSP) das respostas.
  #
  # Correções deliberadas em relação ao Node: (1) o endpoint agora exige
  # autenticação — o original era um proxy aberto, sem requireAuth; (2) a
  # checagem de domínio compara o host (exato ou subdomínio) em vez de usar
  # String#include?, que permitia contornar a restrição com hosts como
  # "google.com.evil.com" ou "naogoogle.com".
  class EdgeProxyController < ApplicationController
    include Authenticatable

    ALLOWED_DOMAINS = %w[google.com youtube.com].freeze

    # GET /api/edge-proxy
    def show
      target_url = params[:url].to_s
      return render json: { error: "URL não fornecida" }, status: :bad_request if target_url.blank?

      uri = URI.parse(target_url)
      raise URI::InvalidURIError if uri.host.blank?

      unless allowed_host?(uri.host)
        return render json: { error: "Domínio não permitido" }, status: :forbidden
      end

      proxied = Faraday.new.get(target_url) do |req|
        req.options.timeout = 15
        req.headers["User-Agent"] = request.headers["User-Agent"] || "Mozilla/5.0"
        req.headers["Accept"] = request.headers["Accept"] || "text/html,application/xhtml+xml"
      end

      # O Rails normaliza Cache-Control no commit da resposta e reduz
      # "no-store, no-cache, must-revalidate" para apenas "no-store" — efeito
      # equivalente (no-store já implica não cachear/revalidar).
      headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
      headers["X-Frame-Options"] = "ALLOWALL"
      render body: proxied.body, content_type: proxied.headers["content-type"] || "text/html"
    rescue StandardError => e
      Rails.logger.error("Edge proxy error: #{e.message}")
      render json: { error: "Falha ao carregar a página" }, status: :bad_gateway
    end

    private

    def allowed_host?(host)
      ALLOWED_DOMAINS.any? { |domain| host == domain || host.end_with?(".#{domain}") }
    end
  end
end
