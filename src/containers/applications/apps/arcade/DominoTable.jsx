import React, { useState } from "react";

export function DominoTable({
  gameState,
  currentUserId,
  onPlayTile,
  onDrawTile,
  onPassTurn,
}) {
  const [selectedTileId, setSelectedTileId] = useState(null);

  if (!gameState) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-400">
        Carregando estado do Dominó...
      </div>
    );
  }

  const {
    board = [],
    players = [],
    currentTurn = 0,
    leftEnd,
    rightEnd,
    boneyardCount = 0,
    lastActionMessage,
    status,
  } = gameState;

  const activePlayer = players[currentTurn];
  const isMyTurn = activePlayer?.userId === currentUserId;
  const myPlayerObj = players.find((p) => p.userId === currentUserId);
  const myHand = myPlayerObj?.hand || [];
  const isSpectator = !myPlayerObj;

  const selectedTile = myHand.find((t) => t.id === selectedTileId);

  const canPlayLeft =
    selectedTile &&
    (leftEnd === null ||
      selectedTile.left === leftEnd ||
      selectedTile.right === leftEnd);

  const canPlayRight =
    selectedTile &&
    (rightEnd === null ||
      selectedTile.left === rightEnd ||
      selectedTile.right === rightEnd);

  const handleTileClick = (tileId) => {
    if (!isMyTurn || status !== "PLAYING") return;
    if (selectedTileId === tileId) {
      setSelectedTileId(null);
    } else {
      setSelectedTileId(tileId);
    }
  };

  const handlePlayToEnd = (end) => {
    if (!selectedTileId) return;
    onPlayTile(selectedTileId, end);
    setSelectedTileId(null);
  };

  return (
    <div className="dominoGameContainer flex-grow flex flex-col justify-between p-4 bg-emerald-950/80 text-white rounded-xl border border-emerald-600/30 shadow-2xl relative overflow-hidden">
      {/* Barra de Status Topo */}
      <div className="dominoHeaderBar flex flex-wrap justify-between items-center bg-emerald-900/60 p-3 rounded-lg border border-emerald-500/20 text-xs gap-2">
        <div className="flex items-center gap-3">
          <span className="font-bold text-amber-300">
            🎲 Dominó ({players.length} Jogadores)
          </span>
          <span className="bg-emerald-800 px-2 py-0.5 rounded text-emerald-200">
            Dorme: <strong>{boneyardCount}</strong> pedras
          </span>
        </div>

        <div className="turnIndicator font-extrabold flex items-center gap-2">
          {isMyTurn ? (
            <span className="px-2 py-1 bg-amber-500 text-slate-950 rounded animate-pulse">
              ⭐ SEU TURNO!
            </span>
          ) : (
            <span className="text-slate-300">
              Vez de: <strong>{activePlayer?.displayName || "..."}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Mensagem de Última Ação */}
      {lastActionMessage && (
        <div className="text-center my-2 text-xs text-emerald-200 bg-emerald-900/40 py-1.5 px-3 rounded border border-emerald-500/20">
          {lastActionMessage}
        </div>
      )}

      {/* Arena/Mesa Principal com a Cadeia de Pedras */}
      <div className="dominoBoardArena flex-grow flex items-center justify-center my-4 p-4 bg-emerald-900/30 rounded-xl border border-emerald-500/20 min-h-[180px] overflow-x-auto">
        {board.length === 0 ? (
          <div className="text-emerald-300/60 text-sm font-semibold animate-pulse">
            A mesa está vazia. O jogador da vez deve jogar a primeira pedra!
          </div>
        ) : (
          <div className="dominoChain flex items-center gap-1.5 py-2 px-4">
            {board.map((item, idx) => {
              const { tile, flipped } = item;
              const val1 = flipped ? tile.right : tile.left;
              const val2 = flipped ? tile.left : tile.right;

              return (
                <div
                  key={`${tile.id}_${idx}`}
                  className={`dominoBoardTile bg-amber-50 text-slate-900 border-2 border-amber-200 rounded p-1 flex flex-col justify-between items-center w-8 h-14 shadow-md ${
                    tile.isDouble ? "rotate-90 my-2" : ""
                  }`}
                >
                  <span className="font-extrabold text-sm">{val1}</span>
                  <div className="w-full h-[1px] bg-slate-400" />
                  <span className="font-extrabold text-sm">{val2}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Botões de Ação para escolher ponta (Esquerda ou Direita) se a pedra selecionada couber */}
      {selectedTile && isMyTurn && (
        <div className="flex justify-center gap-3 my-2 animate-bounce">
          <button
            disabled={!canPlayLeft}
            onClick={() => handlePlayToEnd("left")}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg font-bold text-xs shadow-lg"
          >
            ⬅️ Jogar na Ponta Esquerda ({leftEnd !== null ? leftEnd : "?"})
          </button>
          <button
            disabled={!canPlayRight}
            onClick={() => handlePlayToEnd("right")}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg font-bold text-xs shadow-lg"
          >
            ➡️ Jogar na Ponta Direita ({rightEnd !== null ? rightEnd : "?"})
          </button>
        </div>
      )}

      {/* Painel Inferior: Mão do Jogador Local & Ações do Dorme/Passar */}
      {!isSpectator && (
        <div className="dominoPlayerHandArea bg-emerald-900/60 p-3 rounded-xl border border-emerald-500/30 flex flex-col items-center gap-3">
          <div className="flex justify-between w-full text-xs font-bold text-emerald-200 border-b border-emerald-500/20 pb-1">
            <span>Sua Mão ({myHand.length} pedras)</span>
            {isMyTurn && (
              <div className="flex gap-2">
                <button
                  onClick={onDrawTile}
                  disabled={boneyardCount === 0}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-slate-950 font-bold rounded text-xs"
                >
                  🛒 Comprar do Dorme ({boneyardCount})
                </button>
                <button
                  onClick={onPassTurn}
                  className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded text-xs"
                >
                  ⏭️ Passar a Vez
                </button>
              </div>
            )}
          </div>

          <div className="dominoHandTiles flex flex-wrap justify-center gap-2 max-h-[130px] overflow-y-auto p-1">
            {myHand.map((tile) => {
              const isSelected = selectedTileId === tile.id;
              return (
                <button
                  key={tile.id}
                  disabled={!isMyTurn || status !== "PLAYING"}
                  onClick={() => handleTileClick(tile.id)}
                  className={`dominoHandTile bg-amber-100 hover:bg-amber-200 text-slate-900 border-2 rounded p-1 flex flex-col justify-between items-center w-9 h-16 transition-all transform ${
                    isSelected
                      ? "border-amber-500 -translate-y-2 ring-4 ring-amber-400 scale-105"
                      : "border-amber-300 shadow"
                  } ${!isMyTurn ? "opacity-90 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <span className="font-black text-base">{tile.left}</span>
                  <div className="w-full h-[2px] bg-slate-400" />
                  <span className="font-black text-base">{tile.right}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
