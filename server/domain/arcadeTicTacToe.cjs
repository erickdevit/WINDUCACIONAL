/**
 * Lógica do Jogo da Velha (Tic-Tac-Toe) - 2 Jogadores
 */

function initTicTacToeGame(players) {
  if (!Array.isArray(players) || players.length !== 2) {
    throw new Error("O Jogo da Velha precisa de exatamente 2 jogadores.");
  }

  const gamePlayers = players.map((p, idx) => ({
    userId: p.userId,
    username: p.username,
    displayName: p.displayName || p.username,
    symbol: idx === 0 ? "X" : "O",
    seatIndex: idx,
  }));

  return {
    players: gamePlayers,
    board: Array(9).fill(null), // Array de 9 posições (0 a 8)
    currentTurn: 0, // 0 = X, 1 = O
    status: "PLAYING",
    winner: null,
    winningLine: null, // Posições vencedoras, ex: [0, 1, 2]
    lastActionMessage: `Partida iniciada! Vez de ${gamePlayers[0].displayName} (${gamePlayers[0].symbol}).`,
  };
}

const WINNING_COMBINATIONS = [
  [0, 1, 2], // Linhas
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6], // Colunas
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8], // Diagonais
  [2, 4, 6],
];

function checkTicTacToeWinner(board) {
  for (const combo of WINNING_COMBINATIONS) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winnerSymbol: board[a], line: combo };
    }
  }
  return null;
}

function makeTicTacToeMove(gameState, userId, position) {
  if (!gameState || gameState.status !== "PLAYING") {
    throw new Error("A partida não está em andamento.");
  }

  const currentPlayer = gameState.players[gameState.currentTurn];
  if (currentPlayer.userId !== userId) {
    throw new Error("Não é o seu turno.");
  }

  if (typeof position !== "number" || position < 0 || position > 8) {
    throw new Error("Posição inválida no tabuleiro.");
  }

  if (gameState.board[position] !== null) {
    throw new Error("Esta posição já está ocupada.");
  }

  // Registra o movimento
  gameState.board[position] = currentPlayer.symbol;

  // Checa se houve vencedor
  const winResult = checkTicTacToeWinner(gameState.board);
  if (winResult) {
    gameState.status = "FINISHED";
    gameState.winner = currentPlayer.userId;
    gameState.winningLine = winResult.line;
    gameState.lastActionMessage = `🏆 ${currentPlayer.displayName} (${currentPlayer.symbol}) venceu o Jogo da Velha!`;
    return gameState;
  }

  // Checa se o tabuleiro lotou (Velha / Empate)
  if (gameState.board.every((cell) => cell !== null)) {
    gameState.status = "FINISHED";
    gameState.winner = null; // Empate
    gameState.lastActionMessage = "🤝 Deu Velha! A partida empatou.";
    return gameState;
  }

  // Alterna turno
  gameState.currentTurn = (gameState.currentTurn + 1) % 2;
  const nextPlayer = gameState.players[gameState.currentTurn];
  gameState.lastActionMessage = `${currentPlayer.displayName} marcou na posição ${position + 1}. Vez de ${nextPlayer.displayName} (${nextPlayer.symbol}).`;

  return gameState;
}

module.exports = {
  initTicTacToeGame,
  makeTicTacToeMove,
  checkTicTacToeWinner,
};
