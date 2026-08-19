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

const getTypingDifficultyOverrideTarget = (scope) => {
  const normalized = normalizeTypingDifficultyScope(scope);
  if (normalized === "turma") {
    return {
      column: "turma_id",
      conflictTarget: "(mode, turma_id) WHERE scope_type = 'turma'",
    };
  }
  if (normalized === "student") {
    return {
      column: "student_id",
      conflictTarget: "(mode, student_id) WHERE scope_type = 'student'",
    };
  }

  const error = new Error(
    "A configuração base não possui um alvo de dificuldade direcionada."
  );
  error.status = 400;
  throw error;
};

module.exports = {
  chooseTypingDifficultyOverride,
  getTypingDifficultyOverrideTarget,
  normalizeTypingDifficultyMode,
  normalizeTypingDifficultyScope,
};
