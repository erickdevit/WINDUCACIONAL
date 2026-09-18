import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const checkers = require("../server/domain/arcadeCheckers.cjs");
const uno = require("../server/domain/arcadeUno.cjs");
const domino = require("../server/domain/arcadeDomino.cjs");
const tictactoe = require("../server/domain/arcadeTicTacToe.cjs");
const hangman = require("../server/domain/arcadeHangman.cjs");

describe("Arcade - Damas (Checkers)", () => {
  it("inicializa o tabuleiro 8x8 com 12 peças vermelhas e 12 brancas nas casas escuras", () => {
    const board = checkers.createInitialCheckersBoard();
    expect(board.length).toBe(8);
    expect(board[0].length).toBe(8);

    let redCount = 0;
    let whiteCount = 0;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) {
          if (r < 3) {
            expect(board[r][c]).toEqual({ player: 1, isKing: false });
            whiteCount++;
          } else if (r > 4) {
            expect(board[r][c]).toEqual({ player: 0, isKing: false });
            redCount++;
          } else {
            expect(board[r][c]).toBeNull();
          }
        } else {
          expect(board[r][c]).toBeNull();
        }
      }
    }

    expect(redCount).toBe(12);
    expect(whiteCount).toBe(12);
  });

  it("permite movimentos simples diagonais para frente", () => {
    const players = [
      { userId: "u1", username: "ana", displayName: "Ana" },
      { userId: "u2", username: "bruno", displayName: "Bruno" },
    ];
    let game = checkers.initCheckersGame(players);
    expect(game.currentTurn).toBe(0);

    const validMoves = checkers.getValidCheckersMoves(game.board, 0);
    expect(validMoves.length).toBeGreaterThan(0);
    const chosenMove = validMoves.find(
      (m) => m.from.row === 5 && m.from.col === 0
    );
    expect(chosenMove).toBeDefined();
    expect(chosenMove.to).toEqual({ row: 4, col: 1 });

    game = checkers.applyCheckersMove(game, chosenMove, "u1");
    expect(game.board[5][0]).toBeNull();
    expect(game.board[4][1]).toEqual({ player: 0, isKing: false });
    expect(game.currentTurn).toBe(1);
  });

  it("executa captura com salto e promove para dama ao atingir a última linha", () => {
    const players = [
      { userId: "u1", username: "ana", displayName: "Ana" },
      { userId: "u2", username: "bruno", displayName: "Bruno" },
    ];
    let game = checkers.initCheckersGame(players);

    const customBoard = Array.from({ length: 8 }, () => Array(8).fill(null));
    customBoard[2][3] = { player: 0, isKing: false };
    customBoard[1][2] = { player: 1, isKing: false };

    game.board = customBoard;
    game.currentTurn = 0;

    const moves = checkers.getValidCheckersMoves(game.board, 0);
    expect(moves.length).toBe(1);
    expect(moves[0].isCapture).toBe(true);
    expect(moves[0].to).toEqual({ row: 0, col: 1 });

    game = checkers.applyCheckersMove(game, moves[0], "u1");
    expect(game.board[1][2]).toBeNull();
    expect(game.board[0][1]).toEqual({ player: 0, isKing: true });
    expect(game.capturedCount[0]).toBe(1);
  });
});

describe("Arcade - Uno Multiplayer", () => {
  it("inicializa uma partida com 7 cartas por jogador e valida limites de jogadores", () => {
    const players = [
      { userId: "u1", username: "ana", displayName: "Ana" },
      { userId: "u2", username: "bruno", displayName: "Bruno" },
      { userId: "u3", username: "carla", displayName: "Carla" },
    ];
    const game = uno.initUnoGame(players);

    expect(game.players.length).toBe(3);
    expect(game.players[0].hand.length).toBe(7);
    expect(game.topCard).toBeDefined();
    expect(game.status).toBe("PLAYING");
  });

  it("aplica jogada de carta e avança o turno", () => {
    const players = [
      { userId: "u1", username: "ana", displayName: "Ana" },
      { userId: "u2", username: "bruno", displayName: "Bruno" },
    ];
    const game = uno.initUnoGame(players);

    const matchingCard = {
      id: "test_card_1",
      color: game.activeColor,
      value: "5",
    };
    game.players[0].hand.push(matchingCard);

    const updated = uno.playUnoCard(game, "u1", matchingCard.id);
    expect(updated.topCard.id).toBe(matchingCard.id);
    expect(updated.currentTurn).toBe(1);
  });
});

describe("Arcade - Dominó", () => {
  it("inicializa a partida de Dominó com 7 pedras por jogador e determina o jogador inicial", () => {
    const players = [
      { userId: "u1", username: "ana", displayName: "Ana" },
      { userId: "u2", username: "bruno", displayName: "Bruno" },
      { userId: "u3", username: "carla", displayName: "Carla" },
    ];
    const game = domino.initDominoGame(players);

    expect(game.players.length).toBe(3);
    expect(game.players[0].hand.length).toBe(7);
    expect(game.players[1].hand.length).toBe(7);
    expect(game.players[2].hand.length).toBe(7);
    expect(game.boneyard.length).toBe(7); // 28 total - 21 distribuídas
    expect(game.status).toBe("PLAYING");
    expect(game.currentTurn).toBeGreaterThanOrEqual(0);
    expect(game.currentTurn).toBeLessThan(3);
  });

  it("permite jogar a primeira pedra na mesa vazia e atualiza as pontas", () => {
    const players = [
      { userId: "u1", username: "ana", displayName: "Ana" },
      { userId: "u2", username: "bruno", displayName: "Bruno" },
    ];
    const game = domino.initDominoGame(players);
    game.currentTurn = 0;

    const tileToPlay = game.players[0].hand[0];
    const updated = domino.playDominoTile(game, "u1", tileToPlay.id);

    expect(updated.board.length).toBe(1);
    expect(updated.leftEnd).toBe(tileToPlay.left);
    expect(updated.rightEnd).toBe(tileToPlay.right);
    expect(updated.players[0].hand.length).toBe(6);
    expect(updated.currentTurn).toBe(1);
  });

  it("finaliza a partida quando um jogador bate (acabam suas pedras)", () => {
    const players = [
      { userId: "u1", username: "ana", displayName: "Ana" },
      { userId: "u2", username: "bruno", displayName: "Bruno" },
    ];
    const game = domino.initDominoGame(players);
    game.currentTurn = 0;
    game.board = [{ tile: { id: "t0", left: 6, right: 6, isDouble: true }, flipped: false }];
    game.leftEnd = 6;
    game.rightEnd = 6;
    game.players[0].hand = [{ id: "win_tile", left: 6, right: 3, isDouble: false }];

    const updated = domino.playDominoTile(game, "u1", "win_tile", "right");
    expect(updated.status).toBe("FINISHED");
    expect(updated.winner).toBe("u1");
  });
});

describe("Arcade - Jogo da Velha (Tic-Tac-Toe)", () => {
  it("inicializa o tabuleiro 3x3 com símbolos X e O", () => {
    const players = [
      { userId: "u1", username: "ana", displayName: "Ana" },
      { userId: "u2", username: "bruno", displayName: "Bruno" },
    ];
    const game = tictactoe.initTicTacToeGame(players);

    expect(game.players[0].symbol).toBe("X");
    expect(game.players[1].symbol).toBe("O");
    expect(game.board.length).toBe(9);
    expect(game.board.every((cell) => cell === null)).toBe(true);
    expect(game.currentTurn).toBe(0);
  });

  it("registra o movimento e detecta vitória de X", () => {
    const players = [
      { userId: "u1", username: "ana", displayName: "Ana" },
      { userId: "u2", username: "bruno", displayName: "Bruno" },
    ];
    let game = tictactoe.initTicTacToeGame(players);

    // X: 0, O: 3, X: 1, O: 4, X: 2 -> X vence na linha 0,1,2
    game = tictactoe.makeTicTacToeMove(game, "u1", 0);
    game = tictactoe.makeTicTacToeMove(game, "u2", 3);
    game = tictactoe.makeTicTacToeMove(game, "u1", 1);
    game = tictactoe.makeTicTacToeMove(game, "u2", 4);
    game = tictactoe.makeTicTacToeMove(game, "u1", 2);

    expect(game.status).toBe("FINISHED");
    expect(game.winner).toBe("u1");
    expect(game.winningLine).toEqual([0, 1, 2]);
  });
});

describe("Arcade - Jogo da Forca", () => {
  it("inicializa a partida de forca com palavra educativa, categoria e dica", () => {
    const players = [
      { userId: "u1", username: "ana", displayName: "Ana" },
      { userId: "u2", username: "bruno", displayName: "Bruno" },
    ];
    const game = hangman.initHangmanGame(players);

    expect(game.secretWord).toBeDefined();
    expect(game.category).toBeDefined();
    expect(game.hint).toBeDefined();
    expect(game.maxWrongGuesses).toBe(6);
    expect(game.wrongGuesses).toBe(0);
    expect(game.status).toBe("PLAYING");
  });

  it("revela letra correta e consome erros ao errar a letra", () => {
    const players = [
      { userId: "u1", username: "ana", displayName: "Ana" },
      { userId: "u2", username: "bruno", displayName: "Bruno" },
    ];
    let game = hangman.initHangmanGame(players);
    game.secretWord = "ESCOLA";
    game.displayWord = "ESCOLA";

    // Ana acerta a letra 'E'
    game = hangman.guessHangmanLetter(game, "u1", "E");
    expect(game.guessedLetters).toContain("E");
    expect(game.wrongGuesses).toBe(0);
    expect(game.currentTurn).toBe(0); // Mantém turno no acerto

    // Ana erra a letra 'Z'
    game = hangman.guessHangmanLetter(game, "u1", "Z");
    expect(game.wrongGuesses).toBe(1);
    expect(game.currentTurn).toBe(1); // Passa o turno para Bruno
  });
});
