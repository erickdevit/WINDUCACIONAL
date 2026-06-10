# Rotas do domínio typing (portadas do servidor Node).
# O SSE /api/typing/settings/events virou o TypingSettingsChannel e o
# SSE /api/typing-pvp/stream virou o TypingPvpChannel (ActionCable).
scope "/api", module: :api do
  scope "typing", controller: :typing do
    get "settings/:studentType", action: :show_settings
    put "settings/:studentType", action: :update_settings
    get "game/settings/:studentType", action: :show_game_settings
    put "game/settings/:studentType", action: :update_game_settings

    post "score", action: :create_score
    post "game/score", action: :create_game_score

    get "ranking/global", action: :ranking_global
    get "ranking/turma", action: :ranking_turma
    get "ranking/turma/:id", action: :ranking_turma_by_id
    post "ranking/turma/reset", action: :reset_turma_ranking

    get "game/ranking/global", action: :game_ranking_global
    get "game/ranking/turma", action: :game_ranking_turma
    get "game/ranking/turma/:id", action: :game_ranking_turma_by_id
    post "game/ranking/turma/reset", action: :reset_game_turma_ranking
  end

  scope "typing-pvp", controller: :typing_pvp do
    get "lobby", action: :lobby
    post "challenge", action: :challenge
    post "accept", action: :accept
    post "reject", action: :reject
    post "random", action: :random
    post "cancel-random", action: :cancel_random
    post "sync", action: :sync
    post "leave", action: :leave
    post "win", action: :win
    post "lose", action: :lose
    get "scores", action: :scores
  end
end
