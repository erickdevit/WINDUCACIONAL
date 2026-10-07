-- Encerra salas ativas de Dominó sem apagar as salas ou rankings históricos.
UPDATE arcade_rooms
SET status = 'FINISHED',
    winner_user_id = NULL,
    game_state = '{}'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE game_type = 'domino'
  AND status IN ('WAITING', 'PLAYING');

COMMENT ON COLUMN arcade_rooms.game_type IS
  'Tipos disponíveis: checkers, uno, tictactoe, hangman; domino foi descontinuado.';

COMMENT ON COLUMN arcade_rankings.game_type IS
  'Tipos disponíveis: checkers, uno, tictactoe, hangman, overall; rankings históricos de domino são mantidos.';
