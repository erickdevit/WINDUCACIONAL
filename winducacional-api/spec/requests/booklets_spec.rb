require "rails_helper"

RSpec.describe "Apostilas", type: :request do
  let(:professor) { create(:user, :professor) }
  let(:aluno) { create(:user, turma: create(:turma)) }
  let(:library_dir) { Dir.mktmpdir }

  before do
    module_dir = File.join(library_dir, "1 - Informática Básica")
    FileUtils.mkdir_p(module_dir)
    File.write(File.join(module_dir, "1 - Introdução.pdf"), "%PDF-1.4 teste")
    allow(Booklets::CatalogService).to receive(:library_dir).and_return(library_dir)
  end

  after { FileUtils.remove_entry(library_dir) }

  describe "GET /api/booklets/modules" do
    it "professor vê todos os módulos" do
      login_as(professor)
      get "/api/booklets/modules"
      expect(response).to have_http_status(:ok)
      expect(json_body[:modules].length).to eq(1)
      expect(json_body[:modules].first[:id]).to eq("1-informatica-basica")
      expect(json_body[:modules].first[:files].first).not_to have_key(:absolutePath)
    end

    it "aluno só vê módulos liberados" do
      login_as(aluno)
      get "/api/booklets/modules"
      expect(json_body[:modules]).to be_empty

      BookletModuleAccess.create!(module_id: "1-informatica-basica", enabled: true)
      get "/api/booklets/modules"
      expect(json_body[:modules].length).to eq(1)
    end
  end

  describe "PUT /api/booklets/modules/access" do
    it "professor libera módulo globalmente" do
      login_as(professor)
      put "/api/booklets/modules/access", params: { enabledModuleIds: ["1-informatica-basica"] }, as: :json
      expect(response).to have_http_status(:ok)
      expect(BookletModuleAccess.find("1-informatica-basica").enabled).to be(true)
    end

    it "rejeita módulo desconhecido" do
      login_as(professor)
      put "/api/booklets/modules/access", params: { enabledModuleIds: ["inexistente"] }, as: :json
      expect(response).to have_http_status(:bad_request)
    end
  end

  describe "acesso por aluno" do
    it "concede módulos específicos a alunos selecionados" do
      login_as(professor)
      put "/api/booklets/student-access",
        params: { userIds: [aluno.id], moduleIds: ["1-informatica-basica"], turmaId: aluno.turma_id },
        as: :json
      expect(response).to have_http_status(:ok)
      student = json_body[:students].find { |s| s[:id] == aluno.id }
      expect(student[:moduleIds]).to eq(["1-informatica-basica"])
    end
  end

  describe "GET pdf" do
    it "bloqueia aluno sem liberação e entrega após liberar" do
      login_as(aluno)
      get "/api/booklets/modules/1-informatica-basica/files/1-introducao-pdf/pdf"
      expect(response).to have_http_status(:forbidden)

      BookletModuleAccess.create!(module_id: "1-informatica-basica", enabled: true)
      get "/api/booklets/modules/1-informatica-basica/files/1-introducao-pdf/pdf"
      expect(response).to have_http_status(:ok)
      expect(response.headers["Content-Type"]).to eq("application/pdf")
    end
  end
end
