import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const checkers = require("../server/domain/arcadeCheckers.cjs");
const uno = require("../server/domain/arcadeUno.cjs");

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

    // Jogador 0 (peça vermelha na base) move de (5, 0) ou (5, 2)
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
    expect(game.currentTurn).toBe(1); // Turno alternou para o Bruno
  });

  it("executa captura com salto e promove para dama ao atingir a última linha", () => {
    const players = [
      { userId: "u1", username: "ana", displayName: "Ana" },
      { userId: "u2", username: "bruno", displayName: "Bruno" },
    ];
    let game = checkers.initCheckersGame(players);

    // Configuração manual do tabuleiro para testar captura e promoção
    const customBoard = Array.from({ length: 8 }, () => Array(8).fill(null));
    // Peça vermelha do jogador 0 prestes a capturar e coroar dama
    customBoard[2][3] = { player: 0, isKing: false };
    customBoard[1][2] = { player: 1, isKing: false }; // Peça branca na mira

    game.board = customBoard;
    game.currentTurn = 0;

    const moves = checkers.getValidCheckersMoves(game.board, 0);
    expect(moves.length).toBe(1);
    expect(moves[0].isCapture).toBe(true);
    expect(moves[0].to).toEqual({ row: 0, col: 1 });

    game = checkers.applyCheckersMove(game, moves[0], "u1");
    expect(game.board[1][2]).toBeNull(); // Peça comida
    expect(game.board[0][1]).toEqual({ player: 0, isKing: true }); // Virou Dama!
    expect(game.capturedCount[0]).toBe(1);
  });

  it("garante que a rotação de perspectiva para o jogador 1 preserva a paridade das casas escuras e posiciona peças na base", () => {
    const board = checkers.createInitialCheckersBoard();

    // Testa todas as 64 casas
    for (let displayR = 0; displayR < 8; displayR++) {
      for (let displayC = 0; displayC < 8; displayC++) {
        // Mapeamento de rotação de 180°
        const boardR = 7 - displayR;
        const boardC = 7 - displayC;

        const displayIsDark = (displayR + displayC) % 2 === 1;
        const boardIsDark = (boardR + boardC) % 2 === 1;

        // Paridade matemática exata: sem distorção ou espelhamento lateral incorreto
        expect(displayIsDark).toBe(boardIsDark);

        const piece = board[boardR][boardC];
        if (displayR >= 5 && displayIsDark) {
          // As 3 linhas inferiores da tela (displayR = 5, 6, 7) contêm as peças brancas do Jogador 1
          expect(piece).toEqual({ player: 1, isKing: false });
        } else if (displayR <= 2 && displayIsDark) {
          // As 3 linhas superiores da tela (displayR = 0, 1, 2) contêm as peças vermelhas do Jogador 0
          expect(piece).toEqual({ player: 0, isKing: false });
        }
      }
    }
  });
});

describe("Arcade - Uno Multiplayer", () => {
  it("inicializa uma partida com no mínimo 3 jogadores e 7 cartas para cada", () => {
    const players = [
      { userId: "u1", username: "ana", displayName: "Ana" },
      { userId: "u2", username: "bruno", displayName: "Bruno" },
      { userId: "u3", username: "carla", displayName: "Carla" },
    ];
    const game = uno.initUnoGame(players);

    expect(game.players.length).toBe(3);
    expect(game.players[0].hand.length).toBe(7);
    expect(game.players[1].hand.length).toBe(7);
    expect(game.players[2].hand.length).toBe(7);
    expect(game.topCard).toBeDefined();
    expect(game.activeColor).toBe(game.topCard.color);
    expect(game.currentTurn).toBe(0);
    expect(game.direction).toBe(1);
    expect(game.status).toBe("PLAYING");
  });

  it("permite iniciar partida de Uno com 2 jogadores", () => {
    const players = [
      { userId: "u1", username: "ana", displayName: "Ana" },
      { userId: "u2", username: "bruno", displayName: "Bruno" },
    ];
    const game = uno.initUnoGame(players);
    expect(game.players.length).toBe(2);
    expect(game.players[0].hand.length).toBe(7);
    expect(game.players[1].hand.length).toBe(7);
    expect(game.status).toBe("PLAYING");
  });

  it("não permite iniciar partida de Uno com menos de 2 jogadores", () => {
    const players = [{ userId: "u1", username: "ana", displayName: "Ana" }];
    expect(() => uno.initUnoGame(players)).toThrow("mínimo 2 jogadores");
  });

  it("não permite iniciar partida de Uno com mais de 6 jogadores", () => {
    const players = [
      { userId: "u1", username: "ana", displayName: "Ana" },
      { userId: "u2", username: "bruno", displayName: "Bruno" },
      { userId: "u3", username: "carla", displayName: "Carla" },
      { userId: "u4", username: "diego", displayName: "Diego" },
      { userId: "u5", username: "elena", displayName: "Elena" },
      { userId: "u6", username: "fabio", displayName: "Fabio" },
      { userId: "u7", username: "gabriel", displayName: "Gabriel" },
    ];
    expect(() => uno.initUnoGame(players)).toThrow(
      "A mesa de Uno comporta no máximo 6 jogadores."
    );
  });

  it("aplica jogada de carta comum e avança o turno", () => {
    const players = [
      { userId: "u1", username: "ana", displayName: "Ana" },
      { userId: "u2", username: "bruno", displayName: "Bruno" },
      { userId: "u3", username: "carla", displayName: "Carla" },
    ];
    const game = uno.initUnoGame(players);

    // Força carta compatível na mão do jogador atual
    const matchingCard = {
      id: "test_card_1",
      color: game.activeColor,
      value: "5",
    };
    game.players[0].hand.push(matchingCard);

    const updated = uno.playUnoCard(game, "u1", matchingCard.id);
    expect(updated.topCard.id).toBe(matchingCard.id);
    expect(updated.currentTurn).toBe(1); // Foi para Bruno
  });

  it("aplica carta Inverter (Reverse) invertendo a direção", () => {
    const players = [
      { userId: "u1", username: "ana", displayName: "Ana" },
      { userId: "u2", username: "bruno", displayName: "Bruno" },
      { userId: "u3", username: "carla", displayName: "Carla" },
    ];
    const game = uno.initUnoGame(players);

    const reverseCard = {
      id: "test_rev",
      color: game.activeColor,
      value: "reverse",
    };
    game.players[0].hand.push(reverseCard);

    const updated = uno.playUnoCard(game, "u1", reverseCard.id);
    expect(updated.direction).toBe(-1);
    expect(updated.currentTurn).toBe(2); // Com direção -1, de 0 vai para Carla (índice 2)
  });

  it("permite gritar UNO e penaliza quem fica com 1 carta sem gritar", () => {
    const players = [
      { userId: "u1", username: "ana", displayName: "Ana" },
      { userId: "u2", username: "bruno", displayName: "Bruno" },
      { userId: "u3", username: "carla", displayName: "Carla" },
    ];
    const game = uno.initUnoGame(players);

    // Ana fica com 1 carta
    game.players[0].hand = [{ id: "c1", color: "red", value: "2" }];
    game.players[0].calledUno = false;

    // Bruno denuncia Ana
    const result = uno.catchUno(game, "u2", "u1");
    expect(result.penalized).toBe(true);
    expect(game.players[0].hand.length).toBe(3); // 1 original + 2 penalidades
  });
});
