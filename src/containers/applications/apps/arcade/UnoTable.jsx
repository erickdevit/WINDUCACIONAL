import React, { useState } from "react";

// Mapeamento visual das cartas de Uno
const getCardValueLabel = (val) => {
  switch (val) {
    case "skip":
      return "🚫";
    case "reverse":
      return "⇄";
    case "draw2":
      return "+2";
    case "wild":
      return "★";
    case "wild4":
      return "+4";
    default:
      return val;
  }
};

const COLOR_NAMES_PT = {
  red: "Vermelho",
  blue: "Azul",
  green: "Verde",
  yellow: "Amarelo",
  wild: "Especial",
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
    eventsLog = [],
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

  const lastEvent =
    eventsLog.length > 0 ? eventsLog[eventsLog.length - 1] : null;

  return (
    <div className="unoGameContainer">
      {/* Notificação da Última Ação */}
      {lastEvent && (
        <div className="unoActionNotification">
          {lastEvent.message}
        </div>
      )}

      {/* Arena da Mesa Visual de Uno com Jogadores ao Redor */}
      <div className="unoVisualArena">
        {/* Mesa Oval com Feltro Verde */}
        <div className="unoTableFelt">
          {/* Indicador de Cor Ativa e Sentido de Jogo no Topo da Mesa */}
          <div className="feltHeaderInfo">
            <span className={`activeColorBadge ${activeColor}`}>
              Cor: {COLOR_NAMES_PT[activeColor] || activeColor}
            </span>
            <span className="directionBadge" title="Sentido do jogo">
              {direction === 1 ? "↻ Sentido Horário" : "↺ Sentido Anti-horário"}
            </span>
          </div>

          {/* Centro da Mesa: Pilha de Compras e Descarte */}
          <div className="unoCenterPiles">
            {/* Monte de Compras (Draw Pile) */}
            <div className="deckPile">
              <div
                className={`deckCardBack ${
                  isMyTurn && !drawnThisTurn && status === "PLAYING"
                    ? "canDraw"
                    : ""
                }`}
                title={
                  isMyTurn ? "Clique para comprar uma carta" : "Aguarde sua vez"
                }
                onClick={() => {
                  if (isMyTurn && !drawnThisTurn && status === "PLAYING") {
                    onDrawCard();
                  }
                }}
              >
                <div className="unoDeckLogo">UNO</div>
              </div>
              <span className="pileLabel">Comprar</span>
            </div>

            {/* Pilha de Descarte (Top Card) */}
            {topCard && (
              <div className="discardPile">
                <div className={`unoCard ${topCard.color} topCardTable`}>
                  <span className="cardCornerTop">
                    {getCardValueLabel(topCard.value)}
                  </span>
                  <div className="cardInnerOval">
                    <span className="cardCenterValue">
                      {getCardValueLabel(topCard.value)}
                    </span>
                  </div>
                  <span className="cardCornerBottom">
                    {getCardValueLabel(topCard.value)}
                  </span>
                </div>
                <span className="pileLabel">Descarte</span>
              </div>
            )}
          </div>

          {/* Chamada de Turno no Centro da Mesa */}
          <div className={`feltTurnCallout ${isMyTurn ? "isMyTurn" : ""}`}>
            {isMyTurn
              ? "⭐ SUA VEZ DE JOGAR!"
              : `Vez de ${
                  currentPlayer?.displayName || currentPlayer?.username || "..."
                }`}
          </div>
        </div>

        {/* Assentos dos Jogadores Posicionados ao Redor da Mesa (Até 6 Alunos) */}
        <div className="unoSeatsContainer">
          {orderedPlayers.map((p, relIdx) => {
            const posClass = getSeatPositionClass(
              relIdx,
              orderedPlayers.length
            );
            const isThisPlayerTurn = currentPlayer?.userId === p.userId;
            const isMe =
              (currentUserId && p.userId === currentUserId) ||
              (currentUsername && p.username === currentUsername);
            const hasOneCard = p.cardCount === 1;

            return (
              <div
                key={p.userId}
                className={`unoTableSeat ${posClass} ${
                  isThisPlayerTurn ? "activeTurnSeat" : ""
                } ${isMe ? "localPlayerSeat" : ""}`}
              >
                <div className="seatAvatarBadge">
                  <div className="seatAvatar">
                    {p.displayName?.[0] || p.username?.[0] || "?"}
                  </div>
                  {isThisPlayerTurn && (
                    <span className="turnPlayingBadge" title="Vez de jogar">
                      🎮
                    </span>
                  )}
                </div>

                <div className="seatInfo">
                  <strong className="seatName">
                    {p.displayName || p.username}
                    {isMe && " (Você)"}
                  </strong>
                  <span className="seatCards">
                    🎴 {isMe ? myHand.length : p.cardCount} cartas
                  </span>
                </div>

                {hasOneCard && p.calledUno && (
                  <span className="oppUnoCall">UNO!</span>
                )}

                {!isMe && hasOneCard && !p.calledUno && isMyTurn && (
                  <button
                    className="catchUnoBtn"
                    title="Pegar Uno: penaliza o colega com 2 cartas se ele não gritou UNO!"
                    onClick={() => onCatchUno(p.userId)}
                  >
                    🚨 Denunciar
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Área da Mão do Jogador Atual */}
      <div className="unoPlayerHandArea">
        <div className="handActionBar">
          <span className="turnStatusText">
            {!me
              ? `👁️ Modo Espectador: Acompanhando partida (Vez de ${
                  currentPlayer?.displayName || "..."
                })`
              : isMyTurn
              ? "🎮 Sua vez de jogar!"
              : `Vez de ${currentPlayer?.displayName || "..."}`}
          </span>

          <div className="handButtons">
            {/* Botão de Gritar UNO */}
            {me && myHand.length <= 2 && myHand.length > 0 && (
              <button className="unoShoutBtn" onClick={onCallUno}>
                📢 GRITAR UNO!
              </button>
            )}

            {/* Botão de Passar a Vez se tiver comprado carta jogável */}
            {isMyTurn && drawnThisTurn && (
              <button className="passBtn" onClick={onPassTurn}>
                Passar a vez
              </button>
            )}
          </div>
        </div>

        {/* Fileira de Cartas do Jogador */}
        <div className="handCardsRow">
          {!me ? (
            <div className="text-center text-xs text-slate-400 py-3 w-full">
              👁️ Você está acompanhando a partida como espectador.
            </div>
          ) : (
            myHand.map((card) => {
              const playable = isCardPlayable(card);
            return (
              <div
                key={card.id}
                className={`unoCard ${card.color} ${
                  playable ? "playable" : "notPlayable"
                }`}
                onClick={() => handleCardClick(card)}
              >
                <span className="cardCornerTop">
                  {getCardValueLabel(card.value)}
                </span>
                <div className="cardInnerOval">
                  <span className="cardCenterValue">
                    {getCardValueLabel(card.value)}
                  </span>
                </div>
                <span className="cardCornerBottom">
                  {getCardValueLabel(card.value)}
                </span>
              </div>
            );
          })
          )}
        </div>
      </div>

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
