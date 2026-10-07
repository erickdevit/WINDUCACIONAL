import React, { useState } from "react";

const COLOR_NAMES_PT = {
  red: "Vermelho",
  blue: "Azul",
  green: "Verde",
  yellow: "Amarelo",
  wild: "Especial",
};

const CARD_VALUE_NAMES_PT = {
  skip: "Bloqueio",
  reverse: "Inverte",
  draw2: "Compra duas",
  wild: "Coringa",
  wild4: "Coringa compra quatro",
};

const CARD_COLOR_FILE_NAMES = {
  red: "Red",
  blue: "Blue",
  green: "Green",
  yellow: "Yellow",
};

const CARD_VALUE_FILE_NAMES = {
  skip: "Skip",
  reverse: "Reverse",
  draw2: "Draw_2",
};

const getCardImageSrc = (card) => {
  if (card.color === "wild") {
    return card.value === "wild4"
      ? "/img/arcade/uno/Wild_Draw_4.jpg"
      : "/img/arcade/uno/Wild.jpg";
  }

  const color = CARD_COLOR_FILE_NAMES[card.color];
  if (!color) return "/img/arcade/uno/Wild.jpg";

  const value = CARD_VALUE_FILE_NAMES[card.value] || card.value;
  const extension = card.value === "0" ? "png" : "jpg";
  return `/img/arcade/uno/${color}_${value}.${extension}`;
};

const getCardAccessibleName = (card) => {
  const value = CARD_VALUE_NAMES_PT[card.value] || card.value;
  if (card.color === "wild") return value;
  return `${value} ${COLOR_NAMES_PT[card.color] || card.color}`;
};

// Mapeamento posicional dos assentos ao redor da mesa elíptica para até 6 jogadores
const getSeatPositionClass = (relativeIndex, totalPlayers) => {
  if (relativeIndex === 0) {
    return "seat-bottom-center";
  }

  if (totalPlayers === 2) {
    return "seat-top-center";
  }

  if (totalPlayers === 3) {
    return relativeIndex === 1 ? "seat-top-left" : "seat-top-right";
  }

  if (totalPlayers === 4) {
    if (relativeIndex === 1) return "seat-middle-left";
    if (relativeIndex === 2) return "seat-top-center";
    return "seat-middle-right";
  }

  if (totalPlayers === 5) {
    if (relativeIndex === 1) return "seat-bottom-left";
    if (relativeIndex === 2) return "seat-top-left";
    if (relativeIndex === 3) return "seat-top-right";
    return "seat-bottom-right";
  }

  // totalPlayers === 6
  if (relativeIndex === 1) return "seat-bottom-left";
  if (relativeIndex === 2) return "seat-top-left";
  if (relativeIndex === 3) return "seat-top-center";
  if (relativeIndex === 4) return "seat-top-right";
  return "seat-bottom-right";
};

export function UnoTable({
  gameState,
  currentUserId,
  currentUsername,
  onPlayCard,
  onDrawCard,
  onPassTurn,
  onCallUno,
  onCatchUno,
}) {
  const [selectedWildCard, setSelectedWildCard] = useState(null);

  if (!gameState || !gameState.players) {
    return <div className="p-4 text-center">Carregando partida de Uno...</div>;
  }

  const {
    players,
    topCard,
    activeColor,
    currentTurn,
    direction,
    drawnThisTurn,
    status,
  } = gameState;

  const currentPlayer = players[currentTurn];
  const isMyTurn =
    (currentUserId && currentPlayer?.userId === currentUserId) ||
    (currentUsername && currentPlayer?.username === currentUsername);
  const me = players.find(
    (p) =>
      (currentUserId && p.userId === currentUserId) ||
      (currentUsername && p.username === currentUsername)
  );
  const myHand = me?.hand || [];

  const myPlayerIndex = players.findIndex(
    (p) =>
      (currentUserId && p.userId === currentUserId) ||
      (currentUsername && p.username === currentUsername)
  );

  // Rotaciona a ordem dos jogadores na mesa para que o jogador local fique sempre no centro inferior (posição 0)
  // Em modo espectador, preserva a ordem natural da mesa
  const orderedPlayers =
    myPlayerIndex >= 0
      ? players.map((_, i) => players[(myPlayerIndex + i) % players.length])
      : players;

  const isCardPlayable = (card) => {
    if (!isMyTurn || status !== "PLAYING") return false;
    if (card.color === "wild") return true;
    if (card.color === activeColor) return true;
    if (card.value === topCard.value) return true;
    return false;
  };

  const handleCardClick = (card) => {
    if (!isCardPlayable(card)) return;

    if (card.color === "wild") {
      // Abre o seletor de cor para o Coringa
      setSelectedWildCard(card);
    } else {
      onPlayCard(card.id);
    }
  };

  const handleSelectColor = (color) => {
    if (selectedWildCard) {
      onPlayCard(selectedWildCard.id, color);
      setSelectedWildCard(null);
    }
  };

  return (
    <div className={`unoGameContainer ${isMyTurn ? "isMyTurn" : ""}`}>
      {/* Arena da Mesa Visual de Uno com Jogadores ao Redor */}
      <div className="unoVisualArena">
        {/* Mesa Oval com Feltro Verde */}
        <div className="unoTableFelt">
          {/* Centro da Mesa: Pilha de Compras e Descarte */}
          <div className="unoCenterPiles">
            {/* Monte de Compras (Draw Pile) */}
            <div className="deckPile">
              <button
                type="button"
                className={`deckCardBack ${
                  isMyTurn && !drawnThisTurn && status === "PLAYING"
                    ? "canDraw"
                    : ""
                }`}
                disabled={!(isMyTurn && !drawnThisTurn && status === "PLAYING")}
                aria-label="Comprar uma carta"
                title={
                  isMyTurn ? "Clique para comprar uma carta" : "Aguarde sua vez"
                }
                onClick={onDrawCard}
              >
                <div className="unoDeckLogo">UNO</div>
              </button>
            </div>
            <span
              className="unoDirectionIndicator"
              role="img"
              aria-label={
                direction === 1 ? "Sentido horário" : "Sentido anti-horário"
              }
              title={
                direction === 1 ? "Sentido horário" : "Sentido anti-horário"
              }
            >
              {direction === 1 ? "↻" : "↺"}
            </span>

            {/* Pilha de Descarte (Top Card) */}
            {topCard && (
              <div className="discardPile">
                <img
                  className="unoCard topCardTable"
                  src={getCardImageSrc(topCard)}
                  alt={getCardAccessibleName(topCard)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Assentos dos Jogadores Posicionados ao Redor da Mesa (Até 6 Alunos) */}
        <div className="unoSeatsContainer">
          {orderedPlayers.map((p, relIdx) => {
            const posClass = getSeatPositionClass(
              relIdx,
              orderedPlayers.length
            );
            const isMe =
              (currentUserId && p.userId === currentUserId) ||
              (currentUsername && p.username === currentUsername);
            const hasOneCard = p.cardCount === 1;
            const cardCount = isMe ? 0 : Math.max(0, p.cardCount || 0);
            const fanStep =
              cardCount > 1 ? Math.min(14, 190 / (cardCount - 1)) : 0;
            const fanWidth = cardCount > 0 ? 42 + fanStep * (cardCount - 1) : 0;
            const canCatchUno = hasOneCard && !p.calledUno && isMyTurn;
            const avatarLabel = p.displayName || p.username;
            const avatarInitial = p.displayName?.[0] || p.username?.[0] || "?";

            if (isMe) return null;

            return (
              <div
                key={p.userId}
                className={`unoTableSeat ${posClass} ${
                  currentPlayer?.userId === p.userId ? "activeTurnSeat" : ""
                }`}
              >
                {canCatchUno ? (
                  <button
                    type="button"
                    className="seatAvatar catchableAvatar"
                    title={`Pegar UNO de ${avatarLabel}`}
                    aria-label={`Pegar UNO de ${avatarLabel}`}
                    onClick={() => onCatchUno(p.userId)}
                  >
                    {avatarInitial}
                    <span aria-hidden="true">!</span>
                  </button>
                ) : (
                  <span
                    className="seatAvatar"
                    title={avatarLabel}
                    aria-label={avatarLabel}
                  >
                    {avatarInitial}
                  </span>
                )}
                <div
                  className="opponentHandBacks"
                  role="img"
                  aria-label={`${
                    p.displayName || p.username
                  }: ${cardCount} cartas`}
                  style={{
                    "--opponent-card-count": cardCount,
                    "--opponent-card-step": `${fanStep}px`,
                    "--opponent-fan-width": `${fanWidth}px`,
                  }}
                >
                  {Array.from({ length: cardCount }).map((_, index) => {
                    const centerOffset = index - (cardCount - 1) / 2;
                    return (
                      <span
                        className="opponentCardBack"
                        key={index}
                        aria-hidden="true"
                        style={{
                          "--card-index": index,
                          "--card-angle": `${centerOffset * 2.4}deg`,
                          "--card-lift": `${Math.abs(centerOffset) * 1.1}px`,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Área da Mão do Jogador Atual */}
      {me && (
        <div className={`unoPlayerHandArea ${isMyTurn ? "isActiveHand" : ""}`}>
          {((me && myHand.length <= 2 && myHand.length > 0) ||
            (isMyTurn && drawnThisTurn)) && (
            <div className="unoHandControls">
              {me && myHand.length <= 2 && myHand.length > 0 && (
                <button className="unoShoutBtn" onClick={onCallUno}>
                  UNO!
                </button>
              )}
              {isMyTurn && drawnThisTurn && (
                <button className="passBtn" onClick={onPassTurn}>
                  Passar
                </button>
              )}
            </div>
          )}

          {/* Fileira de Cartas do Jogador */}
          <div
            className={`handCardsRow ${
              myHand && myHand.length > 7 ? "denseCards" : ""
            }`}
          >
            <div className="handCardsRail">
              {myHand.map((card, index) => {
                const playable = isCardPlayable(card);
                const offsetFromCenter = index - (myHand.length - 1) / 2;
                const distanceFromCenter = Math.abs(offsetFromCenter);
                const rotation = Math.max(
                  -16,
                  Math.min(16, offsetFromCenter * 2.6)
                );
                const lift = -Math.min(22, distanceFromCenter ** 2 * 1.2);
                return (
                  <button
                    type="button"
                    key={card.id}
                    aria-label={getCardAccessibleName(card)}
                    disabled={!playable}
                    className={`unoCard ${card.color} ${
                      playable ? "playable" : "notPlayable"
                    }`}
                    style={{
                      "--card-index": index,
                      "--hand-rotation": `${rotation}deg`,
                      "--hand-lift": `${lift}px`,
                    }}
                    onClick={() => handleCardClick(card)}
                  >
                    <img src={getCardImageSrc(card)} alt="" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal Seletor de Cor ao jogar Coringa */}
      {selectedWildCard && (
        <div className="unoColorPickerOverlay">
          <div className="colorPickerBox">
            <h4>Escolha a nova cor:</h4>
            <div className="colorOptionsGrid">
              <button className="red" onClick={() => handleSelectColor("red")}>
                Vermelho
              </button>
              <button
                className="blue"
                onClick={() => handleSelectColor("blue")}
              >
                Azul
              </button>
              <button
                className="green"
                onClick={() => handleSelectColor("green")}
              >
                Verde
              </button>
              <button
                className="yellow"
                onClick={() => handleSelectColor("yellow")}
              >
                Amarelo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
