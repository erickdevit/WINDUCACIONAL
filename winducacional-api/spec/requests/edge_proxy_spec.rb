require "rails_helper"

RSpec.describe "Edge Proxy", type: :request do
  let(:aluno) { create(:user) }

  describe "GET /api/edge-proxy" do
    it "exige autenticação" do
      get "/api/edge-proxy", params: { url: "https://www.google.com" }
      expect(response).to have_http_status(:unauthorized)
    end

    it "rejeita quando a URL não é informada" do
      login_as(aluno)
      get "/api/edge-proxy"
      expect(response).to have_http_status(:bad_request)
      expect(json_body[:error]).to eq("URL não fornecida")
    end

    it "rejeita domínios não permitidos" do
      login_as(aluno)
      get "/api/edge-proxy", params: { url: "https://example.com" }
      expect(response).to have_http_status(:forbidden)
      expect(json_body[:error]).to eq("Domínio não permitido")
    end

    it "rejeita tentativas de contornar a checagem de domínio com substring" do
      login_as(aluno)
      get "/api/edge-proxy", params: { url: "https://google.com.evil.com" }
      expect(response).to have_http_status(:forbidden)
    end

    it "rejeita URLs inválidas" do
      login_as(aluno)
      get "/api/edge-proxy", params: { url: "não-é-uma-url" }
      expect(response).to have_http_status(:bad_gateway)
      expect(json_body[:error]).to eq("Falha ao carregar a página")
    end

    it "faz proxy de páginas do google e remove cabeçalhos de bloqueio de iframe" do
      stub_request(:get, "https://www.google.com/search")
        .to_return(
          status: 200,
          body: "<html>conteúdo</html>",
          headers: { "Content-Type" => "text/html; charset=utf-8", "X-Frame-Options" => "DENY" }
        )

      login_as(aluno)
      get "/api/edge-proxy", params: { url: "https://www.google.com/search" }
      expect(response).to have_http_status(:ok)
      expect(response.body).to eq("<html>conteúdo</html>")
      expect(response.headers["X-Frame-Options"]).to eq("ALLOWALL")
      expect(response.headers["Cache-Control"]).to eq("no-store")
    end

    it "faz proxy de páginas do youtube" do
      stub_request(:get, "https://www.youtube.com/watch")
        .to_return(status: 200, body: "<html>video</html>", headers: { "Content-Type" => "text/html" })

      login_as(aluno)
      get "/api/edge-proxy", params: { url: "https://www.youtube.com/watch" }
      expect(response).to have_http_status(:ok)
    end

    it "retorna bad gateway quando a página de origem falha" do
      stub_request(:get, "https://www.google.com/search").to_timeout

      login_as(aluno)
      get "/api/edge-proxy", params: { url: "https://www.google.com/search" }
      expect(response).to have_http_status(:bad_gateway)
      expect(json_body[:error]).to eq("Falha ao carregar a página")
    end
  end
end
