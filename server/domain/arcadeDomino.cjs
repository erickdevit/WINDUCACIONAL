/**
 * Lógica do jogo Dominó (2 a 4 jogadores)
 */

function generateDominoTiles() {
  const tiles = [];
  let idCounter = 1;
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      tiles.push({
        id: `tile_${idCounter++}_${i}_${j}`,
        left: i,
        right: j,
        isDouble: i === j,
      });
    }
  }
  return tiles;
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function initDominoGame(players) {
  if (!Array.isArray(players) || players.length < 2 || players.length > 4) {
    throw new Error("O jogo de Dominó exige entre 2 e 4 jogadores.");
  }

  const allTiles = shuffle(generateDominoTiles());
  const numPlayers = players.length;
  // Regra padrão de entrega: 7 pedras por jogador se 2 jogadores; 7 pedras se 3 ou 4 (ou 6 dependendo da variante, mantemos 7)
  const tilesPerPlayer = 7;

  const gamePlayers = players.map((p, idx) => {
    const hand = allTiles.splice(0, tilesPerPlayer);
    return {
      userId: p.userId,
      username: p.username,
      displayName: p.displayName || p.username,
      seatIndex: idx,
      hand,
      score: 0,
    };
  });

  const boneyard = allTiles; // Peças restantes no dorme/monte

  // Determina quem começa: quem tiver a maior bucha (duplo 6-6, 5-5, etc.) ou a maior pedra
  let startingPlayerIndex = 0;
  let highestDouble = -1;
  let highestTileSum = -1;

  gamePlayers.forEach((p, index) => {
    p.hand.forEach((tile) => {
      if (tile.isDouble && tile.left > highestDouble) {
        highestDouble = tile.left;
        startingPlayerIndex = index;
      }
    });
  });

  if (highestDouble === -1) {
    gamePlayers.forEach((p, index) => {
      p.hand.forEach((tile) => {
        const sum = tile.left + tile.right;
        if (sum > highestTileSum) {
          highestTileSum = sum;
          startingPlayerIndex = index;
        }
      });
    });
  }

  return {
    players: gamePlayers,
    board: [], // Array de pedras jogadas na mesa [{ tile, end: 'left'|'right', flipped: boolean }]
    leftEnd: null, // Valor da ponta esquerda jogável na mesa
    rightEnd: null, // Valor da ponta direita jogável na mesa
    boneyard,
    currentTurn: startingPlayerIndex,
    consecutivePasses: 0,
    winner: null,
    status: "PLAYING",
    lastActionMessage: `Partida iniciada! Vez de ${gamePlayers[startingPlayerIndex].displayName}.`,
  };
}

function canPlayTile(tile, leftEnd, rightEnd) {
  if (leftEnd === null && rightEnd === null) return true; // Mesa vazia
  return (
    tile.left === leftEnd ||
    tile.right === leftEnd ||
    tile.left === rightEnd ||
    tile.right === rightEnd
  );
}

function hasValidMove(playerHand, leftEnd, rightEnd) {
  if (leftEnd === null && rightEnd === null) return true;
  return playerHand.some((tile) => canPlayTile(tile, leftEnd, rightEnd));
}

function playDominoTile(gameState, userId, tileId, targetEnd) {
  if (!gameState || gameState.status !== "PLAYING") {
    throw new Error("A partida não está em andamento.");
  }

  const currentPlayer = gameState.players[gameState.currentTurn];
  if (currentPlayer.userId !== userId) {
    throw new Error("Não é o seu turno.");
  }

  const tileIndex = currentPlayer.hand.findIndex((t) => t.id === tileId);
  if (tileIndex === -1) {
    throw new Error("Você não possui esta pedra.");
  }

  const tile = currentPlayer.hand[tileIndex];

  if (!canPlayTile(tile, gameState.leftEnd, gameState.rightEnd)) {
    throw new Error("Esta pedra não encaixa em nenhuma das pontas da mesa.");
  }

  let playedEnd = targetEnd; // 'left' ou 'right'
  let flipped = false;

  if (gameState.board.length === 0) {
    // Primeira pedra da mesa
    gameState.board.push({ tile, flipped: false });
    gameState.leftEnd = tile.left;
    gameState.rightEnd = tile.right;
  } else {
    // Escolhe ponta se não especificada
    if (!playedEnd) {
      if (tile.left === gameState.leftEnd || tile.right === gameState.leftEnd) {
        playedEnd = "left";
      } else {
        playedEnd = "right";
      }
    }

    if (playedEnd === "left") {
      if (tile.right === gameState.leftEnd) {
        flipped = false;
        gameState.leftEnd = tile.left;
      } else if (tile.left === gameState.leftEnd) {
        flipped = true;
        gameState.leftEnd = tile.right;
      } else {
        throw new Error("A pedra não se encaixa na ponta esquerda.");
      }
      gameState.board.unshift({ tile, end: "left", flipped });
    } else if (playedEnd === "right") {
      if (tile.left === gameState.rightEnd) {
        flipped = false;
        gameState.rightEnd = tile.right;
      } else if (tile.right === gameState.rightEnd) {
        flipped = true;
        gameState.rightEnd = tile.left;
      } else {
        throw new Error("A pedra não se encaixa na ponta direita.");
      }
      gameState.board.push({ tile, end: "right", flipped });
    }
  }

  // Remove pedra da mão do jogador
  currentPlayer.hand.splice(tileIndex, 1);
  gameState.consecutivePasses = 0;

  // Checa se o jogador bateu (acabaram suas pedras)
  if (currentPlayer.hand.length === 0) {
    gameState.status = "FINISHED";
    gameState.winner = currentPlayer.userId;
    gameState.lastActionMessage = `🏆 ${currentPlayer.displayName} bateu e venceu a partida de Dominó!`;
    return gameState;
  }

  // Avança o turno
  gameState.currentTurn = (gameState.currentTurn + 1) % gameState.players.length;
  const nextPlayer = gameState.players[gameState.currentTurn];
  gameState.lastActionMessage = `${currentPlayer.displayName} jogou uma pedra. Vez de ${nextPlayer.displayName}.`;

  return gameState;
}

function drawDominoTile(gameState, userId) {
  if (!gameState || gameState.status !== "PLAYING") {
    throw new Error("A partida não está em andamento.");
  }

  const currentPlayer = gameState.players[gameState.currentTurn];
  if (currentPlayer.userId !== userId) {
    throw new Error("Não é o seu turno.");
  }

  if (hasValidMove(currentPlayer.hand, gameState.leftEnd, gameState.rightEnd)) {
    throw new Error("Você já possui pedras jogáveis em mãos e não pode comprar do dorme.");
  }

  if (gameState.boneyard.length === 0) {
    throw new Error("O dorme está vazio.");
  }

  const drawnTile = gameState.boneyard.pop();
  currentPlayer.hand.push(drawnTile);

  gameState.lastActionMessage = `${currentPlayer.displayName} comprou uma pedra do dorme.`;
  return gameState;
}

function passDominoTurn(gameState, userId) {
  if (!gameState || gameState.status !== "PLAYING") {
    throw new Error("A partida não está em andamento.");
  }

  const currentPlayer = gameState.players[gameState.currentTurn];
  if (currentPlayer.userId !== userId) {
    throw new Error("Não é o seu turno.");
  }

  if (hasValidMove(currentPlayer.hand, gameState.leftEnd, gameState.rightEnd)) {
    throw new Error("Você possui pedras jogáveis e não pode passar a vez.");
  }

  if (gameState.boneyard.length > 0) {
    throw new Error("Você ainda precisa comprar do dorme antes de passar o turno.");
  }

  gameState.consecutivePasses += 1;

  // Se todos os jogadores passaram em sequência, o jogo fechou/traveu
  if (gameState.consecutivePasses >= gameState.players.length) {
    gameState.status = "FINISHED";

    // Calcula quem tem a menor soma de pontos nas pedras restantes
    let minPoints = Infinity;
    let winnerId = gameState.players[0].userId;

    gameState.players.forEach((p) => {
      const playerSum = p.hand.reduce((sum, tile) => sum + tile.left + tile.right, 0);
      if (playerSum < minPoints) {
        minPoints = playerSum;
        winnerId = p.userId;
      }
    });

    const winningPlayer = gameState.players.find((p) => p.userId === winnerId);
    gameState.winner = winnerId;
    gameState.lastActionMessage = `🔒 Jogo fechado! ${winningPlayer.displayName} venceu por menor pontuação de pedras restantes (${minPoints} pts).`;
    return gameState;
  }

  gameState.currentTurn = (gameState.currentTurn + 1) % gameState.players.length;
  const nextPlayer = gameState.players[gameState.currentTurn];
  gameState.lastActionMessage = `${currentPlayer.displayName} passou a vez. Vez de ${nextPlayer.displayName}.`;

  return gameState;
}

module.exports = {
  initDominoGame,
  playDominoTile,
  drawDominoTile,
  passDominoTurn,
  canPlayTile,
  hasValidMove,
};
