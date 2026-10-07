import React, { useState } from "react";

const DOMINO_PIP_POSITIONS = {
  0: [],
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 3, 6, 2, 5, 8],
};

function DominoHalf({ value }) {
  const visiblePips = DOMINO_PIP_POSITIONS[value] || [];

  return (
    <span className="dominoHalf" role="img" aria-label={`${value} pontos`}>
      {Array.from({ length: 9 }, (_, index) => (
        <span
          key={index}
          aria-hidden="true"
          className={`dominoPip ${
            visiblePips.includes(index) ? "visible" : ""
          }`}
        />
      ))}
    </span>
  );
}

const getOpponentSeatPosition = (index, playerCount) => {
  if (playerCount === 2) return "topCenter";
  if (playerCount === 3) return index === 0 ? "topLeft" : "topRight";
  if (index === 0) return "middleLeft";
  if (index === 1) return "topCenter";
  return "middleRight";
};

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
    status,
  } = gameState;

  const activePlayer = players[currentTurn];
  const isMyTurn = activePlayer?.userId === currentUserId;
  const myPlayerObj = players.find((p) => p.userId === currentUserId);
  const myHand = myPlayerObj?.hand || [];
  const isSpectator = !myPlayerObj;
  const myPlayerIndex = players.findIndex((p) => p.userId === currentUserId);
  const orderedPlayers =
    myPlayerIndex >= 0
      ? players.map(
          (_, index) => players[(myPlayerIndex + index) % players.length]
        )
      : players;
  const opponentPlayers = orderedPlayers.slice(1);

  const selectedTile = myHand.find((t) => t.id === selectedTileId);
  const dominoColumns = Math.min(8, Math.max(board.length, 1));
  const dominoSlots = board.map((item, index) => {
    const row = Math.floor(index / dominoColumns);
    const offset = index % dominoColumns;
    const column = row % 2 === 0 ? offset : dominoColumns - 1 - offset;
    return { item, index, row, column, reverse: row % 2 === 1 };
  });
  const dominoRows = Math.ceil(board.length / dominoColumns);

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
    <div className={`dominoGameContainer ${isMyTurn ? "isMyTurn" : ""}`}>
      <div
        className="dominoBoardArena"
        role="region"
        aria-label="Mesa de dominó"
      >
        <div className="dominoOpponentSeats" aria-label="Outros jogadores">
          {opponentPlayers.map((player, index) => {
            const tileCount = player.tileCount ?? player.hand?.length ?? 0;
            const seatPosition = getOpponentSeatPosition(
              index,
              orderedPlayers.length
            );
            const avatar =
              player.displayName?.[0] || player.username?.[0] || "?";

            return (
              <div
                className={`dominoOpponentSeat ${seatPosition} ${
                  currentTurn === player.seatIndex ? "activeTurn" : ""
                }`}
                key={player.userId}
                aria-label={`${
                  player.displayName || player.username
                }: ${tileCount} peças${
                  currentTurn === player.seatIndex ? ", sua vez" : ""
                }`}
              >
                <span className="dominoSeatAvatar" aria-hidden="true">
                  {avatar.toUpperCase()}
                </span>
                <span className="dominoOpponentInfo">
                  <strong>{player.displayName || player.username}</strong>
                  <small>{tileCount} peças</small>
                </span>
                <span className="dominoOpponentBacks" aria-hidden="true">
                  {Array.from(
                    { length: Math.min(3, tileCount) },
                    (_, tileIndex) => (
                      <span
                        className="dominoTileBack"
                        key={tileIndex}
                        style={{ "--back-index": tileIndex }}
                      />
                    )
                  )}
                </span>
              </div>
            );
          })}
        </div>
        {board.length > 0 && (
          <div
            className="dominoChain"
            style={{
              "--domino-columns": dominoColumns,
              "--domino-rows": dominoRows,
            }}
          >
            <svg
              className="dominoChainPath"
              viewBox={`0 0 ${dominoColumns * 80} ${dominoRows * 62}`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {dominoSlots.slice(1).map((slot, index) => {
                const previous = dominoSlots[index];
                return (
                  <line
                    key={`${previous.index}-${slot.index}`}
                    x1={previous.column * 80 + 40}
                    y1={previous.row * 62 + 31}
                    x2={slot.column * 80 + 40}
                    y2={slot.row * 62 + 31}
                  />
                );
              })}
            </svg>
            {dominoSlots.map(({ item, index, row, column, reverse }) => {
              const { tile, flipped } = item;
              const firstValue = flipped ? tile.right : tile.left;
              const secondValue = flipped ? tile.left : tile.right;

              return (
                <div
                  key={`${tile.id}_${index}`}
                  className="dominoBoardSlot"
                  style={{ gridColumn: column + 1, gridRow: row + 1 }}
                >
                  <div
                    className={`dominoBoardTile ${
                      tile.isDouble ? "isDouble" : ""
                    } ${reverse ? "reverseDirection" : ""}`}
                  >
                    <DominoHalf value={firstValue} />
                    <span className="dominoDivider" />
                    <DominoHalf value={secondValue} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!isSpectator && (
        <div
          className={`dominoPlayerHandArea ${isMyTurn ? "isActiveHand" : ""}`}
        >
          <div className="dominoLocalPlayerCard">
            <span className="dominoSeatAvatar" aria-hidden="true">
              {(
                myPlayerObj.displayName?.[0] ||
                myPlayerObj.username?.[0] ||
                "J"
              ).toUpperCase()}
            </span>
            <span>
              <strong>{myPlayerObj.displayName || myPlayerObj.username}</strong>
              <small>{myHand.length} peças</small>
            </span>
          </div>
          <div className="dominoHandTiles">
            {myHand.map((tile) => {
              const isSelected = selectedTileId === tile.id;
              return (
                <button
                  key={tile.id}
                  type="button"
                  aria-label={`${tile.left} a ${tile.right}${
                    isSelected ? ", selecionada" : ""
                  }`}
                  aria-pressed={isSelected}
                  disabled={!isMyTurn || status !== "PLAYING"}
                  onClick={() => handleTileClick(tile.id)}
                  className={`dominoHandTile ${isSelected ? "selected" : ""}`}
                >
                  <DominoHalf value={tile.left} />
                  <span className="dominoDivider" />
                  <DominoHalf value={tile.right} />
                </button>
              );
            })}
          </div>

          {isMyTurn && (
            <div className="dominoActionRail">
              {selectedTile && (
                <div className="dominoPlacementActions">
                  <button
                    type="button"
                    disabled={!canPlayLeft}
                    aria-label={`Jogar na ponta esquerda (${
                      leftEnd ?? "aberta"
                    })`}
                    onClick={() => handlePlayToEnd("left")}
                  >
                    ← {leftEnd ?? "·"}
                  </button>
                  <button
                    type="button"
                    disabled={!canPlayRight}
                    aria-label={`Jogar na ponta direita (${
                      rightEnd ?? "aberta"
                    })`}
                    onClick={() => handlePlayToEnd("right")}
                  >
                    {rightEnd ?? "·"} →
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={onDrawTile}
                disabled={boneyardCount === 0}
                aria-label={`Comprar pedra. ${boneyardCount} restantes`}
                title="Comprar uma pedra"
              >
                Comprar <span>{boneyardCount}</span>
              </button>
              <button
                type="button"
                onClick={onPassTurn}
                aria-label="Passar a vez"
                title="Passar a vez"
              >
                Passar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
