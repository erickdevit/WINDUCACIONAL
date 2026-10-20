/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { createRequire } from "node:module";
import { TYPING_LESSONS } from "../src/containers/applications/apps/assets/typingLessons";
import { TypingLessonResetSection } from "../src/containers/applications/apps/typing/TypingLessonResetSection";
import { api } from "../src/lib/api";

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

  const defaultRequireAuth = (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Não autenticado." });
    }
    return next();
  };

  const defaultRequireProfessor = (req, res, next) => {
    if (req.user?.role !== "professor") {
      return res
        .status(403)
        .json({ error: "Acesso negado: restrito a professores." });
    }
    return next();
  };

  injectTypingRoutes({
    app,
    broadcastTypingGameSettings: vi.fn().mockResolvedValue(undefined),
    broadcastTypingSettings: vi.fn().mockResolvedValue(undefined),
    clampInteger: (value, fallback) => Number(value) || fallback,
    deleteTypingDifficultyOverride: vi.fn().mockResolvedValue(true),
    getEffectiveTypingSettings: vi.fn().mockResolvedValue({
      settings: { studentType: "normal", passMinWpm: 40, passMinAccuracy: 95 },
      source: "type",
    }),
    getTypingGameSettings: vi.fn(),
    getTypingSettings: vi.fn(),
    isUuid: (value) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        String(value || "")
      ),
    normalizeTurmaCode: (value) => String(value || "").toUpperCase(),
    normalizeTypingDifficultyMode: (value) =>
      String(value).trim().toLowerCase(),
    normalizeTypingDifficultyScope: (value) =>
      String(value).trim().toLowerCase(),
    normalizeTypingStudentType: (value) =>
      String(value || "normal").toLowerCase(),
    pool: overrides.pool || { query: vi.fn() },
    publicTypingDifficultyOverride: (value) => value,
    requireAuth: overrides.requireAuth || defaultRequireAuth,
    requireProfessor: overrides.requireProfessor || defaultRequireProfessor,
    saveTypingDifficultyOverride: vi
      .fn()
      .mockResolvedValue({ scope: "student" }),
    saveTypingGameSettings: vi.fn(),
    saveTypingSettings: vi.fn(),
    typingGameSettingsClients: new Set(),
    typingSettingsClients: overrides.typingSettingsClients || new Set(),
    writeTypingGameSettingsEvent: vi.fn(),
    writeTypingSettingsEvent: vi.fn(),
    ...overrides,
  });

  return routes;
};

const mockResponse = () => {
  const res = {
    statusCode: 200,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json: vi.fn((data) => {
      res.body = data;
      return res;
    }),
    write: vi.fn(),
    flushHeaders: vi.fn(),
    setHeader: vi.fn(),
  };
  return res;
};

const executePipeline = async (handlers, req, res) => {
  let index = 0;
  const next = async (err) => {
    if (err) {
      res.status(err.status || 500).json({ error: err.message });
      return;
    }
    if (index < handlers.length) {
      const handler = handlers[index++];
      await handler(req, res, next);
    }
  };
  await next();
  return res;
};

describe("Endpoints de reset de lições", () => {
  const normalTurmaId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const kidsTurmaId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const normalStudentId = "11111111-1111-4111-8111-111111111111";
  const kidsStudentId = "22222222-2222-4222-8222-222222222222";

  it("bloqueia requisição não autenticada com 401", async () => {
    const routes = buildRoutes();
    const req = {
      user: null,
      body: { scope: "turma", turmaId: normalTurmaId },
    };
    const res = mockResponse();

    await executePipeline(routes["POST /api/typing/lessons/reset"], req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/Não autenticado/);
  });

  it("bloqueia usuário sem papel de professor com 403", async () => {
    const routes = buildRoutes();
    const req = {
      user: { id: normalStudentId, role: "aluno", student_type: "normal" },
      body: { scope: "turma", turmaId: normalTurmaId },
    };
    const res = mockResponse();

    await executePipeline(routes["POST /api/typing/lessons/reset"], req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toMatch(/restrito a professores/);
  });

  it("rejeita escopo inválido com 400", async () => {
    const routes = buildRoutes();
    const req = {
      user: { id: "99999999-9999-4999-8999-999999999999", role: "professor" },
      body: { scope: "invalido", turmaId: normalTurmaId },
    };
    const res = mockResponse();

    await executePipeline(routes["POST /api/typing/lessons/reset"], req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain("Escopo de reset inválido");
  });

  it("rejeita turmaId inválido ou ausente com 400", async () => {
    const routes = buildRoutes();
    const req = {
      user: { id: "99999999-9999-4999-8999-999999999999", role: "professor" },
      body: { scope: "turma", turmaId: "not-a-uuid" },
    };
    const res = mockResponse();

    await executePipeline(routes["POST /api/typing/lessons/reset"], req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain("Identificador de turma inválido");
  });

  it("retorna 404 quando a turma não existe", async () => {
    const pool = {
      query: vi.fn().mockResolvedValue({ rowCount: 0, rows: [] }),
    };
    const routes = buildRoutes({ pool });
    const req = {
      user: { id: "99999999-9999-4999-8999-999999999999", role: "professor" },
      body: { scope: "turma", turmaId: normalTurmaId },
    };
    const res = mockResponse();

    await executePipeline(routes["POST /api/typing/lessons/reset"], req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toContain("Turma não encontrada");
  });

  it("retorna 400 quando a turma não é do tipo Normal", async () => {
    const pool = {
      query: vi.fn().mockResolvedValue({
        rowCount: 1,
        rows: [
          {
            id: kidsTurmaId,
            nome: "Turma Kids",
            student_type: "kids",
            active: true,
          },
        ],
      }),
    };
    const routes = buildRoutes({ pool });
    const req = {
      user: { id: "99999999-9999-4999-8999-999999999999", role: "professor" },
      body: { scope: "turma", turmaId: kidsTurmaId },
    };
    const res = mockResponse();

    await executePipeline(routes["POST /api/typing/lessons/reset"], req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain(
      "Apenas turmas do tipo Normal são permitidas"
    );
  });

  it("retorna 404 quando o aluno não existe", async () => {
    const pool = {
      query: vi.fn().mockResolvedValue({ rowCount: 0, rows: [] }),
    };
    const routes = buildRoutes({ pool });
    const req = {
      user: { id: "99999999-9999-4999-8999-999999999999", role: "professor" },
      body: { scope: "student", studentId: normalStudentId },
    };
    const res = mockResponse();

    await executePipeline(routes["POST /api/typing/lessons/reset"], req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toContain("Aluno não encontrado");
  });

  it("retorna 400 quando o aluno não é do tipo Normal", async () => {
    const pool = {
      query: vi.fn().mockResolvedValue({
        rowCount: 1,
        rows: [
          {
            id: kidsStudentId,
            username: "kid1",
            role: "aluno",
            student_type: "kids",
            active: true,
          },
        ],
      }),
    };
    const routes = buildRoutes({ pool });
    const req = {
      user: { id: "99999999-9999-4999-8999-999999999999", role: "professor" },
      body: { scope: "student", studentId: kidsStudentId },
    };
    const res = mockResponse();

    await executePipeline(routes["POST /api/typing/lessons/reset"], req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain(
      "Apenas alunos do tipo Normal são permitidos"
    );
  });

  it("retorna 400 quando o aluno não pertence à turma selecionada", async () => {
    const pool = {
      query: vi.fn().mockResolvedValue({
        rowCount: 1,
        rows: [
          {
            id: normalStudentId,
            username: "aluno1",
            role: "aluno",
            student_type: "normal",
            turma_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            active: true,
          },
        ],
      }),
    };
    const routes = buildRoutes({ pool });
    const req = {
      user: { id: "99999999-9999-4999-8999-999999999999", role: "professor" },
      body: {
        scope: "student",
        turmaId: normalTurmaId,
        studentId: normalStudentId,
      },
    };
    const res = mockResponse();

    await executePipeline(routes["POST /api/typing/lessons/reset"], req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain("Aluno não pertence à turma selecionada");
  });

  it("reseta progresso de aluno específico MANTENDO pontuação no ranking (clearRanking: false)", async () => {
    const pool = {
      query: vi.fn().mockImplementation((sql, params) => {
        if (sql.includes("FROM users u")) {
          return Promise.resolve({
            rowCount: 1,
            rows: [
              {
                id: normalStudentId,
                username: "aluno1",
                role: "aluno",
                student_type: "normal",
                turma_id: normalTurmaId,
                turma_nome: "Turma A",
                active: true,
              },
            ],
          });
        }
        if (sql.includes("DELETE FROM typing_lesson_progress")) {
          return Promise.resolve({ rowCount: 4 });
        }
        if (sql.includes("INSERT INTO typing_lesson_resets")) {
          return Promise.resolve({ rowCount: 1 });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      }),
    };

    const clientRes = mockResponse();
    const typingSettingsClients = new Set([
      { userId: normalStudentId, studentType: "normal", res: clientRes },
    ]);

    const routes = buildRoutes({ pool, typingSettingsClients });
    const req = {
      user: { id: "99999999-9999-4999-8999-999999999999", role: "professor" },
      body: {
        scope: "student",
        studentId: normalStudentId,
        clearRanking: false,
      },
    };
    const res = mockResponse();

    await executePipeline(routes["POST /api/typing/lessons/reset"], req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.scope).toBe("student");
    expect(res.body.clearedRanking).toBe(false);
    expect(res.body.affectedStudents).toBe(1);
    expect(res.body.deletedScores).toBe(0);

    // Garante que typing_scores NÃO foi deletado
    const scoreDeleteCall = pool.query.mock.calls.find(([sql]) =>
      sql.includes("DELETE FROM typing_scores")
    );
    expect(scoreDeleteCall).toBeUndefined();

    // Garante que typing_lesson_progress foi deletado
    const progressDeleteCall = pool.query.mock.calls.find(([sql]) =>
      sql.includes("DELETE FROM typing_lesson_progress")
    );
    expect(progressDeleteCall).toBeDefined();

    // Notificação SSE enviada ao cliente conectado
    expect(clientRes.write).toHaveBeenCalledWith("event: typing-progress\n");
    expect(clientRes.write).toHaveBeenCalledWith(
      expect.stringContaining('"type":"reset"')
    );
  });

  it("reseta progresso de aluno específico e ZERA pontuação no ranking (clearRanking: true)", async () => {
    const pool = {
      query: vi.fn().mockImplementation((sql) => {
        if (sql.includes("FROM users u")) {
          return Promise.resolve({
            rowCount: 1,
            rows: [
              {
                id: normalStudentId,
                username: "aluno1",
                role: "aluno",
                student_type: "normal",
                turma_id: normalTurmaId,
                turma_nome: "Turma A",
                active: true,
              },
            ],
          });
        }
        if (sql.includes("DELETE FROM typing_lesson_progress")) {
          return Promise.resolve({ rowCount: 3 });
        }
        if (sql.includes("INSERT INTO typing_lesson_resets")) {
          return Promise.resolve({ rowCount: 1 });
        }
        if (sql.includes("DELETE FROM typing_scores")) {
          return Promise.resolve({ rowCount: 7 });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      }),
    };

    const routes = buildRoutes({ pool });
    const req = {
      user: { id: "99999999-9999-4999-8999-999999999999", role: "professor" },
      body: {
        scope: "student",
        studentId: normalStudentId,
        clearRanking: true,
      },
    };
    const res = mockResponse();

    await executePipeline(routes["POST /api/typing/lessons/reset"], req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.clearedRanking).toBe(true);
    expect(res.body.deletedScores).toBe(7);

    // Garante que typing_scores foi deletado
    const scoreDeleteCall = pool.query.mock.calls.find(([sql]) =>
      sql.includes("DELETE FROM typing_scores")
    );
    expect(scoreDeleteCall).toBeDefined();
  });

  it("reseta progresso de turma inteira mantendo pontuações no ranking", async () => {
    const pool = {
      query: vi.fn().mockImplementation((sql) => {
        if (sql.includes("FROM turmas WHERE id = $1")) {
          return Promise.resolve({
            rowCount: 1,
            rows: [
              {
                id: normalTurmaId,
                nome: "Turma 101",
                code: "TRM101",
                student_type: "normal",
                active: true,
              },
            ],
          });
        }
        if (
          sql.includes("SELECT id, username FROM users WHERE turma_id = $1")
        ) {
          return Promise.resolve({
            rowCount: 2,
            rows: [
              { id: normalStudentId, username: "aluno1" },
              {
                id: "33333333-3333-4333-8333-333333333333",
                username: "aluno2",
              },
            ],
          });
        }
        if (sql.includes("DELETE FROM typing_lesson_progress")) {
          return Promise.resolve({ rowCount: 10 });
        }
        if (sql.includes("INSERT INTO typing_lesson_resets")) {
          return Promise.resolve({ rowCount: 2 });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      }),
    };

    const routes = buildRoutes({ pool });
    const req = {
      user: { id: "99999999-9999-4999-8999-999999999999", role: "professor" },
      body: { scope: "turma", turmaId: normalTurmaId, clearRanking: false },
    };
    const res = mockResponse();

    await executePipeline(routes["POST /api/typing/lessons/reset"], req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.scope).toBe("turma");
    expect(res.body.affectedStudents).toBe(2);
    expect(res.body.clearedRanking).toBe(false);

    const scoreDeleteCall = pool.query.mock.calls.find(([sql]) =>
      sql.includes("DELETE FROM typing_scores")
    );
    expect(scoreDeleteCall).toBeUndefined();
  });

  it("reseta progresso de turma inteira e ZERA pontuações no ranking", async () => {
    const pool = {
      query: vi.fn().mockImplementation((sql) => {
        if (sql.includes("FROM turmas WHERE id = $1")) {
          return Promise.resolve({
            rowCount: 1,
            rows: [
              {
                id: normalTurmaId,
                nome: "Turma 101",
                code: "TRM101",
                student_type: "normal",
                active: true,
              },
            ],
          });
        }
        if (
          sql.includes("SELECT id, username FROM users WHERE turma_id = $1")
        ) {
          return Promise.resolve({
            rowCount: 2,
            rows: [
              { id: normalStudentId, username: "aluno1" },
              {
                id: "33333333-3333-4333-8333-333333333333",
                username: "aluno2",
              },
            ],
          });
        }
        if (sql.includes("DELETE FROM typing_lesson_progress")) {
          return Promise.resolve({ rowCount: 10 });
        }
        if (sql.includes("INSERT INTO typing_lesson_resets")) {
          return Promise.resolve({ rowCount: 2 });
        }
        if (sql.includes("DELETE FROM typing_scores")) {
          return Promise.resolve({ rowCount: 15 });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      }),
    };

    const routes = buildRoutes({ pool });
    const req = {
      user: { id: "99999999-9999-4999-8999-999999999999", role: "professor" },
      body: { scope: "turma", turmaId: normalTurmaId, clearRanking: true },
    };
    const res = mockResponse();

    await executePipeline(routes["POST /api/typing/lessons/reset"], req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.affectedStudents).toBe(2);
    expect(res.body.clearedRanking).toBe(true);
    expect(res.body.deletedScores).toBe(15);
  });
});

describe("GET e POST de progresso de digitação", () => {
  const studentId = "11111111-1111-4111-8111-111111111111";

  it("retorna lições concluídas e lastResetAt em GET /api/typing/progress", async () => {
    const pool = {
      query: vi.fn().mockImplementation((sql) => {
        if (sql.includes("FROM typing_lesson_progress")) {
          return Promise.resolve({
            rowCount: 2,
            rows: [{ lesson_id: 1 }, { lesson_id: 2 }],
          });
        }
        if (sql.includes("FROM typing_lesson_resets")) {
          return Promise.resolve({
            rowCount: 1,
            rows: [{ reset_at: "2026-10-20T12:00:00.000Z" }],
          });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      }),
    };

    const routes = buildRoutes({ pool });
    const req = { user: { id: studentId, role: "aluno" }, query: {} };
    const res = mockResponse();

    await executePipeline(routes["GET /api/typing/progress"], req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.completedLessons).toEqual([1, 2]);
    expect(res.body.lastResetAt).toBe("2026-10-20T12:00:00.000Z");
  });

  it("registra progresso de lição em POST /api/typing/progress para aluno", async () => {
    const pool = {
      query: vi.fn().mockResolvedValue({ rowCount: 1 }),
    };

    const routes = buildRoutes({ pool });
    const req = {
      user: { id: studentId, role: "aluno" },
      body: { lessonId: 1 },
    };
    const res = mockResponse();

    await executePipeline(routes["POST /api/typing/progress"], req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO typing_lesson_progress"),
      [studentId, 1]
    );
  });
});

describe("Rebloqueio e progressão sequencial a partir da Lição 1", () => {
  const isLessonLocked = (index, completedLessons, isStaff = false) => {
    if (isStaff) return false;
    if (index === 0) return false;
    return !completedLessons.includes(TYPING_LESSONS[index - 1].id);
  };

  it("após o reset (completedLessons = []), apenas a Lição 1 está liberada e as demais bloqueadas", () => {
    const completedLessonsAfterReset = [];

    // Lição 1 (índice 0) deve estar desbloqueada
    expect(isLessonLocked(0, completedLessonsAfterReset)).toBe(false);

    // Lições 2 em diante (índices 1 a 34) devem estar bloqueadas
    for (let i = 1; i < TYPING_LESSONS.length; i++) {
      expect(isLessonLocked(i, completedLessonsAfterReset)).toBe(true);
    }
  });

  it("após aprovar a Lição 1, a Lição 2 é desbloqueada e Lição 3 em diante continuam bloqueadas", () => {
    const completedLessons = [1];

    // Lição 1 desbloqueada
    expect(isLessonLocked(0, completedLessons)).toBe(false);
    // Lição 2 desbloqueada (pois Lição 1 foi concluída)
    expect(isLessonLocked(1, completedLessons)).toBe(false);
    // Lição 3 bloqueada (pois Lição 2 ainda não foi concluída)
    expect(isLessonLocked(2, completedLessons)).toBe(true);
    // Demais lições bloqueadas
    expect(isLessonLocked(3, completedLessons)).toBe(true);
  });

  it("após aprovar a Lição 2, a Lição 3 é desbloqueada", () => {
    const completedLessons = [1, 2];

    expect(isLessonLocked(0, completedLessons)).toBe(false);
    expect(isLessonLocked(1, completedLessons)).toBe(false);
    expect(isLessonLocked(2, completedLessons)).toBe(false);
    expect(isLessonLocked(3, completedLessons)).toBe(true);
  });
});

describe("Componente TypingLessonResetSection", () => {
  const turmasMock = [
    {
      id: "turma-1",
      nome: "Turma Alpha",
      code: "ALPHA1",
      studentType: "normal",
    },
    {
      id: "turma-2",
      nome: "Turma Beta",
      code: "BETA02",
      studentType: "normal",
    },
  ];

  const usersMock = {
    users: [
      {
        id: "student-1",
        username: "joao",
        displayName: "João Silva",
        role: "aluno",
        studentType: "normal",
        turmaId: "turma-1",
        active: true,
      },
      {
        id: "student-2",
        username: "maria",
        displayName: "Maria Souza",
        role: "aluno",
        studentType: "normal",
        turmaId: "turma-1",
        active: true,
      },
      {
        id: "student-3",
        username: "carlos",
        displayName: "Carlos Pereira",
        role: "aluno",
        studentType: "normal",
        turmaId: "turma-2",
        active: true,
      },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "getUsers").mockResolvedValue(usersMock);
    vi.spyOn(api, "resetTypingLessonProgress").mockResolvedValue({
      ok: true,
      deletedScores: 0,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renderiza o formulário com opções de escopo e checkbox de ranking", async () => {
    render(<TypingLessonResetSection turmas={turmasMock} />);

    expect(
      screen.getByRole("heading", { name: "Resetar progresso das lições" })
    ).toBeDefined();
    expect(screen.getByLabelText("Turma inteira")).toBeDefined();
    expect(screen.getByLabelText("Aluno específico")).toBeDefined();
    expect(
      screen.getByLabelText(/Zerar também a pontuação no Ranking de Lições/)
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Resetar progresso das lições" })
    ).toBeDefined();
  });

  it("alterna para escopo de aluno específico e exibe os alunos da turma selecionada", async () => {
    render(<TypingLessonResetSection turmas={turmasMock} />);

    // Clica no rádio Aluno específico
    fireEvent.click(screen.getByLabelText("Aluno específico"));

    await waitFor(() => {
      expect(screen.getByLabelText("Aluno")).toBeDefined();
    });

    // Alunos da Turma Alpha devem estar presentes no select de alunos
    expect(screen.getByText(/João Silva/)).toBeDefined();
    expect(screen.getByText(/Maria Souza/)).toBeDefined();
  });

  it("solicita confirmação e executa o reset via api.resetTypingLessonProgress", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const onResetSuccess = vi.fn();

    render(
      <TypingLessonResetSection
        turmas={turmasMock}
        onResetSuccess={onResetSuccess}
      />
    );

    // Marca opção de zerar ranking
    const rankingCheckbox = screen.getByLabelText(
      /Zerar também a pontuação no Ranking de Lições/
    );
    fireEvent.click(rankingCheckbox);

    // Clica no botão de submissão
    const submitBtn = screen.getByRole("button", {
      name: "Resetar progresso das lições",
    });
    fireEvent.click(submitBtn);

    expect(confirmSpy).toHaveBeenCalled();

    await waitFor(() => {
      expect(api.resetTypingLessonProgress).toHaveBeenCalledWith({
        scope: "turma",
        turmaId: "turma-1",
        studentId: undefined,
        clearRanking: true,
      });
      expect(onResetSuccess).toHaveBeenCalled();
    });

    expect(screen.getByRole("alert")).toBeDefined();
    expect(screen.getByText(/resetado com sucesso/)).toBeDefined();
  });

  it("não exibe alunos quando selectedTurmaId estiver vazia", async () => {
    render(<TypingLessonResetSection turmas={[]} />);

    fireEvent.click(screen.getByLabelText("Aluno específico"));

    await waitFor(() => {
      expect(screen.getByLabelText("Aluno")).toBeDefined();
    });

    expect(
      screen.getByText("Nenhum aluno Normal cadastrado nesta turma")
    ).toBeDefined();
  });

  it("reconhece alunos com propriedade turma_id em snake_case", async () => {
    api.getUsers.mockResolvedValueOnce({
      users: [
        {
          id: "student-snake",
          username: "pedro",
          displayName: "Pedro Santos",
          role: "aluno",
          student_type: "normal",
          turma_id: "turma-1",
          active: true,
        },
      ],
    });

    render(<TypingLessonResetSection turmas={turmasMock} />);

    fireEvent.click(screen.getByLabelText("Aluno específico"));

    await waitFor(() => {
      expect(screen.getByText(/Pedro Santos/)).toBeDefined();
    });
  });
});

describe("Casos de borda e robustez do reset e progresso", () => {
  const normalTurmaId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const normalStudentId = "11111111-1111-4111-8111-111111111111";

  it("trata clearRanking como string 'false' sem zerar pontuações no ranking", async () => {
    const pool = {
      query: vi.fn().mockImplementation((sql) => {
        if (sql.includes("FROM users u")) {
          return Promise.resolve({
            rowCount: 1,
            rows: [
              {
                id: normalStudentId,
                username: "aluno1",
                role: "aluno",
                student_type: "normal",
                turma_id: normalTurmaId,
                turma_nome: "Turma A",
                active: true,
              },
            ],
          });
        }
        if (sql.includes("DELETE FROM typing_lesson_progress")) {
          return Promise.resolve({ rowCount: 1 });
        }
        if (sql.includes("INSERT INTO typing_lesson_resets")) {
          return Promise.resolve({ rowCount: 1 });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      }),
    };

    const routes = buildRoutes({ pool });
    const req = {
      user: { id: "99999999-9999-4999-8999-999999999999", role: "professor" },
      body: {
        scope: "student",
        studentId: normalStudentId,
        clearRanking: "false",
      },
    };
    const res = mockResponse();

    await executePipeline(routes["POST /api/typing/lessons/reset"], req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.clearedRanking).toBe(false);
    expect(res.body.deletedScores).toBe(0);

    const scoreDeleteCall = pool.query.mock.calls.find(([sql]) =>
      sql.includes("DELETE FROM typing_scores")
    );
    expect(scoreDeleteCall).toBeUndefined();
  });

  it("trata clearRanking como string 'true' e zera pontuações no ranking", async () => {
    const pool = {
      query: vi.fn().mockImplementation((sql) => {
        if (sql.includes("FROM users u")) {
          return Promise.resolve({
            rowCount: 1,
            rows: [
              {
                id: normalStudentId,
                username: "aluno1",
                role: "aluno",
                student_type: "normal",
                turma_id: normalTurmaId,
                turma_nome: "Turma A",
                active: true,
              },
            ],
          });
        }
        if (sql.includes("DELETE FROM typing_lesson_progress")) {
          return Promise.resolve({ rowCount: 1 });
        }
        if (sql.includes("INSERT INTO typing_lesson_resets")) {
          return Promise.resolve({ rowCount: 1 });
        }
        if (sql.includes("DELETE FROM typing_scores")) {
          return Promise.resolve({ rowCount: 3 });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      }),
    };

    const routes = buildRoutes({ pool });
    const req = {
      user: { id: "99999999-9999-4999-8999-999999999999", role: "professor" },
      body: {
        scope: "student",
        studentId: normalStudentId,
        clearRanking: "true",
      },
    };
    const res = mockResponse();

    await executePipeline(routes["POST /api/typing/lessons/reset"], req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.clearedRanking).toBe(true);
    expect(res.body.deletedScores).toBe(3);
  });

  it("rejeita aluno sem turma no reset com 400", async () => {
    const pool = {
      query: vi.fn().mockResolvedValue({
        rowCount: 1,
        rows: [
          {
            id: normalStudentId,
            username: "aluno_sem_turma",
            role: "aluno",
            student_type: "normal",
            turma_id: null,
            active: true,
          },
        ],
      }),
    };
    const routes = buildRoutes({ pool });
    const req = {
      user: { id: "99999999-9999-4999-8999-999999999999", role: "professor" },
      body: { scope: "student", studentId: normalStudentId },
    };
    const res = mockResponse();

    await executePipeline(routes["POST /api/typing/lessons/reset"], req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain(
      "Apenas alunos do tipo Normal são permitidos"
    );
  });

  it("rejeita turmaId com formato inválido no reset de aluno com 400", async () => {
    const pool = {
      query: vi.fn().mockResolvedValue({
        rowCount: 1,
        rows: [
          {
            id: normalStudentId,
            username: "aluno1",
            role: "aluno",
            student_type: "normal",
            turma_id: normalTurmaId,
            turma_nome: "Turma A",
            active: true,
          },
        ],
      }),
    };
    const routes = buildRoutes({ pool });
    const req = {
      user: { id: "99999999-9999-4999-8999-999999999999", role: "professor" },
      body: {
        scope: "student",
        studentId: normalStudentId,
        turmaId: "invalido-uuid",
      },
    };
    const res = mockResponse();

    await executePipeline(routes["POST /api/typing/lessons/reset"], req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain("Identificador de turma inválido");
  });

  it("entrega evento SSE de reset mesmo com UUID em maiúsculas", async () => {
    const pool = {
      query: vi.fn().mockImplementation((sql) => {
        if (sql.includes("FROM users u")) {
          return Promise.resolve({
            rowCount: 1,
            rows: [
              {
                id: normalStudentId.toUpperCase(),
                username: "aluno1",
                role: "aluno",
                student_type: "normal",
                turma_id: normalTurmaId,
                turma_nome: "Turma A",
                active: true,
              },
            ],
          });
        }
        if (sql.includes("DELETE FROM typing_lesson_progress")) {
          return Promise.resolve({ rowCount: 1 });
        }
        if (sql.includes("INSERT INTO typing_lesson_resets")) {
          return Promise.resolve({ rowCount: 1 });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      }),
    };

    const clientRes = mockResponse();
    const typingSettingsClients = new Set([
      {
        userId: normalStudentId.toLowerCase(),
        studentType: "normal",
        res: clientRes,
      },
    ]);

    const routes = buildRoutes({ pool, typingSettingsClients });
    const req = {
      user: { id: "99999999-9999-4999-8999-999999999999", role: "professor" },
      body: {
        scope: "student",
        studentId: normalStudentId.toUpperCase(),
      },
    };
    const res = mockResponse();

    await executePipeline(routes["POST /api/typing/lessons/reset"], req, res);

    expect(res.statusCode).toBe(200);
    expect(clientRes.write).toHaveBeenCalledWith("event: typing-progress\n");
    expect(clientRes.write).toHaveBeenCalledWith(
      expect.stringContaining('"type":"reset"')
    );
  });

  it("bloqueia POST /api/typing/progress para Lição 2 se a Lição 1 não estiver concluída", async () => {
    const pool = {
      query: vi.fn().mockImplementation((sql) => {
        if (sql.includes("SELECT 1 FROM typing_lesson_progress")) {
          return Promise.resolve({ rowCount: 0, rows: [] });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      }),
    };

    const routes = buildRoutes({ pool });
    const req = {
      user: { id: normalStudentId, role: "aluno" },
      body: { lessonId: 2 },
    };
    const res = mockResponse();

    await executePipeline(routes["POST /api/typing/progress"], req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain("A lição anterior deve ser concluída");

    const insertCall = pool.query.mock.calls.find(([sql]) =>
      sql.includes("INSERT INTO typing_lesson_progress")
    );
    expect(insertCall).toBeUndefined();
  });

  it("permite POST /api/typing/progress para Lição 2 quando a Lição 1 já foi concluída", async () => {
    const pool = {
      query: vi.fn().mockImplementation((sql, params) => {
        if (sql.includes("SELECT 1 FROM typing_lesson_progress")) {
          if (params[1] === 1) {
            return Promise.resolve({ rowCount: 1, rows: [{ "?column?": 1 }] });
          }
        }
        if (sql.includes("INSERT INTO typing_lesson_progress")) {
          return Promise.resolve({ rowCount: 1 });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      }),
    };

    const routes = buildRoutes({ pool });
    const req = {
      user: { id: normalStudentId, role: "aluno" },
      body: { lessonId: 2 },
    };
    const res = mockResponse();

    await executePipeline(routes["POST /api/typing/progress"], req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.lessonId).toBe(2);
  });

  it("bloqueia avanço não-sequencial para Lição 4 se apenas Lições 1 e 2 estão concluídas", async () => {
    const pool = {
      query: vi.fn().mockImplementation((sql, params) => {
        if (sql.includes("SELECT 1 FROM typing_lesson_progress")) {
          return Promise.resolve({ rowCount: 0, rows: [] });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      }),
    };

    const routes = buildRoutes({ pool });
    const req = {
      user: { id: normalStudentId, role: "aluno" },
      body: { lessonId: 4 },
    };
    const res = mockResponse();

    await executePipeline(routes["POST /api/typing/progress"], req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain("A lição anterior deve ser concluída");
  });
});
