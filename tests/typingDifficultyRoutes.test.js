import { describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const injectTypingRoutes = require("../server/routes/typing.cjs");

const buildRoutes = (overrides = {}) => {
  const routes = {};
  const app = {};
  for (const method of ["get", "put", "post", "delete"]) {
    app[method] = (path, ...handlers) => {
      routes[`${method.toUpperCase()} ${path}`] = handlers;
    };
  }
  const passthrough = (_req, _res, next) => next();
  injectTypingRoutes({
    app,
    broadcastTypingGameSettings: vi.fn().mockResolvedValue(undefined),
    broadcastTypingSettings: vi.fn().mockResolvedValue(undefined),
    clampInteger: (value, fallback) => Number(value) || fallback,
    deleteTypingDifficultyOverride: vi.fn().mockResolvedValue(true),
    getEffectiveTypingSettings: vi.fn().mockResolvedValue({
      settings: { studentType: "kids", passMinWpm: 60 },
      source: "student",
      override: { scope: "student" },
    }),
    getTypingGameSettings: vi.fn(),
    getTypingSettings: vi.fn(),
    isUuid: (value) => /^[0-9a-f-]{36}$/i.test(String(value)),
    normalizeTurmaCode: (value) => String(value || "").toUpperCase(),
    normalizeTypingDifficultyMode: (value) => String(value).trim().toLowerCase(),
    normalizeTypingDifficultyScope: (value) => String(value).trim().toLowerCase(),
    normalizeTypingStudentType: (value) => String(value || "normal").toLowerCase(),
    pool: overrides.pool || { query: vi.fn() },
    publicTypingDifficultyOverride: (value) => value,
    requireAuth: passthrough,
    requireProfessor: passthrough,
    saveTypingDifficultyOverride: vi.fn().mockResolvedValue({ scope: "student" }),
    saveTypingGameSettings: vi.fn(),
    saveTypingSettings: vi.fn(),
    typingGameSettingsClients: new Set(),
    typingSettingsClients: new Set(),
    writeTypingGameSettingsEvent: vi.fn(),
    writeTypingSettingsEvent: vi.fn(),
    ...overrides,
  });
  return routes;
};

const response = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
  end: vi.fn(),
});

const studentId = "11111111-1111-4111-8111-111111111111";
const turmaId = "22222222-2222-4222-8222-222222222222";

describe("Rotas de dificuldade direcionada", () => {
  it("deriva o tipo da turma e ignora o tipo enviado pelo cliente", async () => {
    const pool = { query: vi.fn().mockResolvedValue({
      rowCount: 1,
      rows: [{ id: studentId, turma_id: turmaId, student_type: "kids", role: "aluno", active: true }],
    }) };
    const save = vi.fn().mockResolvedValue({ scope: "student" });
    const effective = vi.fn().mockResolvedValue({
      settings: { studentType: "kids" },
      source: "student",
      override: { scope: "student" },
    });
    const routes = buildRoutes({
      pool,
      saveTypingDifficultyOverride: save,
      getEffectiveTypingSettings: effective,
    });
    const req = {
      body: {
        mode: " GAME ",
        scope: " Student ",
        studentId,
        studentType: "normal",
        settings: { maxLives: 4 },
      },
    };
    const res = response();
    await routes["PUT /api/typing/difficulty"].at(-1)(req, res, vi.fn());

    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      mode: "game",
      scope: "student",
      turmaId,
      studentId,
      payload: expect.objectContaining({ studentType: "kids" }),
    }));
  });

  it("rejeita aluno associado a uma turma diferente da selecionada", async () => {
    const pool = { query: vi.fn().mockResolvedValue({
      rowCount: 1,
      rows: [{ id: studentId, turma_id: turmaId, student_type: "kids", role: "aluno", active: true }],
    }) };
    const routes = buildRoutes({ pool });
    const req = {
      body: {
        mode: "lesson",
        scope: "student",
        studentId,
        turmaId: "33333333-3333-4333-8333-333333333333",
      },
    };
    const next = vi.fn();
    await routes["PUT /api/typing/difficulty"].at(-1)(req, response(), next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Aluno não pertence à turma selecionada." })
    );
  });
});
