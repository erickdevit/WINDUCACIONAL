require "rails_helper"

RSpec.describe "Imagegen", type: :request do
  let(:aluno) { create(:user) }
  let(:worker_url) { "https://dawn-block-b032.wx-f24.workers.dev/" }

  around do |example|
    original_token = ENV["IMAGEGEN_API_TOKEN"]
    original_url = ENV["IMAGEGEN_API_URL"]
    original_provider = ENV["IMAGEGEN_PROVIDER"]
    original_period = ENV["RATE_LIMIT_PERIOD_SECONDS"]
    original_generate_limit = ENV["IMAGEGEN_RATE_LIMIT_GENERATE_LIMIT"]
    example.run
  ensure
    ENV["IMAGEGEN_API_TOKEN"] = original_token
    ENV["IMAGEGEN_API_URL"] = original_url
    ENV["IMAGEGEN_PROVIDER"] = original_provider
    ENV["RATE_LIMIT_PERIOD_SECONDS"] = original_period
    ENV["IMAGEGEN_RATE_LIMIT_GENERATE_LIMIT"] = original_generate_limit
  end

  describe "GET /api/imagegen/config" do
    it "informa que o gerador não está configurado quando falta o token" do
      ENV.delete("IMAGEGEN_API_TOKEN")
      login_as(aluno)
      get "/api/imagegen/config"
      expect(response).to have_http_status(:ok)
      expect(json_body).to eq(provider: "cloudflare", label: "Gerador interno", configured: false)
    end

    it "informa que o gerador está configurado quando há token" do
      ENV["IMAGEGEN_API_TOKEN"] = "token-secreto"
      login_as(aluno)
      get "/api/imagegen/config"
      expect(response).to have_http_status(:ok)
      expect(json_body[:configured]).to be true
    end
  end

  describe "POST /api/imagegen/generate" do
    it "rejeita quando o gerador não está configurado" do
      ENV.delete("IMAGEGEN_API_TOKEN")
      login_as(aluno)
      post "/api/imagegen/generate", params: { prompt: "um gato" }, as: :json
      expect(response).to have_http_status(:conflict)
      expect(json_body[:error]).to eq("O gerador de imagens não está configurado no servidor.")
    end

    context "com gerador configurado" do
      before { ENV["IMAGEGEN_API_TOKEN"] = "token-secreto" }

      it "rejeita prompt em branco" do
        login_as(aluno)
        post "/api/imagegen/generate", params: { prompt: "  " }, as: :json
        expect(response).to have_http_status(:bad_request)
        expect(json_body[:error]).to eq("Descreva a imagem.")
      end

      it "retorna a imagem gerada em base64" do
        stub_request(:post, worker_url)
          .with(
            headers: { "Authorization" => "Bearer token-secreto" },
            body: { prompt: "um gato", width: 1024, height: 1024 }.to_json
          )
          .to_return(status: 200, body: "imagem-binaria", headers: { "Content-Type" => "image/png" })

        login_as(aluno)
        post "/api/imagegen/generate", params: { prompt: "um gato" }, as: :json
        expect(response).to have_http_status(:ok)
        expect(json_body[:image]).to eq("data:image/png;base64,#{Base64.strict_encode64('imagem-binaria')}")
      end

      it "aplica rate limit por usuário autenticado" do
        ENV["RATE_LIMIT_PERIOD_SECONDS"] = "60"
        ENV["IMAGEGEN_RATE_LIMIT_GENERATE_LIMIT"] = "1"
        stub_request(:post, worker_url)
          .to_return(status: 200, body: "img", headers: { "Content-Type" => "image/png" })

        login_as(aluno)
        post "/api/imagegen/generate", params: { prompt: "um gato" }, as: :json
        expect(response).to have_http_status(:ok)

        post "/api/imagegen/generate", params: { prompt: "outro gato" }, as: :json
        expect(response).to have_http_status(:too_many_requests)
        expect(response.headers["Retry-After"]).to eq("60")
      end

      it "usa as dimensões do aspecto solicitado" do
        stub_request(:post, worker_url)
          .with(body: { prompt: "paisagem", width: 1280, height: 720 }.to_json)
          .to_return(status: 200, body: "img", headers: { "Content-Type" => "image/png" })

        login_as(aluno)
        post "/api/imagegen/generate", params: { prompt: "paisagem", aspect: "16:9" }, as: :json
        expect(response).to have_http_status(:ok)
      end

      it "trata token inválido como erro do servidor" do
        stub_request(:post, worker_url).to_return(status: 401, body: "")

        login_as(aluno)
        post "/api/imagegen/generate", params: { prompt: "um gato" }, as: :json
        expect(response).to have_http_status(:internal_server_error)
        expect(json_body[:error]).to eq("Token de geração inválido ou ausente no servidor.")
      end

      it "trata requisição inválida do provedor como bad request" do
        stub_request(:post, worker_url).to_return(status: 400, body: "")

        login_as(aluno)
        post "/api/imagegen/generate", params: { prompt: "um gato" }, as: :json
        expect(response).to have_http_status(:bad_request)
        expect(json_body[:error]).to eq("Requisição inválida para o gerador de imagens.")
      end

      it "trata outros erros do provedor como bad gateway" do
        stub_request(:post, worker_url).to_return(status: 500, body: "")

        login_as(aluno)
        post "/api/imagegen/generate", params: { prompt: "um gato" }, as: :json
        expect(response).to have_http_status(:bad_gateway)
        expect(json_body[:error]).to eq("Falha interna ao gerar a imagem. Tente novamente.")
      end

      it "trata timeout do provedor" do
        stub_request(:post, worker_url).to_timeout

        login_as(aluno)
        post "/api/imagegen/generate", params: { prompt: "um gato" }, as: :json
        expect(response).to have_http_status(:gateway_timeout)
        expect(json_body[:error]).to eq("Tempo esgotado ao gerar a imagem. Tente novamente.")
      end
    end
  end
end
