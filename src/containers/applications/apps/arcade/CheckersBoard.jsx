import React, { useState, useEffect } from "react";

export function CheckersBoard({
  gameState,
  currentUserId,
  currentUsername,
  onMove,
  onResign,
}) {
  const [selectedPos, setSelectedPos] = useState(null);

  if (!gameState || !gameState.board) {
    return <div className="p-4 text-center">Carregando tabuleiro...</div>;
  }

  const {
    board,
    currentTurn,
    players = [],
    activeJumpFrom,
    capturedCount,
    winner,
    status,
  } = gameState;

  const playerObj = players[currentTurn];
  const isMyTurn =
    (currentUserId && playerObj?.userId === currentUserId) ||
    (currentUsername && playerObj?.username === currentUsername);

  const myPlayerIndex = players.findIndex(
    (p) =>
      (currentUserId && p.userId === currentUserId) ||
      (currentUsername && p.username === currentUsername)
  );

  // Se o usuário autenticado for o Jogador 1 (Brancas), rotaciona o tabuleiro 180°
  // para que as suas próprias peças sempre iniciem na base (embaixo) e se movam para cima.
  // Para o Jogador 0 (Vermelhas) ou espectador/professor, a orientação padrão já inicia embaixo.
  const isFlipped = myPlayerIndex === 1;

  // Seleção automática ao haver salto obrigatório contínuo
  useEffect(() => {
    if (activeJumpFrom && isMyTurn) {
      setSelectedPos(activeJumpFrom);
    }
  }, [activeJumpFrom, isMyTurn]);

  // Calcula movimentos válidos para a peça selecionada em coordenadas canônicas
  // Em damas brasileiras: peças simples movem para frente; capturas podem ser para frente e para trás
  const getMovesForSquare = (r, c) => {
    const piece = board[r]?.[c];
    if (!piece || piece.player !== myPlayerIndex) return [];

    const moves = [];
    const directions = [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ];

    // 1. Capturas
    if (!piece.isKing) {
      for (const [dr, dc] of directions) {
        const midR = r + dr;
        const midC = c + dc;
        const landR = r + dr * 2;
        const landC = c + dc * 2;

        if (
          landR >= 0 &&
          landR < 8 &&
          landC >= 0 &&
          landC < 8 &&
          board[midR]?.[midC] &&
          board[midR][midC].player !== piece.player &&
          board[landR]?.[landC] === null
        ) {
          moves.push({
            from: { row: r, col: c },
            to: { row: landR, col: landC },
            isCapture: true,
          });
        }
      }
    } else {
      // Dama voadora
      for (const [dr, dc] of directions) {
        let step = 1;
        let foundOpponent = null;
        while (
          r + dr * step >= 0 &&
          r + dr * step < 8 &&
          c + dc * step >= 0 &&
          c + dc * step < 8
        ) {
          const curR = r + dr * step;
          const curC = c + dc * step;
          const curPiece = board[curR][curC];
          if (curPiece !== null) {
            if (curPiece.player === piece.player) break;
            if (foundOpponent) break;
            foundOpponent = { row: curR, col: curC };
          } else if (foundOpponent) {
            moves.push({
              from: { row: r, col: c },
              to: { row: curR, col: curC },
              isCapture: true,
            });
          }
          step++;
        }
      }
    }

    // Se houver capturas, a prioridade da regra de damas é capturar
    if (moves.length > 0) return moves;

    // 2. Movimentos simples
    if (!piece.isKing) {
      const forwardDr = piece.player === 0 ? -1 : 1;
      for (const dc of [-1, 1]) {
        const landR = r + forwardDr;
        const landC = c + dc;
        if (
          landR >= 0 &&
          landR < 8 &&
          landC >= 0 &&
          landC < 8 &&
          board[landR][landC] === null
        ) {
          moves.push({
            from: { row: r, col: c },
            to: { row: landR, col: landC },
            isCapture: false,
          });
        }
      }
    } else {
      // Dama voadora
      for (const [dr, dc] of directions) {
        let step = 1;
        while (
          r + dr * step >= 0 &&
          r + dr * step < 8 &&
          c + dc * step >= 0 &&
          c + dc * step < 8
        ) {
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

  const validMovesForSelected = selectedPos
    ? getMovesForSquare(selectedPos.row, selectedPos.col)
    : [];

  const handleSquareClick = (r, c) => {
    if (!isMyTurn || status !== "PLAYING") return;

    // Se já tiver uma peça selecionada e clicar em uma casa de destino válida
    if (selectedPos) {
      const matched = validMovesForSelected.find(
        (m) => m.to.row === r && m.to.col === c
      );
      if (matched) {
        onMove({
          from: selectedPos,
          to: { row: r, col: c },
          isCapture: matched.isCapture,
        });
        setSelectedPos(null);
        return;
      }
    }

    // Se clicar em uma peça sua
    const piece = board[r]?.[c];
    if (piece && piece.player === myPlayerIndex) {
      // Se houver salto contínuo obrigatório, só permite selecionar aquela peça
      if (
        activeJumpFrom &&
        (activeJumpFrom.row !== r || activeJumpFrom.col !== c)
      ) {
        return;
      }
      setSelectedPos({ row: r, col: c });
    } else {
      setSelectedPos(null);
    }
  };

  const topPlayerIndex = isFlipped ? 0 : 1;
  const bottomPlayerIndex = isFlipped ? 1 : 0;

  const topPlayer = players[topPlayerIndex];
  const bottomPlayer = players[bottomPlayerIndex];

  const topCaptured = capturedCount?.[topPlayerIndex] || 0;
  const bottomCaptured = capturedCount?.[bottomPlayerIndex] || 0;

  const isTopTurn = currentTurn === topPlayerIndex;
  const isBottomTurn = currentTurn === bottomPlayerIndex;

  const isSpectator = myPlayerIndex === -1;

  return (
    <div className="checkersGameContainer">
      <div className="gameStatusBar">
        <div className="playerTurnCard">
          <div className={`pieceMini ${currentTurn === 0 ? "red" : "white"}`} />
          <span>
            {playerObj ? playerObj.displayName || playerObj.username : "..."}
          </span>
        </div>

        <div className={`turnAlert ${isMyTurn ? "myTurn" : "oppTurn"}`}>
          {isSpectator
            ? `Vez de ${playerObj?.displayName || playerObj?.username || "jogador"}`
            : isMyTurn
            ? "Sua vez de jogar!"
            : `Vez de ${playerObj?.displayName || "adversário"}`}
          {activeJumpFrom && isMyTurn && " (Salto consecutivo!)"}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            Capturas: Vermelhas {capturedCount?.[0] || 0} x{" "}
            {capturedCount?.[1] || 0} Brancas
          </span>
          {status === "PLAYING" && !isSpectator && (
            <button className="resignBtn" onClick={onResign}>
              Desistir
            </button>
          )}
        </div>
      </div>

      {/* Cartão do Adversário (Topo do Tabuleiro) */}
      <div
        className={`checkersPlayerBar oppBar ${isTopTurn ? "activeTurn" : ""}`}
      >
        <div className="playerInfoLeft">
          <div
            className={`playerPieceIndicator ${
              topPlayerIndex === 0 ? "red" : "white"
            }`}
          />
          <div className="playerNameGroup">
            <span className="playerName">
              {topPlayer
                ? topPlayer.displayName || topPlayer.username
                : "Aguardando adversário..."}
            </span>
            <span className="playerColorLabel">
              {topPlayerIndex === 0 ? "Vermelhas" : "Brancas"} (Adversário)
            </span>
          </div>
        </div>

        <div className="playerStatsRight">
          <span className="capturesPill">Capturadas: {topCaptured}</span>
          <span className={`turnStatusTag ${isTopTurn ? "active" : "waiting"}`}>
            {isTopTurn ? "Vez de jogar" : "Aguardando"}
          </span>
        </div>
      </div>

      {/* Tabuleiro 8x8 com orientação dinâmica */}
      <div className="checkersBoard">
        {Array.from({ length: 8 }).map((_, displayR) =>
          Array.from({ length: 8 }).map((_, displayC) => {
            const boardR = isFlipped ? 7 - displayR : displayR;
            const boardC = isFlipped ? 7 - displayC : displayC;
            const piece = board[boardR]?.[boardC];
            const isDark = (boardR + boardC) % 2 === 1;
            const isSelected =
              selectedPos?.row === boardR && selectedPos?.col === boardC;
            const isValidTarget = validMovesForSelected.some(
              (m) => m.to.row === boardR && m.to.col === boardC
            );

            return (
              <div
                key={`${displayR}-${displayC}`}
                className={`checkersSquare ${isDark ? "dark" : "light"} ${
                  isValidTarget ? "validMoveTarget" : ""
                }`}
                onClick={() => handleSquareClick(boardR, boardC)}
              >
                {piece && (
                  <div
                    className={`checkersPiece ${
                      piece.player === 0 ? "redPiece" : "whitePiece"
                    } ${isSelected ? "selected" : ""}`}
                  >
                    {piece.isKing && <span className="crownIcon">👑</span>}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Cartão do Jogador Atual (Base do Tabuleiro) */}
      <div
        className={`checkersPlayerBar myBar ${
          isBottomTurn ? "activeTurn" : ""
        }`}
      >
        <div className="playerInfoLeft">
          <div
            className={`playerPieceIndicator ${
              bottomPlayerIndex === 0 ? "red" : "white"
            }`}
          />
          <div className="playerNameGroup">
            <span className="playerName">
              {bottomPlayer
                ? bottomPlayer.displayName || bottomPlayer.username
                : isSpectator
                ? "Jogador"
                : "Você"}
              {!isSpectator && myPlayerIndex >= 0 && " (Você)"}
            </span>
            <span className="playerColorLabel">
              {bottomPlayerIndex === 0 ? "Vermelhas" : "Brancas"}
            </span>
          </div>
        </div>

        <div className="playerStatsRight">
          <span className="capturesPill">Capturadas: {bottomCaptured}</span>
          <span
            className={`turnStatusTag ${isBottomTurn ? "active" : "waiting"}`}
          >
            {isSpectator
              ? isBottomTurn
                ? "Vez de jogar"
                : "Aguardando"
              : isBottomTurn
              ? "Sua vez!"
              : "Aguardando"}
          </span>
        </div>
      </div>
    </div>
  );
}
