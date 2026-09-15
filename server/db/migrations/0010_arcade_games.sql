-- Migration 0010: Arcade de Jogos da Turma (Damas & Uno Multiplayer)

CREATE TABLE IF NOT EXISTS arcade_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    turma_id UUID REFERENCES turmas(id) ON DELETE CASCADE,
    host_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(80) NOT NULL,
    game_type VARCHAR(20) NOT NULL, -- 'checkers' ou 'uno'
    status VARCHAR(20) NOT NULL DEFAULT 'WAITING', -- 'WAITING', 'PLAYING', 'FINISHED'
    max_players INT NOT NULL DEFAULT 2,
    winner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    game_state JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS arcade_room_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES arcade_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seat_index INT NOT NULL DEFAULT 0,
    is_ready BOOLEAN NOT NULL DEFAULT FALSE,
    score INT NOT NULL DEFAULT 0,
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_arcade_room_user UNIQUE (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS arcade_rankings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    turma_id UUID REFERENCES turmas(id) ON DELETE CASCADE,
    game_type VARCHAR(20) NOT NULL, -- 'checkers', 'uno', 'overall'
    wins_count INT NOT NULL DEFAULT 0,
    matches_played INT NOT NULL DEFAULT 0,
    total_points INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_arcade_user_turma_game UNIQUE (user_id, turma_id, game_type)
);

CREATE INDEX IF NOT EXISTS idx_arcade_rooms_turma ON arcade_rooms(turma_id);
CREATE INDEX IF NOT EXISTS idx_arcade_rooms_status ON arcade_rooms(status);
CREATE INDEX IF NOT EXISTS idx_arcade_room_players_room ON arcade_room_players(room_id);
CREATE INDEX IF NOT EXISTS idx_arcade_rankings_points ON arcade_rankings(total_points DESC);
