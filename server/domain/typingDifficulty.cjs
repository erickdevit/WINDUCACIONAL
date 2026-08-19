const normalizeTypingDifficultyMode = (mode) => {
  const normalized = String(mode || "lesson").trim().toLowerCase();
  if (!["lesson", "game"].includes(normalized)) {
    const error = new Error("Modo de dificuldade inválido.");
    error.status = 400;
    throw error;
  }
  return normalized;
};

const normalizeTypingDifficultyScope = (scope) => {
  const normalized = String(scope || "").trim().toLowerCase();
  if (!["type", "turma", "student"].includes(normalized)) {
    const error = new Error("Escopo de dificuldade inválido.");
    error.status = 400;
    throw error;
  }
  return normalized;
};

const chooseTypingDifficultyOverride = ({ student, turma }) =>
  student || turma || null;

module.exports = {
  chooseTypingDifficultyOverride,
  normalizeTypingDifficultyMode,
  normalizeTypingDifficultyScope,
};
