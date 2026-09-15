/**
 * Regras do Jogo de Damas (Checkers / Damas Brasileiras)
 * Tabuleiro 8x8, peças sobre casas escuras ((row + col) % 2 === 1).
 */

const createInitialCheckersBoard = () => {
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) {
        if (r < 3) {
          // Jogador 1 (Brancas / Peças claras no topo descendo)
          board[r][c] = { player: 1, isKing: false };
        } else if (r > 4) {
          // Jogador 0 (Vermelhas / Peças escuras na base subindo)
          board[r][c] = { player: 0, isKing: false };
        }
      }
    }
  }

  return board;
};

const isValidCoord = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

/**
 * Obtém todas as capturas possíveis para uma peça específica
 */
const getCapturesForPiece = (board, r, c) => {
  const piece = board[r]?.[c];
  if (!piece) return [];

  const captures = [];
  const opponent = 1 - piece.player;
  const directions = [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ];

  if (!piece.isKing) {
    // Peça simples: pode capturar para frente e para trás pulando peça adversária adjacente
    for (const [dr, dc] of directions) {
      const midR = r + dr;
      const midC = c + dc;
      const landR = r + dr * 2;
      const landC = c + dc * 2;

      if (
        isValidCoord(landR, landC) &&
        board[midR]?.[midC]?.player === opponent &&
        board[landR]?.[landC] === null
      ) {
        captures.push({
          from: { row: r, col: c },
          to: { row: landR, col: landC },
          captured: { row: midR, col: midC },
          isCapture: true,
        });
      }
    }
  } else {
    // Dama (Damas Brasileiras - Dama voadora em diagonais livres)
    for (const [dr, dc] of directions) {
      let step = 1;
      let foundOpponent = null;

      while (isValidCoord(r + dr * step, c + dc * step)) {
        const curR = r + dr * step;
        const curC = c + dc * step;
        const curPiece = board[curR][curC];

        if (curPiece !== null) {
          if (curPiece.player === piece.player) {
            // Peça da mesma cor bloqueia
            break;
          } else {
            // Adversário encontrado
            if (foundOpponent) {
              // Dois adversários seguidos bloqueiam
              break;
            }
            foundOpponent = { row: curR, col: curC };
          }
        } else if (foundOpponent) {
          // Casa livre após adversário: captura válida
          captures.push({
            from: { row: r, col: c },
            to: { row: curR, col: curC },
            captured: { ...foundOpponent },
            isCapture: true,
          });
        }
        step++;
      }
    }
  }

  return captures;
};

/**
 * Obtém todos os passos normais (sem captura) para uma peça
 */
const getSimpleMovesForPiece = (board, r, c) => {
  const piece = board[r]?.[c];
  if (!piece) return [];

  const moves = [];

  if (!piece.isKing) {
    // Peça simples move apenas para frente
    const forwardDr = piece.player === 0 ? -1 : 1;
    for (const dc of [-1, 1]) {
      const landR = r + forwardDr;
      const landC = c + dc;
      if (isValidCoord(landR, landC) && board[landR][landC] === null) {
        moves.push({
          from: { row: r, col: c },
          to: { row: landR, col: landC },
          isCapture: false,
        });
      }
    }
  } else {
    // Dama move qualquer número de casas livres
    const directions = [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ];
    for (const [dr, dc] of directions) {
      let step = 1;
      while (isValidCoord(r + dr * step, c + dc * step)) {
        const landR = r + dr * step;
        const landC = c + dc * step;
        if (board[landR][landC] !== null) break;
        moves.push({
          from: { row: r, col: c },
          to: { row: landR, col: landC },
          isCapture: false,
        });
        step++;
      }
    }
  }

  return moves;
};

/**
 * Retorna todos os movimentos válidos para o jogador da vez.
 * Se activeJumpFrom estiver predefinido (multi-salto contínuo), retorna apenas capturas dessa peça.
 * Prioridade de captura: se houver alguma captura disponível, apenas capturas são válidas.
 */
const getValidCheckersMoves = (board, player, activeJumpFrom = null) => {
  if (activeJumpFrom) {
    return getCapturesForPiece(board, activeJumpFrom.row, activeJumpFrom.col);
  }

  const allCaptures = [];
  const allSimpleMoves = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c]?.player === player) {
        const captures = getCapturesForPiece(board, r, c);
        if (captures.length > 0) {
          allCaptures.push(...captures);
        } else {
          allSimpleMoves.push(...getSimpleMovesForPiece(board, r, c));
        }
      }
    }
  }

  // Se houver qualquer captura no tabuleiro, a regra do jogo exige capturar
  if (allCaptures.length > 0) {
    return allCaptures;
  }

  return allSimpleMoves;
};

/**
 * Inicializa o estado de uma nova partida de Damas
 */
const initCheckersGame = (players) => {
  return {
    board: createInitialCheckersBoard(),
    currentTurn: 0, // 0 = jogador 0 (vermelhas), 1 = jogador 1 (brancas)
    activeJumpFrom: null,
    capturedCount: { 0: 0, 1: 0 },
    winner: null,
    status: "PLAYING", // 'PLAYING', 'FINISHED'
    history: [],
    players: players.map((p, index) => ({
      userId: p.userId,
      username: p.username,
      displayName: p.displayName,
      seatIndex: index,
      color: index === 0 ? "red" : "white",
    })),
  };
};

/**
 * Aplica um movimento no jogo de Damas
 */
const applyCheckersMove = (state, move, userId) => {
  if (state.status !== "PLAYING") {
    throw new Error("A partida já foi finalizada.");
  }

  const playerObj = state.players[state.currentTurn];
  if (!playerObj || playerObj.userId !== userId) {
    throw new Error("Não é a sua vez de jogar.");
  }

  const validMoves = getValidCheckersMoves(
    state.board,
    state.currentTurn,
    state.activeJumpFrom
  );

  const matchedMove = validMoves.find(
    (m) =>
      m.from.row === move.from.row &&
      m.from.col === move.from.col &&
      m.to.row === move.to.row &&
      m.to.col === move.to.col
  );

  if (!matchedMove) {
    throw new Error("Movimento inválido ou ilegal de acordo com as regras.");
  }

  // Clona o tabuleiro para mutação limpa
  const newBoard = state.board.map((row) => [...row]);
  const movingPiece = {
    ...newBoard[matchedMove.from.row][matchedMove.from.col],
  };

  // Remove da casa de origem
  newBoard[matchedMove.from.row][matchedMove.from.col] = null;

  // Se houve captura, remove a peça comida
  let newCapturedCount = { ...state.capturedCount };
  if (matchedMove.isCapture && matchedMove.captured) {
    newBoard[matchedMove.captured.row][matchedMove.captured.col] = null;
    newCapturedCount[state.currentTurn] =
      (newCapturedCount[state.currentTurn] || 0) + 1;
  }

  // Promoção para Dama
  let promotedThisTurn = false;
  if (!movingPiece.isKing) {
    if (state.currentTurn === 0 && matchedMove.to.row === 0) {
      movingPiece.isKing = true;
      promotedThisTurn = true;
    } else if (state.currentTurn === 1 && matchedMove.to.row === 7) {
      movingPiece.isKing = true;
      promotedThisTurn = true;
    }
  }

  // Posiciona a peça na casa de destino
  newBoard[matchedMove.to.row][matchedMove.to.col] = movingPiece;

  // Verifica multi-salto
  let nextActiveJump = null;
  if (matchedMove.isCapture && !promotedThisTurn) {
    const consecutiveCaptures = getCapturesForPiece(
      newBoard,
      matchedMove.to.row,
      matchedMove.to.col
    );
    if (consecutiveCaptures.length > 0) {
      nextActiveJump = { row: matchedMove.to.row, col: matchedMove.to.col };
    }
  }

  let nextTurn = state.currentTurn;
  let winner = null;
  let status = "PLAYING";

  if (!nextActiveJump) {
    // Fim da jogada do jogador atual: alterna o turno
    nextTurn = 1 - state.currentTurn;

    // Checa se o próximo jogador tem movimentos válidos ou peças
    const opponentMoves = getValidCheckersMoves(newBoard, nextTurn, null);
    if (opponentMoves.length === 0) {
      winner = playerObj.userId;
      status = "FINISHED";
    }
  }

  return {
    ...state,
    board: newBoard,
    currentTurn: nextTurn,
    activeJumpFrom: nextActiveJump,
    capturedCount: newCapturedCount,
    winner,
    status,
    history: [
      ...state.history,
      {
        player: state.currentTurn,
        from: matchedMove.from,
        to: matchedMove.to,
        isCapture: matchedMove.isCapture,
        timestamp: new Date().toISOString(),
      },
    ],
  };
};

module.exports = {
  createInitialCheckersBoard,
  getValidCheckersMoves,
  initCheckersGame,
  applyCheckersMove,
};
