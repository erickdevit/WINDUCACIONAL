-- Migration 0011: Expandir Arcade com Dominó, Jogo da Velha e Forca

-- Atualiza comentário/documentação dos tipos de jogo aceitos na tabela arcade_rooms
-- game_type suportados: 'checkers', 'uno', 'domino', 'tictactoe', 'hangman'

COMMENT ON COLUMN arcade_rooms.game_type IS 'Tipo do jogo: checkers, uno, domino, tictactoe, hangman';
COMMENT ON COLUMN arcade_rankings.game_type IS 'Tipo do jogo ou overall: checkers, uno, domino, tictactoe, hangman, overall';
