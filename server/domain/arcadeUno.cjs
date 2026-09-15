/**
 * Regras do Jogo Uno Multiplayer da Turma (3 até a turma toda)
 * Baralho adaptativo com suporte a dezenas de jogadores simultâneos.
 */

const crypto = require("node:crypto");

const COLORS = ["red", "blue", "green", "yellow"];
const NUMBERS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const ACTIONS = ["skip", "reverse", "draw2"];

/**
 * Cria um conjunto padrão de 108 cartas
 */
const createStandardUnoDeck = (deckIndex = 0) => {
  const cards = [];

  for (const color of COLORS) {
    // Um 0 de cada cor
    cards.push({
      id: `${color}_0_${deckIndex}_${crypto.randomBytes(4).toString("hex")}`,
      color,
      value: "0",
    });

    // Dois de 1 a 9 de cada cor
    for (let n = 1; n <= 9; n++) {
      const val = String(n);
      cards.push({
        id: `${color}_${val}_a_${deckIndex}_${crypto
          .randomBytes(4)
          .toString("hex")}`,
        color,
        value: val,
      });
      cards.push({
        id: `${color}_${val}_b_${deckIndex}_${crypto
          .randomBytes(4)
          .toString("hex")}`,
        color,
        value: val,
      });
    }

    // Duas cartas de cada ação especial por cor
    for (const action of ACTIONS) {
      cards.push({
        id: `${color}_${action}_a_${deckIndex}_${crypto
          .randomBytes(4)
          .toString("hex")}`,
        color,
        value: action,
      });
      cards.push({
        id: `${color}_${action}_b_${deckIndex}_${crypto
          .randomBytes(4)
          .toString("hex")}`,
        color,
        value: action,
      });
    }
  }

  // 4 Coringas (Wild) e 4 Coringas +4 (Wild Draw 4)
  for (let w = 0; w < 4; w++) {
    cards.push({
      id: `wild_color_${deckIndex}_${w}_${crypto
        .randomBytes(4)
        .toString("hex")}`,
      color: "wild",
      value: "wild",
    });
    cards.push({
      id: `wild_draw4_${deckIndex}_${w}_${crypto
        .randomBytes(4)
        .toString("hex")}`,
      color: "wild",
      value: "wild4",
    });
  }

  return cards;
};

/**
 * Embaralha um array usando Fisher-Yates
 */
const shuffle = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

/**
 * Calcula o próximo índice de jogador respeitando a direção do jogo
 */
const getNextPlayerIndex = (
  currentIndex,
  direction,
  totalPlayers,
  step = 1
) => {
  return (
    (((currentIndex + direction * step) % totalPlayers) + totalPlayers) %
    totalPlayers
  );
};

/**
 * Inicializa uma partida de Uno para os jogadores fornecidos
 */
const initUnoGame = (playerList) => {
  if (!playerList || playerList.length < 2) {
    throw new Error("O Uno requer no mínimo 2 jogadores.");
  }
  if (playerList.length > 6) {
    throw new Error("A mesa de Uno comporta no máximo 6 jogadores.");
  }

  // Escala a quantidade de baralhos de acordo com o tamanho da turma (ex: 30 alunos)
  const numDecks = Math.max(1, Math.ceil(playerList.length / 5));
  let fullDeck = [];
  for (let d = 0; d < numDecks; d++) {
    fullDeck.push(...createStandardUnoDeck(d));
  }
  fullDeck = shuffle(fullDeck);

  // Distribui 7 cartas para cada jogador
  const players = playerList.map((p, index) => {
    const hand = fullDeck.splice(0, 7);
    return {
      userId: p.userId,
      username: p.username,
      displayName: p.displayName,
      seatIndex: index,
      hand,
      calledUno: false,
    };
  });

  // Puxa a primeira carta da pilha de descarte garantindo que seja um número colorido
  let topCardIndex = fullDeck.findIndex(
    (card) => card.color !== "wild" && NUMBERS.includes(card.value)
  );
  if (topCardIndex === -1) {
    topCardIndex = 0;
  }
  const [topCard] = fullDeck.splice(topCardIndex, 1);

  return {
    players,
    drawPile: fullDeck,
    discardPile: [topCard],
    topCard,
    activeColor: topCard.color,
    currentTurn: 0,
    direction: 1, // 1 = sentido horário, -1 = sentido anti-horário
    drawnThisTurn: false,
    drawnPlayableCardId: null,
    winner: null,
    status: "PLAYING",
    eventsLog: [
      {
        message: `Partida iniciada com a carta ${topCard.color} ${topCard.value}.`,
        timestamp: new Date().toISOString(),
      },
    ],
  };
};

/**
 * Reabastece o monte de compras a partir do monte de descarte
 */
const ensureDrawPile = (state) => {
  if (state.drawPile.length > 0) return state;

  if (state.discardPile.length <= 1) {
    // Se não há cartas descartadas para reciclar, recria um baralho
    state.drawPile = shuffle(createStandardUnoDeck(99));
    return state;
  }

  const topCard = state.discardPile[state.discardPile.length - 1];
  const rest = state.discardPile.slice(0, state.discardPile.length - 1);
  state.discardPile = [topCard];
  state.drawPile = shuffle(rest);
  return state;
};

/**
 * Executa a jogada de uma carta por um jogador
 */
const playUnoCard = (state, userId, cardId, chosenColor = null) => {
  if (state.status !== "PLAYING") {
    throw new Error("A partida já foi encerrada.");
  }

  const currentPlayer = state.players[state.currentTurn];
  if (!currentPlayer || currentPlayer.userId !== userId) {
    throw new Error("Não é a sua vez de jogar.");
  }

  const cardIndex = currentPlayer.hand.findIndex((c) => c.id === cardId);
  if (cardIndex === -1) {
    throw new Error("Carta não encontrada na sua mão.");
  }

  const card = currentPlayer.hand[cardIndex];

  // Validação da regra do Uno
  const isWild = card.color === "wild";
  const colorMatches = card.color === state.activeColor;
  const valueMatches = card.value === state.topCard.value;

  if (!isWild && !colorMatches && !valueMatches) {
    throw new Error(
      "Jogada inválida. A carta deve coincidir com a cor ativa ou com o valor da mesa."
    );
  }

  if (isWild && (!chosenColor || !COLORS.includes(chosenColor))) {
    throw new Error(
      "Você deve escolher uma cor válida (Vermelho, Azul, Verde ou Amarelo) para o Coringa."
    );
  }

  // Remove da mão do jogador
  currentPlayer.hand.splice(cardIndex, 1);

  // Adiciona ao topo do descarte
  state.discardPile.push(card);
  state.topCard = card;
  state.activeColor = isWild ? chosenColor : card.color;
  state.drawnThisTurn = false;
  state.drawnPlayableCardId = null;

  // Atualização do status de UNO
  if (currentPlayer.hand.length === 1) {
    // Se já tinha chamado Uno ou está gritando agora
    // mantemos o status
  } else if (currentPlayer.hand.length > 1) {
    currentPlayer.calledUno = false;
  }

  // Verifica vitória
  if (currentPlayer.hand.length === 0) {
    state.status = "FINISHED";
    state.winner = currentPlayer.userId;
    state.eventsLog.push({
      message: `🎉 ${currentPlayer.displayName} venceu a partida de Uno!`,
      timestamp: new Date().toISOString(),
    });
    return state;
  }

  const totalPlayers = state.players.length;
  let step = 1;
  let actionMessage = `${currentPlayer.displayName} jogou ${
    card.color === "wild" ? "Coringa" : card.color
  } ${card.value}.`;

  if (card.value === "skip") {
    step = 2;
    const skippedPlayer =
      state.players[
        getNextPlayerIndex(state.currentTurn, state.direction, totalPlayers, 1)
      ];
    actionMessage += ` ${skippedPlayer.displayName} foi bloqueado!`;
  } else if (card.value === "reverse") {
    if (totalPlayers === 2) {
      step = 2;
    } else {
      state.direction = -state.direction;
      step = 1;
    }
    actionMessage += ` Sentido do jogo invertido!`;
  } else if (card.value === "draw2") {
    step = 2;
    const nextPlayer =
      state.players[
        getNextPlayerIndex(state.currentTurn, state.direction, totalPlayers, 1)
      ];
    ensureDrawPile(state);
    const drawn = state.drawPile.splice(0, 2);
    nextPlayer.hand.push(...drawn);
    nextPlayer.calledUno = false;
    actionMessage += ` ${nextPlayer.displayName} comprou 2 cartas e perdeu a vez!`;
  } else if (card.value === "wild") {
    step = 1;
    actionMessage += ` Cor alterada para ${state.activeColor}.`;
  } else if (card.value === "wild4") {
    step = 2;
    const nextPlayer =
      state.players[
        getNextPlayerIndex(state.currentTurn, state.direction, totalPlayers, 1)
      ];
    ensureDrawPile(state);
    const drawn = state.drawPile.splice(0, 4);
    nextPlayer.hand.push(...drawn);
    nextPlayer.calledUno = false;
    actionMessage += ` Cor alterada para ${state.activeColor}. ${nextPlayer.displayName} comprou 4 cartas e perdeu a vez!`;
  }

  state.currentTurn = getNextPlayerIndex(
    state.currentTurn,
    state.direction,
    totalPlayers,
    step
  );

  state.eventsLog.push({
    message: actionMessage,
    timestamp: new Date().toISOString(),
  });

  return state;
};

/**
 * Puxa uma carta do monte para o jogador atual
 */
const drawUnoCard = (state, userId) => {
  if (state.status !== "PLAYING") {
    throw new Error("A partida já foi encerrada.");
  }

  const currentPlayer = state.players[state.currentTurn];
  if (!currentPlayer || currentPlayer.userId !== userId) {
    throw new Error("Não é a sua vez de jogar.");
  }

  if (state.drawnThisTurn) {
    throw new Error(
      "Você já comprou uma carta neste turno. Jogue-a ou passe a vez."
    );
  }

  ensureDrawPile(state);
  const [card] = state.drawPile.splice(0, 1);
  currentPlayer.hand.push(card);
  currentPlayer.calledUno = false;
  state.drawnThisTurn = true;

  // Verifica se a carta comprada pode ser jogada
  const isPlayable =
    card.color === "wild" ||
    card.color === state.activeColor ||
    card.value === state.topCard.value;

  if (isPlayable) {
    state.drawnPlayableCardId = card.id;
    state.eventsLog.push({
      message: `${currentPlayer.displayName} comprou uma carta e pode jogá-la.`,
      timestamp: new Date().toISOString(),
    });
  } else {
    // Se não for jogável, avança automaticamente o turno
    state.drawnThisTurn = false;
    state.drawnPlayableCardId = null;
    state.currentTurn = getNextPlayerIndex(
      state.currentTurn,
      state.direction,
      state.players.length,
      1
    );
    state.eventsLog.push({
      message: `${currentPlayer.displayName} comprou uma carta e passou a vez.`,
      timestamp: new Date().toISOString(),
    });
  }

  return state;
};

/**
 * Passa o turno voluntariamente após comprar uma carta jogável
 */
const passUnoTurn = (state, userId) => {
  if (state.status !== "PLAYING") {
    throw new Error("A partida já foi encerrada.");
  }

  const currentPlayer = state.players[state.currentTurn];
  if (!currentPlayer || currentPlayer.userId !== userId) {
    throw new Error("Não é a sua vez de jogar.");
  }

  if (!state.drawnThisTurn) {
    throw new Error("Você só pode passar a vez após comprar uma carta.");
  }

  state.drawnThisTurn = false;
  state.drawnPlayableCardId = null;
  state.currentTurn = getNextPlayerIndex(
    state.currentTurn,
    state.direction,
    state.players.length,
    1
  );

  state.eventsLog.push({
    message: `${currentPlayer.displayName} passou a vez.`,
    timestamp: new Date().toISOString(),
  });

  return state;
};

/**
 * Grita UNO quando o jogador tem 1 ou 2 cartas
 */
const callUno = (state, userId) => {
  const player = state.players.find((p) => p.userId === userId);
  if (!player) throw new Error("Jogador não encontrado na partida.");

  if (player.hand.length > 2) {
    throw new Error("Você só pode gritar UNO com 2 cartas ou menos!");
  }

  player.calledUno = true;
  state.eventsLog.push({
    message: `📢 ${player.displayName} gritou UNO!`,
    timestamp: new Date().toISOString(),
  });

  return state;
};

/**
 * Denuncia um jogador que ficou com 1 carta sem gritar UNO
 */
const catchUno = (state, callerUserId, targetUserId) => {
  const caller = state.players.find((p) => p.userId === callerUserId);
  const target = state.players.find((p) => p.userId === targetUserId);

  if (!caller || !target) {
    throw new Error("Jogador não encontrado.");
  }

  if (target.hand.length === 1 && !target.calledUno) {
    ensureDrawPile(state);
    const penaltyCards = state.drawPile.splice(0, 2);
    target.hand.push(...penaltyCards);
    target.calledUno = false;

    state.eventsLog.push({
      message: `🚨 ${caller.displayName} denunciou ${target.displayName}! ${target.displayName} comprou 2 cartas de penalidade por não gritar UNO!`,
      timestamp: new Date().toISOString(),
    });

    return {
      penalized: true,
      message: `${target.displayName} foi penalizado com 2 cartas!`,
    };
  }

  return {
    penalized: false,
    message: "O jogador já gritou UNO ou não possui apenas 1 carta.",
  };
};

module.exports = {
  COLORS,
  NUMBERS,
  ACTIONS,
  createStandardUnoDeck,
  initUnoGame,
  playUnoCard,
  drawUnoCard,
  passUnoTurn,
  callUno,
  catchUno,
};
