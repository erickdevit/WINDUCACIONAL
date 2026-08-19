import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  chooseTypingDifficultyOverride,
  getTypingDifficultyOverrideTarget,
  normalizeTypingDifficultyMode,
  normalizeTypingDifficultyScope,
} = require("../server/domain/typingDifficulty.cjs");

describe("Dificuldade direcionada de Digitação", () => {
  it("normaliza modo e escopo sem aceitar variações inconsistentes", () => {
    expect(normalizeTypingDifficultyMode(" GAME ")).toBe("game");
    expect(normalizeTypingDifficultyScope(" Student ")).toBe("student");
    expect(() => normalizeTypingDifficultyMode("arcade")).toThrow();
    expect(() => normalizeTypingDifficultyScope("students")).toThrow();
  });

  it("aplica a precedência aluno, turma e tipo base", () => {
    const turma = { source: "turma", passMinWpm: 55 };
    const student = { source: "student", passMinWpm: 70 };
    expect(chooseTypingDifficultyOverride({ student, turma })).toBe(student);
    expect(chooseTypingDifficultyOverride({ student: null, turma })).toBe(turma);
    expect(chooseTypingDifficultyOverride({ student: null, turma: null })).toBeNull();
  });

  it("usa o índice único parcial correspondente ao salvar cada alvo", () => {
    expect(getTypingDifficultyOverrideTarget("turma")).toEqual({
      column: "turma_id",
      conflictTarget: "(mode, turma_id) WHERE scope_type = 'turma'",
    });
    expect(getTypingDifficultyOverrideTarget("student")).toEqual({
      column: "student_id",
      conflictTarget: "(mode, student_id) WHERE scope_type = 'student'",
    });
    expect(() => getTypingDifficultyOverrideTarget("type")).toThrow(
      "não possui um alvo"
    );
  });

  it("mantém a migration com alvos exclusivos e índices por modo", () => {
    const migration = fs.readFileSync(
      path.resolve(
        process.cwd(),
        "server/db/migrations/0008_typing_difficulty_overrides.sql"
      ),
      "utf8"
    );
    expect(migration).toContain("typing_difficulty_overrides");
    expect(migration).toContain("scope_type IN ('turma', 'student')");
    expect(migration).toContain("idx_typing_difficulty_override_turma");
    expect(migration).toContain("idx_typing_difficulty_override_student");
    expect(migration).toContain("student_id IS NULL");
    expect(migration).toContain("turma_id IS NULL");
  });

  it("amplia somente os erros das lições para até 100", () => {
    const migration = fs.readFileSync(
      path.resolve(
        process.cwd(),
        "server/db/migrations/0009_typing_lesson_error_limit.sql"
      ),
      "utf8"
    );
    const server = fs.readFileSync(
      path.resolve(process.cwd(), "server/index.cjs"),
      "utf8"
    );

    expect(migration).toContain("max_errors BETWEEN 3 AND 100");
    expect(migration).not.toContain("max_lives");
    expect(server).toContain(
      "clampInteger(payload.maxErrors, current.maxErrors, 3, 100)"
    );
    expect(server).toContain(
      "clampInteger(payload.maxLives, current.maxLives, 3, 10)"
    );
  });

  it("mantém a quantidade de parâmetros do direcionamento compatível com a consulta", () => {
    const server = fs.readFileSync(
      path.resolve(process.cwd(), "server/index.cjs"),
      "utf8"
    );
    const start = server.indexOf("const saveTypingDifficultyOverride");
    const end = server.indexOf(
      "const deleteTypingDifficultyOverride",
      start
    );
    const saveBlock = server.slice(start, end);

    expect(saveBlock).toContain(
      "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())"
    );
    expect(saveBlock).not.toContain("$11");
    expect(saveBlock).toContain("normalized.gameSpeedBoost");
  });
});
