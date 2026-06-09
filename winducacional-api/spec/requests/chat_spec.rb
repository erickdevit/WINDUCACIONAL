require "rails_helper"

RSpec.describe "Chat", type: :request do
  let(:turma) { create(:turma) }
  let(:aluno) { create(:user, turma: turma) }
  let(:colega) { create(:user, turma: turma) }
  let(:professor) { create(:user, :professor) }

  describe "GET /api/chat/turmas" do
    it "aluno vê apenas a própria turma" do
      create(:turma)
      login_as(aluno)
      get "/api/chat/turmas"
      expect(json_body[:turmas].length).to eq(1)
      expect(json_body[:turmas].first[:id]).to eq(turma.id)
    end

    it "professor vê todas as turmas ativas" do
      turma
      create(:turma)
      login_as(professor)
      get "/api/chat/turmas"
      expect(json_body[:turmas].length).to eq(2)
    end
  end

  describe "POST /api/chat/dm" do
    it "cria thread DM entre colegas da mesma turma e reutiliza a existente" do
      login_as(aluno)
      post "/api/chat/dm", params: { peerId: colega.id }, as: :json
      expect(response).to have_http_status(:ok)
      first_id = json_body[:threadId]

      post "/api/chat/dm", params: { peerId: colega.id }, as: :json
      expect(json_body[:threadId]).to eq(first_id)
    end

    it "bloqueia DM entre alunos de turmas diferentes" do
      outro = create(:user, turma: create(:turma))
      login_as(aluno)
      post "/api/chat/dm", params: { peerId: outro.id }, as: :json
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "mensagens" do
    it "envia e lista mensagens na thread do grupo" do
      login_as(aluno)
      get "/api/chat/turmas/#{turma.id}/group-thread"
      thread_id = json_body[:threadId]

      post "/api/chat/threads/#{thread_id}/messages", params: { body: "Olá, turma!" }, as: :json
      expect(response).to have_http_status(:created)
      expect(json_body[:message][:body]).to eq("Olá, turma!")

      get "/api/chat/threads/#{thread_id}/messages"
      expect(json_body[:messages].length).to eq(1)
    end

    it "rejeita mensagem vazia e mensagem longa demais" do
      login_as(aluno)
      get "/api/chat/turmas/#{turma.id}/group-thread"
      thread_id = json_body[:threadId]

      post "/api/chat/threads/#{thread_id}/messages", params: { body: "" }, as: :json
      expect(response).to have_http_status(:bad_request)

      post "/api/chat/threads/#{thread_id}/messages", params: { body: "a" * 2001 }, as: :json
      expect(response).to have_http_status(:bad_request)
    end

    it "nega acesso a thread de outra turma" do
      outra_turma = create(:turma)
      thread_id = Chat::ThreadService.ensure_group_thread(outra_turma.id)
      login_as(aluno)
      get "/api/chat/threads/#{thread_id}/messages"
      expect(response).to have_http_status(:forbidden)
    end
  end
end
