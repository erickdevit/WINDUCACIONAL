/**
 * Lógica do Jogo da Forca (2 a 4 jogadores)
 */

const EDUCATIONAL_WORDS = [
  { word: "COMPUTADOR", category: "Tecnologia", hint: "Dispositivo para processamento de dados" },
  { word: "ALGORITMO", category: "Tecnologia", hint: "Sequência de instruções e regras" },
  { word: "INTERNET", category: "Tecnologia", hint: "Rede mundial de computadores" },
  { word: "TECLADO", category: "Informática", hint: "Periférico de entrada com letras e números" },
  { word: "MONITOR", category: "Informática", hint: "Tela que exibe visualmente as informações" },
  { word: "PROFESSOR", category: "Escola", hint: "Profissional que guia o aprendizado" },
  { word: "ESTUDANTE", category: "Escola", hint: "Pessoa dedicada aos estudos" },
  { word: "BIBLIOTECA", category: "Escola", hint: "Local com acervo de livros e pesquisas" },
  { word: "CIENCIA", category: "Matéria", hint: "Conhecimento sistemático do mundo natural" },
  { word: "MATEMATICA", category: "Matéria", hint: "Estudo de números, formas e quantidades" },
  { word: "GEOGRAFIA", category: "Matéria", hint: "Estudo da Terra e de seus fenômenos" },
  { word: "HISTORIA", category: "Matéria", hint: "Estudo dos acontecimentos do passado" },
  { word: "PORTUGUES", category: "Matéria", hint: "Nossa língua oficial e gramática" },
  { word: "LIVRO", category: "Material", hint: "Conjunto de páginas impressas e encadernadas" },
  { word: "CUBO", category: "Geometria", hint: "Sólido geométrico com seis faces quadradas" },
  { word: "PLANETA", category: "Astronomia", hint: "Corpo celeste que orbita uma estrela" },
  { word: "TECNOLOGIA", category: "Conceito", hint: "Aplicação do conhecimento científico" },
];

function normalizeChar(char) {
  return String(char || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function initHangmanGame(players) {
  if (!Array.isArray(players) || players.length < 2 || players.length > 4) {
    throw new Error("O Jogo da Forca exige entre 2 e 4 jogadores.");
  }

  const selected =
    EDUCATIONAL_WORDS[Math.floor(Math.random() * EDUCATIONAL_WORDS.length)];

  const secretWordNormalized = normalizeChar(selected.word);

  const gamePlayers = players.map((p, idx) => ({
    userId: p.userId,
    username: p.username,
    displayName: p.displayName || p.username,
    seatIndex: idx,
    score: 0,
  }));

  return {
    players: gamePlayers,
    secretWord: secretWordNormalized, // Armazenada em maiúsculo sem acento
    displayWord: selected.word.toUpperCase(), // Versão com acentos originais para exibição final
    category: selected.category,
    hint: selected.hint,
    guessedLetters: [], // Letras já tentadas
    wrongGuesses: 0,
    maxWrongGuesses: 6,
    currentTurn: 0,
    status: "PLAYING",
    winner: null, // userId do jogador que acertou a palavra
    lastActionMessage: `Partida de Forca iniciada! Categoria: ${selected.category}. Vez de ${gamePlayers[0].displayName}.`,
  };
}

function getMaskedWord(secretWord, displayWord, guessedLetters) {
  const lettersSet = new Set(guessedLetters.map((l) => normalizeChar(l)));
  let masked = "";

  for (let i = 0; i < secretWord.length; i++) {
    const rawChar = displayWord[i];
    const normChar = secretWord[i];

    if (normChar === " " || normChar === "-") {
      masked += normChar;
    } else if (lettersSet.has(normChar)) {
      masked += rawChar;
    } else {
      masked += "_";
    }
  }

  return masked;
}

function guessHangmanLetter(gameState, userId, letter) {
  if (!gameState || gameState.status !== "PLAYING") {
    throw new Error("A partida não está em andamento.");
  }

  const currentPlayer = gameState.players[gameState.currentTurn];
  if (currentPlayer.userId !== userId) {
    throw new Error("Não é o seu turno.");
  }

  const normLetter = normalizeChar(letter);
  if (!normLetter || normLetter.length !== 1 || !/[A-Z]/.test(normLetter)) {
    throw new Error("Por favor, envie uma letra válida de A a Z.");
  }

  if (gameState.guessedLetters.includes(normLetter)) {
    throw new Error(`A letra '${normLetter}' já foi chutada.`);
  }

  gameState.guessedLetters.push(normLetter);

  const isCorrect = gameState.secretWord.includes(normLetter);

  if (isCorrect) {
    // Checa se completou a palavra
    const masked = getMaskedWord(
      gameState.secretWord,
      gameState.displayWord,
      gameState.guessedLetters
    );

    if (!masked.includes("_")) {
      gameState.status = "FINISHED";
      gameState.winner = currentPlayer.userId;
      gameState.lastActionMessage = `🏆 ${currentPlayer.displayName} acertou a última letra e descobriu a palavra "${gameState.displayWord}"!`;
      return gameState;
    }

    gameState.lastActionMessage = `✨ Boa! ${currentPlayer.displayName} acertou a letra '${normLetter}'. Jogue novamente!`;
    // Em acerto, o jogador continua no seu turno
    return gameState;
  } else {
    gameState.wrongGuesses += 1;

    if (gameState.wrongGuesses >= gameState.maxWrongGuesses) {
      gameState.status = "FINISHED";
      gameState.winner = null; // Todos perderam para a Forca
      gameState.lastActionMessage = `💀 A Forca foi completada! Ninguém acertou. A palavra secreta era "${gameState.displayWord}".`;
      return gameState;
    }

    // Errou a letra -> passa o turno para o próximo
    gameState.currentTurn =
      (gameState.currentTurn + 1) % gameState.players.length;
    const nextPlayer = gameState.players[gameState.currentTurn];
    gameState.lastActionMessage = `❌ A letra '${normLetter}' não está na palavra. Vez de ${nextPlayer.displayName}.`;

    return gameState;
  }
}

function guessHangmanWord(gameState, userId, attemptWord) {
  if (!gameState || gameState.status !== "PLAYING") {
    throw new Error("A partida não está em andamento.");
  }

  const currentPlayer = gameState.players[gameState.currentTurn];
  if (currentPlayer.userId !== userId) {
    throw new Error("Não é o seu turno.");
  }

  const normAttempt = normalizeChar(attemptWord);
  if (!normAttempt || normAttempt.length < 2) {
    throw new Error("Palpite inválido.");
  }

  if (normAttempt === gameState.secretWord) {
    gameState.status = "FINISHED";
    gameState.winner = currentPlayer.userId;
    gameState.lastActionMessage = `🏆 Incrível! ${currentPlayer.displayName} arriscou a palavra inteira e acertou: "${gameState.displayWord}"!`;
    return gameState;
  } else {
    gameState.wrongGuesses += 1;

    if (gameState.wrongGuesses >= gameState.maxWrongGuesses) {
      gameState.status = "FINISHED";
      gameState.winner = null;
      gameState.lastActionMessage = `💀 Palpite incorreto e limite de erros atingido! A palavra era "${gameState.displayWord}".`;
      return gameState;
    }

    gameState.currentTurn =
      (gameState.currentTurn + 1) % gameState.players.length;
    const nextPlayer = gameState.players[gameState.currentTurn];
    gameState.lastActionMessage = `❌ Palpite "${attemptWord.toUpperCase()}" incorreto! Vez de ${nextPlayer.displayName}.`;

    return gameState;
  }
}

module.exports = {
  initHangmanGame,
  getMaskedWord,
  guessHangmanLetter,
  guessHangmanWord,
};
