const PVP_PARAGRAPHS = [
  "A digitação eficiente nasce da repetição consciente, da leitura atenta e da capacidade de manter ritmo mesmo quando o texto exige concentração. Em um ambiente educacional, cada palavra digitada com precisão reforça a coordenação entre olhos, mãos e pensamento. O aluno aprende a observar o teclado como ferramenta de trabalho, mas também desenvolve autonomia para escrever respostas, registrar ideias e concluir tarefas digitais com menos esforço.",
  "Durante uma disputa saudável, velocidade e precisão precisam caminhar juntas. Quem acelera sem controle acumula erros, perde vidas e abre espaço para o adversário. Quem mantém calma, corrige o movimento das mãos e respeita a sequência do texto tende a sustentar um desempenho melhor. Por isso, o treinamento competitivo deve valorizar constância, leitura antecipada e domínio das teclas, não apenas impulsos rápidos.",
  "O simulador transforma a prática em uma experiência segura. Cada participante acompanha sua própria linha, percebe o avanço do texto e entende que pequenas decisões influenciam o resultado final. Uma tecla errada interrompe o fluxo, mas também ensina onde a atenção falhou. Uma sequência correta fortalece a confiança e mostra que progresso real depende de disciplina, paciência e revisão contínua.",
  "Em sala de aula, jogos de digitação podem aproximar estudantes de objetivos técnicos sem perder o cuidado pedagógico. O desafio precisa ser claro, justo e limitado aos colegas da mesma turma, preservando contexto e acompanhamento do professor. Quando as regras são transparentes, a competição vira um recurso para motivar, medir evolução e incentivar colaboração depois da partida.",
  "Finalizar um texto longo exige resistência. O participante precisa administrar tempo, respiração e foco visual enquanto avança por frases completas. A vitória pode vir por terminar primeiro, mas também pode surgir quando o oponente perde todas as vidas por excesso de erros. Assim, o jogo ensina que precisão protege o desempenho e que velocidade sem atenção raramente sustenta bons resultados.",
];

export const TYPING_SPACE_GREEN_MAX_LENGTH = 5;
export const TYPING_SPACE_RED_MIN_LENGTH = 9;

export const getTypingSpaceWordClassName = (word = "") => {
  const wordLength = String(word).length;
  if (wordLength <= TYPING_SPACE_GREEN_MAX_LENGTH) return "isShort";
  if (wordLength >= TYPING_SPACE_RED_MIN_LENGTH) return "isLong";
  return "isMedium";
};

const GREEN_SPACE_WORDS = [
  "amor",
  "casa",
  "dado",
  "foco",
  "luz",
  "vida",
  "rota",
  "meta",
  "nave",
  "céu",
  "sol",
  "lua",
  "ar",
  "paz",
  "bom",
  "som",
  "asa",
  "voo",
  "agir",
  "fase",
  "mão",
  "pão",
  "cão",
  "rio",
  "mar",
  "aula",
  "livro",
  "mouse",
  "tecla",
  "linha",
];

const YELLOW_SPACE_WORDS = [
  "teclado",
  "planeta",
  "energia",
  "comando",
  "galáxia",
  "satélite",
  "controle",
  "preciso",
  "vitória",
  "missão",
  "destino",
  "impulso",
  "defesa",
  "ataque",
  "sistema",
  "estação",
  "orbital",
  "cratera",
  "nebulosa",
  "foguete",
  "capitão",
  "posição",
  "leitura",
  "prática",
  "arquivo",
  "janela",
  "revisão",
  "memória",
  "resposta",
  "código",
];

const RED_SPACE_WORDS = [
  "aprendizado",
  "concentração",
  "velocidade",
  "coordenação",
  "estratégia",
  "navegação",
  "resistência",
  "observação",
  "tecnologia",
  "constelação",
  "sincronizado",
  "exploração",
  "transmissão",
  "aproximação",
  "tripulação",
  "hiperespaço",
  "meteoritos",
  "propulsão",
  "diagnóstico",
  "comunicação",
  "estabilidade",
  "persistência",
  "rendimento",
  "autonomia",
];

const buildMissionWords = (sourceWords, totalWords) =>
  Array.from(
    { length: totalWords },
    (_, index) => sourceWords[index % sourceWords.length]
  );

export const TYPING_SPACE_MISSIONS = [
  {
    id: "orbita-inicial",
    title: "Órbita Inicial",
    difficulty: "Aquecimento",
    words: buildMissionWords(GREEN_SPACE_WORDS, 50),
  },
  {
    id: "chuva-de-meteoros",
    title: "Chuva de Meteoros",
    difficulty: "Intermediário",
    words: buildMissionWords(
      [...GREEN_SPACE_WORDS, ...YELLOW_SPACE_WORDS],
      100
    ),
  },
  {
    id: "fronteira-estelar",
    title: "Fronteira Estelar",
    difficulty: "Avançado",
    words: buildMissionWords([...YELLOW_SPACE_WORDS, ...RED_SPACE_WORDS], 150),
  },
];

export const buildTypingPvpText = (targetWords = 520) => {
  const words = [];
  let paragraphIndex = 0;

  while (words.length < targetWords) {
    const rawWords =
      PVP_PARAGRAPHS[paragraphIndex % PVP_PARAGRAPHS.length].split(/\s+/);
    for (const w of rawWords) {
      const clean = w.replace(/[^\p{L}]/gu, "").toLowerCase();
      if (clean.length >= 2) {
        words.push(clean);
      }
    }
    paragraphIndex += 1;
  }

  return words.slice(0, targetWords).join(" ");
};

export const calculateTypingGameAccuracy = (hits, errors) => {
  const total = hits + errors;
  if (total <= 0) return 100;
  return Math.max(0, Math.floor((hits / total) * 100));
};

export const calculateTypingGameWpm = (hits, elapsedMs) => {
  if (!hits || elapsedMs <= 0) return 0;
  return Math.max(0, Math.round(hits / 5 / Math.max(0.01, elapsedMs / 60000)));
};

export const readTypingGameScores = (username) => {
  try {
    const saved = window.localStorage.getItem(`typingSpaceScores_${username}`);
    const scores = saved ? JSON.parse(saved) : [];
    return Array.isArray(scores) ? scores : [];
  } catch (error) {
    return [];
  }
};

export const writeTypingGameScore = (username, score) => {
  const nextScores = [score, ...readTypingGameScores(username)]
    .sort(
      (a, b) => b.score - a.score || b.wpm - a.wpm || b.accuracy - a.accuracy
    )
    .slice(0, 12);
  window.localStorage.setItem(
    `typingSpaceScores_${username}`,
    JSON.stringify(nextScores)
  );
  return nextScores;
};
