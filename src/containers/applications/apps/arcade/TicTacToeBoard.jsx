import React from "react";

export function TicTacToeBoard({ gameState, currentUserId, onMakeMove }) {
  if (!gameState) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-400">
        Carregando Jogo da Velha...
      </div>
    );
  }

  const {
    board = Array(9).fill(null),
    players = [],
    currentTurn = 0,
    winningLine = null,
    lastActionMessage,
    status,
  } = gameState;

  const activePlayer = players[currentTurn];
  const isMyTurn = activePlayer?.userId === currentUserId;
  const myPlayerObj = players.find((p) => p.userId === currentUserId);
  const isSpectator = !myPlayerObj;

  return (
    <div className="tictactoeGameContainer flex-grow flex flex-col justify-between p-6 bg-slate-900 text-white rounded-2xl border border-indigo-500/30 shadow-2xl relative overflow-hidden">
      {/* Placar / Jogadores */}
      <div className="flex justify-around items-center bg-slate-800/80 p-3 rounded-xl border border-slate-700">
        {players.map((p, idx) => {
          const isMe = p.userId === currentUserId;
          const isCurrentTurn = currentTurn === idx && status === "PLAYING";
          const symbolColor = p.symbol === "X" ? "text-cyan-400" : "text-rose-400";

          return (
            <div
              key={p.userId}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                isCurrentTurn
                  ? "bg-indigo-900/60 border-indigo-400 scale-105 shadow-lg ring-2 ring-indigo-400"
                  : "bg-slate-800 border-slate-700 opacity-80"
              }`}
            >
              <span className={`text-2xl font-black ${symbolColor}`}>
                {p.symbol}
              </span>
              <div className="flex flex-col">
                <strong className="text-sm font-bold">
                  {p.displayName} {isMe ? "(Você)" : ""}
                </strong>
                {isCurrentTurn && (
                  <span className="text-[10px] text-indigo-300 animate-pulse font-bold">
                    Jogando agora...
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mensagem de Estado/Ação */}
      {lastActionMessage && (
        <div className="text-center my-3 text-xs text-indigo-200 bg-indigo-950/50 py-2 px-4 rounded-lg border border-indigo-500/20">
          {lastActionMessage}
        </div>
      )}

      {/* Grade do Jogo da Velha (3x3) */}
      <div className="flex-grow flex items-center justify-center my-4">
        <div className="grid grid-cols-3 gap-3 bg-slate-800 p-4 rounded-2xl border-2 border-indigo-500/40 shadow-inner w-full max-w-[320px] aspect-square">
          {board.map((cellValue, idx) => {
            const isWinningCell = winningLine && winningLine.includes(idx);
            const isClickable =
              isMyTurn && cellValue === null && status === "PLAYING";

            return (
              <button
                key={idx}
                disabled={!isClickable}
                onClick={() => onMakeMove(idx)}
                className={`flex items-center justify-center text-4xl font-black rounded-xl transition-all transform active:scale-95 ${
                  cellValue === "X"
                    ? "text-cyan-400"
                    : cellValue === "O"
                    ? "text-rose-400"
                    : "text-slate-600"
                } ${
                  isWinningCell
                    ? "bg-emerald-500/30 border-2 border-emerald-400 animate-bounce text-emerald-300"
                    : "bg-slate-900 border border-slate-700"
                } ${
                  isClickable
                    ? "hover:bg-indigo-900/50 hover:border-indigo-400 cursor-pointer shadow-md"
                    : "cursor-not-allowed"
                }`}
              >
                {cellValue}
              </button>
            );
          })}
        </div>
      </div>

      {/* Rodapé do Turno */}
      <div className="text-center text-xs text-slate-400 font-semibold">
        {status === "PLAYING" ? (
          isMyTurn ? (
            <span className="text-amber-400 font-bold animate-pulse">
              👉 Clique em uma das casas vazias da grade acima para marcar seu símbolo!
            </span>
          ) : (
            <span>Aguardando a jogada de {activePlayer?.displayName}...</span>
          )
        ) : (
          <span>Partida encerrada.</span>
        )}

        {isSpectator && (
          <div className="mt-1 text-indigo-300 italic">
            👁️ Você está assistindo no Modo Espectador.
          </div>
        )}
      </div>
    </div>
  );
}
