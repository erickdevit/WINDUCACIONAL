module Imagegen
  # Porta de server/routes/imagegen.cjs: proxy para o provedor de geração de
  # imagens (Cloudflare Worker). O token IMAGEGEN_API_TOKEN nunca é exposto
  # ao cliente.
  class Generator
    DEFAULT_CLOUDFLARE_URL = "https://dawn-block-b032.wx-f24.workers.dev/"
    REQUEST_TIMEOUT = 90

    Result = Struct.new(:image, :error, :status, keyword_init: true)

    def self.provider_key
      ENV.fetch("IMAGEGEN_PROVIDER", "cloudflare")
    end

    def self.label
      provider_key == "cloudflare" ? "Gerador interno" : provider_key
    end

    def self.configured?
      provider_key == "cloudflare" && ENV["IMAGEGEN_API_TOKEN"].present?
    end

    def self.generate(prompt:, width:, height:)
      url = ENV.fetch("IMAGEGEN_API_URL", DEFAULT_CLOUDFLARE_URL)

      response = Faraday.new.post(url) do |req|
        req.options.timeout = REQUEST_TIMEOUT
        req.headers["Authorization"] = "Bearer #{ENV['IMAGEGEN_API_TOKEN']}"
        req.headers["Content-Type"] = "application/json"
        req.body = { prompt: prompt, width: width, height: height }.to_json
      end

      result_for(response)
    rescue Faraday::Error
      Result.new(error: "Tempo esgotado ao gerar a imagem. Tente novamente.", status: :gateway_timeout)
    end

    def self.result_for(response)
      return error_result(response) unless response.success?

      body = response.body
      return Result.new(error: "O gerador retornou vazio.", status: :bad_gateway) if body.blank?

      content_type = response.headers["content-type"] || "image/png"
      Result.new(image: "data:#{content_type};base64,#{Base64.strict_encode64(body)}")
    end
    private_class_method :result_for

    def self.error_result(response)
      case response.status
      when 401
        Result.new(error: "Token de geração inválido ou ausente no servidor.", status: :internal_server_error)
      when 400
        Result.new(error: "Requisição inválida para o gerador de imagens.", status: :bad_request)
      else
        Result.new(error: "Falha interna ao gerar a imagem. Tente novamente.", status: :bad_gateway)
      end
    end
    private_class_method :error_result
  end
end
