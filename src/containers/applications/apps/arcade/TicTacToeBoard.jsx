import React from "react";

export function TicTacToeBoard({ gameState, currentUserId, onMakeMove }) {
  if (!gameState) {
    return (
      <div className="tictactoeGameContainer" aria-label="Carregando tabuleiro">
        <div className="ticTacToeBoard isLoading" aria-hidden="true">
          {Array.from({ length: 9 }, (_, index) => (
            <span key={index} className="ticTacToeCell" />
          ))}
        </div>
      </div>
    );
  }

  const {
    board = Array(9).fill(null),
    players = [],
    currentTurn = 0,
    winningLine = null,
    status,
  } = gameState;

  const activePlayer = players[currentTurn];
  const isMyTurn = activePlayer?.userId === currentUserId;
  const isSpectator = !players.some(
    (player) => player.userId === currentUserId
  );
  const boardLabel =
    status !== "PLAYING"
      ? "Partida encerrada. Tabuleiro do Jogo da Velha"
      : isSpectator
      ? `Tabuleiro do Jogo da Velha. Vez de ${
          activePlayer?.displayName || "jogador"
        }`
      : isMyTurn
      ? "Sua vez no Jogo da Velha"
      : `Aguardando a jogada de ${activePlayer?.displayName || "jogador"}`;

  return (
    <main className="tictactoeGameContainer" aria-label={boardLabel}>
      <div className="ticTacToeBoard" role="grid" aria-label={boardLabel}>
        {board.map((cellValue, index) => {
          const isWinningCell = winningLine?.includes(index);
          const isClickable =
            isMyTurn && cellValue === null && status === "PLAYING";
          const row = Math.floor(index / 3) + 1;
          const column = (index % 3) + 1;

          return (
            <button
              key={index}
              type="button"
              role="gridcell"
              aria-label={`Linha ${row}, coluna ${column}${
                cellValue ? `, ${cellValue}` : ", vazia"
              }`}
              disabled={!isClickable}
              onClick={() => onMakeMove(index)}
              className={`ticTacToeCell ${
                cellValue === "X" ? "isX" : cellValue === "O" ? "isO" : ""
              } ${isWinningCell ? "winningCell" : ""}`}
            >
              {cellValue}
            </button>
          );
        })}
      </div>
    </main>
  );
}
