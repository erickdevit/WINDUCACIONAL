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

export function UnoTable({
  gameState,
  currentUserId,
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
    drawnPlayableCardId,
    status,
    eventsLog = [],
  } = gameState;

  const currentPlayer = players[currentTurn];
  const isMyTurn = currentPlayer?.userId === currentUserId;
  const me = players.find((p) => p.userId === currentUserId);
  const myHand = me?.hand || [];
  const opponents = players.filter((p) => p.userId !== currentUserId);

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
      {/* Barra Superior de Oponentes */}
      <div className="unoOpponentsBar">
        {opponents.map((opp) => {
          const isOppTurn = currentPlayer?.userId === opp.userId;
          const hasOneCard = opp.cardCount === 1;

          return (
            <div
              key={opp.userId}
              className={`opponentCard ${isOppTurn ? "activeTurn" : ""}`}
            >
              <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                {opp.displayName?.[0] || "?"}
              </div>
              <div className="oppMeta">
                <strong>{opp.displayName || opp.username}</strong>
                <small>{opp.cardCount} cartas</small>
              </div>

              {hasOneCard && opp.calledUno && (
                <span className="oppUnoCall">UNO!</span>
              )}

              {hasOneCard && !opp.calledUno && isMyTurn && (
                <button
                  className="catchUnoBtn"
                  title="Pegar Uno: penaliza o colega com 2 cartas se ele não gritou UNO!"
                  onClick={() => onCatchUno(opp.userId)}
                >
                  🚨 Denunciar UNO
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Centro da Mesa: Pilha de Descarte e Monte de Compras */}
      <div className="unoCenterTable">
        <div className={`activeColorIndicator ${activeColor}`}>
          Cor Ativa: {COLOR_NAMES_PT[activeColor] || activeColor}{" "}
          {direction === 1 ? "↻" : "↺"}
        </div>

        {/* Monte de Compras (Draw Pile) */}
        <div className="deckPile">
          <div
            className="deckCardBack"
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
          <span>Comprar</span>
        </div>

        {/* Pilha de Descarte (Top Card) */}
        {topCard && (
          <div className={`unoCard ${topCard.color}`}>
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
        )}
      </div>

      {/* Notificação da Última Ação */}
      {lastEvent && (
        <div className="text-center text-xs font-semibold text-slate-300 py-1 bg-slate-900/60 rounded-lg mx-auto px-4 max-w-lg border border-slate-800">
          {lastEvent.message}
        </div>
      )}

      {/* Área da Mão do Jogador Atual */}
      <div className="unoPlayerHandArea">
        <div className="handActionBar">
          <span className="turnStatusText">
            {isMyTurn
              ? "🎮 Sua vez de jogar!"
              : `Vez de ${currentPlayer?.displayName || "..."}`}
          </span>

          <div className="handButtons">
            {/* Botão de Gritar UNO */}
            {myHand.length <= 2 && (
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
          {myHand.map((card) => {
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
          })}
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
