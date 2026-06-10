require "rails_helper"

RSpec.describe "Duelos de digitação (PVP)", type: :request do
  let(:turma) { create(:turma, student_type: "normal") }
  let(:aluno_a) { create(:user, turma: turma) }
  let(:aluno_b) { create(:user, turma: turma) }

  before do
    OnlineUserTracker.add(aluno_a)
    OnlineUserTracker.add(aluno_b)
  end

  describe "GET /api/typing-pvp/lobby" do
    it "lista colegas online sem partida em andamento" do
      login_as(aluno_a)
      get "/api/typing-pvp/lobby"
      expect(response).to have_http_status(:ok)
      expect(json_body[:players].map { |player| player[:id] }).to eq([ aluno_b.id ])
    end
  end

  describe "POST /api/typing-pvp/challenge" do
    it "notifica o alvo via ActionCable" do
      login_as(aluno_a)
      expect {
        post "/api/typing-pvp/challenge", params: { targetId: aluno_b.id }, as: :json
      }.to have_broadcasted_to("typing_pvp:#{aluno_b.id}").with(hash_including("type" => "challenge_received"))
      expect(response).to have_http_status(:ok)
    end

    it "rejeita alvo indisponível" do
      login_as(aluno_a)
      post "/api/typing-pvp/challenge", params: { targetId: SecureRandom.uuid }, as: :json
      expect(response).to have_http_status(:bad_request)
    end
  end

  describe "POST /api/typing-pvp/accept" do
    it "cria a sala e avisa os dois jogadores" do
      login_as(aluno_a)
      expect {
        post "/api/typing-pvp/accept", params: { challengerId: aluno_b.id }, as: :json
      }.to have_broadcasted_to("typing_pvp:#{aluno_b.id}").with(hash_including("type" => "match_started"))
      expect(response).to have_http_status(:ok)
      expect(json_body[:roomId]).to be_present
    end

    it "rejeita desafiante indisponível" do
      login_as(aluno_a)
      post "/api/typing-pvp/accept", params: { challengerId: SecureRandom.uuid }, as: :json
      expect(response).to have_http_status(:bad_request)
    end
  end

  describe "POST /api/typing-pvp/reject" do
    it "avisa o desafiante" do
      login_as(aluno_a)
      expect {
        post "/api/typing-pvp/reject", params: { challengerId: aluno_b.id }, as: :json
      }.to have_broadcasted_to("typing_pvp:#{aluno_b.id}").with(hash_including("type" => "challenge_rejected"))
      expect(response).to have_http_status(:ok)
    end
  end

  describe "POST /api/typing-pvp/random" do
    it "aguarda e depois casa com outro jogador" do
      login_as(aluno_a)
      post "/api/typing-pvp/random", as: :json
      expect(json_body[:status]).to eq("waiting")

      login_as(aluno_b)
      expect {
        post "/api/typing-pvp/random", as: :json
      }.to have_broadcasted_to("typing_pvp:#{aluno_a.id}").with(hash_including("type" => "match_started"))
      expect(json_body[:status]).to eq("matched")
      expect(json_body[:roomId]).to be_present
    end
  end

  describe "fluxo de partida (sync, win, lose, leave)" do
    it "sincroniza estado e finaliza com vitória" do
      login_as(aluno_a)
      post "/api/typing-pvp/accept", params: { challengerId: aluno_b.id }, as: :json
      expect(response).to have_http_status(:ok)

      expect {
        post "/api/typing-pvp/sync", params: { state: { wordsCompleted: 5 } }, as: :json
      }.to have_broadcasted_to("typing_pvp:#{aluno_b.id}").with(hash_including("type" => "sync"))

      expect {
        post "/api/typing-pvp/win", params: { winnerScore: 10, loserScore: 3 }, as: :json
      }.to have_broadcasted_to("typing_pvp:#{aluno_b.id}").with(hash_including("type" => "match_finished"))
      expect(response).to have_http_status(:ok)
      expect(json_body[:match][:winnerId]).to eq(aluno_a.id)
      expect(json_body[:match][:loserId]).to eq(aluno_b.id)
      expect(json_body[:match][:winnerScore]).to eq(10)
      expect(json_body[:match][:loserScore]).to eq(3)

      match = TypingPvpMatch.last
      expect(match.winner_id).to eq(aluno_a.id)
      expect(match.loser_id).to eq(aluno_b.id)
      expect(match.turma_id).to eq(turma.id)
    end

    it "retorna 400 quando não está em uma partida" do
      login_as(aluno_a)
      post "/api/typing-pvp/sync", params: { state: {} }, as: :json
      expect(response).to have_http_status(:bad_request)

      post "/api/typing-pvp/win", params: { winnerScore: 1, loserScore: 0 }, as: :json
      expect(response).to have_http_status(:bad_request)
    end

    it "leave avisa o adversário e libera a sala" do
      login_as(aluno_a)
      post "/api/typing-pvp/accept", params: { challengerId: aluno_b.id }, as: :json

      expect {
        post "/api/typing-pvp/leave", as: :json
      }.to have_broadcasted_to("typing_pvp:#{aluno_b.id}").with(hash_including("type" => "opponent_disconnected"))
      expect(response).to have_http_status(:ok)
    end
  end

  describe "GET /api/typing-pvp/scores" do
    it "lista as partidas da turma" do
      TypingPvpMatch.create!(winner: aluno_a, loser: aluno_b, winner_score: 10, loser_score: 5, turma: turma)
      login_as(aluno_a)
      get "/api/typing-pvp/scores"
      expect(response).to have_http_status(:ok)
      expect(json_body[:matches].length).to eq(1)
    end

    it "retorna lista vazia sem turma no escopo global sem partidas" do
      login_as(aluno_a)
      get "/api/typing-pvp/scores", params: { scope: "global" }
      expect(response).to have_http_status(:ok)
      expect(json_body[:matches]).to eq([])
    end
  end
end
