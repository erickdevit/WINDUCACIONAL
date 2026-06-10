module Api
  # Porta de server/routes/imagegen.cjs: status do gerador de imagens e
  # geração via proxy (Cloudflare Worker).
  class ImagegenController < ApplicationController
    include Authenticatable

    ASPECTS = {
      "1:1" => { width: 1024, height: 1024 },
      "16:9" => { width: 1280, height: 720 },
      "9:16" => { width: 720, height: 1280 },
      "4:3" => { width: 1152, height: 864 },
      "3:4" => { width: 864, height: 1152 }
    }.freeze

    # GET /api/imagegen/config
    def show_config
      render json: {
        provider: Imagegen::Generator.provider_key,
        label: Imagegen::Generator.label,
        configured: Imagegen::Generator.configured?
      }
    end

    # POST /api/imagegen/generate
    def generate
      unless Imagegen::Generator.configured?
        return render json: { error: "O gerador de imagens não está configurado no servidor." }, status: :conflict
      end

      prompt = params[:prompt].to_s.strip
      return render json: { error: "Descreva a imagem." }, status: :bad_request if prompt.blank?

      dimensions = ASPECTS.fetch(params[:aspect], ASPECTS["1:1"])
      result = Imagegen::Generator.generate(prompt: prompt, width: dimensions[:width], height: dimensions[:height])

      return render json: { error: result.error }, status: result.status if result.error

      render json: { image: result.image }
    end
  end
end
