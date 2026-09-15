import React, { useState } from "react";

export function CheckersBoard({ gameState, currentUserId, onMove, onResign }) {
  const [selectedPos, setSelectedPos] = useState(null);

  if (!gameState || !gameState.board) {
    return <div className="p-4 text-center">Carregando tabuleiro...</div>;
  }

  const {
    board,
    currentTurn,
    players,
    activeJumpFrom,
    capturedCount,
    winner,
    status,
  } = gameState;

  const playerObj = players[currentTurn];
  const isMyTurn = playerObj?.userId === currentUserId;
  const myPlayerIndex = players.findIndex((p) => p.userId === currentUserId);

  // Calcula movimentos válidos para a peça selecionada
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
    const piece = board[r][c];
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

  const player0 = players[0];
  const player1 = players[1];

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
          {isMyTurn
            ? "Sua vez de jogar!"
            : `Vez de ${playerObj?.displayName || "adversário"}`}
          {activeJumpFrom && isMyTurn && " (Salto consecutivo!)"}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            Capturas: Vermelhas {capturedCount?.[0] || 0} x{" "}
            {capturedCount?.[1] || 0} Brancas
          </span>
          {status === "PLAYING" && (
            <button className="resignBtn" onClick={onResign}>
              Desistir
            </button>
          )}
        </div>
      </div>

      {/* Tabuleiro 8x8 */}
      <div className="checkersBoard">
        {board.map((row, r) =>
          row.map((piece, c) => {
            const isDark = (r + c) % 2 === 1;
            const isSelected = selectedPos?.row === r && selectedPos?.col === c;
            const isValidTarget = validMovesForSelected.some(
              (m) => m.to.row === r && m.to.col === c
            );

            return (
              <div
                key={`${r}-${c}`}
                className={`checkersSquare ${isDark ? "dark" : "light"} ${
                  isValidTarget ? "validMoveTarget" : ""
                }`}
                onClick={() => handleSquareClick(r, c)}
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

      <div className="flex items-center justify-between w-full max-w-[520px] text-xs text-slate-400 px-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-600 border border-red-400" />
          <span>{player0?.displayName} (Vermelhas)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-slate-100 border border-slate-300" />
          <span>{player1?.displayName} (Brancas)</span>
        </div>
      </div>
    </div>
  );
}
