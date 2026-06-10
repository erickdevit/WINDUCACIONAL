require "rails_helper"

RSpec.describe "File System", type: :request do
  let(:turma) { create(:turma) }
  let(:professor) { create(:user, :professor) }
  let(:aluno) { create(:user, turma: turma) }
  let(:data_dir) { Dir.mktmpdir }

  before do
    allow(Filesystem::UserDiskService).to receive(:data_dir).and_return(data_dir)
  end

  after { FileUtils.remove_entry(data_dir) }

  describe "GET /api/fs/tree" do
    it "retorna Public e o disco de todos os usuários ativos para o professor" do
      aluno
      login_as(professor)
      get "/api/fs/tree"
      expect(response).to have_http_status(:ok)

      users = json_body[:tree][:"C:"][:data][:Users][:data]
      expect(users.keys).to contain_exactly(:Public, professor.username.to_sym, aluno.username.to_sym)
      expect(users[aluno.username.to_sym][:data]).to include(:Desktop)
    end

    it "retorna apenas Public e o próprio disco para o aluno" do
      login_as(aluno)
      get "/api/fs/tree"
      expect(response).to have_http_status(:ok)

      users = json_body[:tree][:"C:"][:data][:Users][:data]
      expect(users.keys).to contain_exactly(:Public, aluno.username.to_sym)
      expect(users[aluno.username.to_sym][:info][:spid]).to eq("%user%")
    end

    it "exige autenticação" do
      get "/api/fs/tree"
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "PUT /api/fs/tree" do
    let(:novo_arquivo) do
      { "type" => "file", "data" => "conteudo novo" }
    end

    it "permite que o professor atualize o disco de qualquer usuário visível" do
      login_as(professor)
      tree = {
        "C:" => { "data" => { "Users" => { "data" => {
          aluno.username => { "data" => { "Desktop" => { "data" => { "novo.txt" => novo_arquivo } } } }
        } } } }
      }

      put "/api/fs/tree", params: { tree: tree }, as: :json
      expect(response).to have_http_status(:no_content)

      home = Filesystem::UserDiskService.read_home(aluno, professor.username)
      expect(home[:data]["Desktop"]["data"]["novo.txt"]).to eq(novo_arquivo)
    end

    it "permite que o aluno atualize apenas o próprio disco" do
      login_as(aluno)
      tree = {
        "C:" => { "data" => { "Users" => { "data" => {
          aluno.username => { "data" => { "Desktop" => { "data" => { "novo.txt" => novo_arquivo } } } }
        } } } }
      }

      put "/api/fs/tree", params: { tree: tree }, as: :json
      expect(response).to have_http_status(:no_content)

      home = Filesystem::UserDiskService.read_home(aluno, aluno.username)
      expect(home[:data]["Desktop"]["data"]["novo.txt"]).to eq(novo_arquivo)
    end

    it "nega quando o disco do próprio aluno está ausente da árvore" do
      login_as(aluno)
      tree = { "C:" => { "data" => { "Users" => { "data" => { aluno.username => {} } } } } }

      put "/api/fs/tree", params: { tree: tree }, as: :json
      expect(response).to have_http_status(:forbidden)
      expect(json_body[:error]).to eq("Disco do usuário ausente.")
    end

    it "rejeita árvore malformada" do
      login_as(professor)
      put "/api/fs/tree", params: { tree: { foo: "bar" } }, as: :json
      expect(response).to have_http_status(:bad_request)
      expect(json_body[:error]).to eq("Árvore de arquivos inválida.")
    end
  end

  describe "GET /api/user/config" do
    it "retorna objeto vazio quando não há configuração salva" do
      login_as(aluno)
      get "/api/user/config"
      expect(response).to have_http_status(:ok)
      expect(json_body[:config]).to eq({})
    end

    it "retorna a configuração salva" do
      Filesystem::UserDiskService.save_config(aluno, { theme: "dark" })
      login_as(aluno)
      get "/api/user/config"
      expect(response).to have_http_status(:ok)
      expect(json_body[:config]).to eq(theme: "dark")
    end
  end

  describe "PUT /api/user/config" do
    it "salva a configuração do usuário" do
      login_as(aluno)
      put "/api/user/config", params: { config: { theme: "dark" } }, as: :json
      expect(response).to have_http_status(:no_content)

      expect(Filesystem::UserDiskService.load_config(aluno.storage_key)).to eq("theme" => "dark")
    end

    it "rejeita configuração que não seja um objeto" do
      login_as(aluno)
      put "/api/user/config", params: { config: "invalido" }, as: :json
      expect(response).to have_http_status(:bad_request)
      expect(json_body[:error]).to eq("Configuração inválida.")
    end
  end
end
