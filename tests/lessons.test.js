import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const root = path.resolve(__dirname, "..");
const lessonsRoutePath = path.join(root, "server/routes/lessons.cjs");
const gestorRoutePath = path.join(root, "server/routes/gestor.cjs");
const lessonsRoute = require(lessonsRoutePath);
const gestorRoute = require(gestorRoutePath);
const lessonsSource = fs.readFileSync(lessonsRoutePath, "utf8");
const gestorSource = fs.readFileSync(gestorRoutePath, "utf8");
const lessonsUi = fs.readFileSync(
  path.join(root, "src/containers/applications/apps/lessons/lessons.jsx"),
  "utf8"
);
const migration = fs.readFileSync(
  path.join(root, "server/db/migrations/0002_lessons.sql"),
  "utf8"
);

describe("Lições - persistência e autorização", () => {
  it("deve criar tabelas separadas para grupos, atividades e progresso", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS lesson_groups");
    expect(migration).toContain(
      "CREATE TABLE IF NOT EXISTS lesson_group_members"
    );
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS lessons");
    expect(migration).toContain(
      "CREATE TABLE IF NOT EXISTS lesson_group_assignments"
    );
    expect(migration).toContain(
      "CREATE TABLE IF NOT EXISTS lesson_student_progress"
    );
    expect(migration).toContain("CHECK (activity_type IN ('solo', 'group'))");
  });

  it("deve proteger administração de grupos e atividades para professor", () => {
    expect(lessonsSource).toContain('"/api/lessons/groups"');
    expect(lessonsSource).toContain('"/api/lessons/:id"');
    expect(lessonsSource).toContain("requireProfessor");
    expect(lessonsSource).toContain("ensureStudentsBelongToTurma");
    expect(lessonsSource).toContain("ensureGroupsBelongToTurma");
  });

  it("deve derivar a turma e a visibilidade do aluno no servidor", () => {
    expect(lessonsSource).toContain("req.user.turma_id");
    expect(lessonsSource).toContain("visible_member.user_id = $2");
    expect(lessonsSource).toContain("lgm.user_id = $3");
    expect(lessonsSource).toContain("req.user.id");
    expect(lessonsSource).toContain(
      "Apenas alunos podem alterar o próprio progresso"
    );
  });

  it("deve validar textos, prazos e listas de UUID", () => {
    const { validators } = lessonsRoute;
    const validId = "123e4567-e89b-42d3-a456-426614174000";

    expect(validators.normalizeRequiredText("  Tarefa  ", 20, "Título")).toBe(
      "Tarefa"
    );
    expect(validators.normalizeDueAt("2026-07-20T15:00:00Z")).toBe(
      "2026-07-20T15:00:00.000Z"
    );
    expect(validators.normalizeUuidList([validId, validId], "Grupos")).toEqual([
      validId,
    ]);
    expect(() => validators.normalizeDueAt("data inválida")).toThrow(
      "O prazo informado é inválido."
    );
    expect(() => validators.normalizeActivityType("prova")).toThrow(
      "individual ou em grupo"
    );
    expect(() => validators.normalizeUuid("não-é-uuid", "A turma")).toThrow(
      "O identificador de turma é inválido."
    );
  });

  it("deve registrar middleware de professor nas mutações", () => {
    const registered = [];
    const app = {
      get: (route, ...handlers) =>
        registered.push({ method: "GET", route, handlers }),
      post: (route, ...handlers) =>
        registered.push({ method: "POST", route, handlers }),
      put: (route, ...handlers) =>
        registered.push({ method: "PUT", route, handlers }),
      delete: (route, ...handlers) =>
        registered.push({ method: "DELETE", route, handlers }),
    };
    const requireAuth = vi.fn();
    const requireProfessor = vi.fn();
    lessonsRoute({ app, pool: {}, requireAuth, requireProfessor });

    const mutations = registered.filter(
      (route) =>
        route.method !== "GET" && route.route !== "/api/lessons/:id/progress"
    );
    expect(mutations.length).toBeGreaterThan(0);
    mutations.forEach((route) => {
      expect(route.handlers[0]).toBe(requireAuth);
      expect(route.handlers[1]).toBe(requireProfessor);
    });
  });

  it("deve ignorar turma enviada pelo aluno e consultar sua própria turma", async () => {
    const registered = [];
    const app = {
      get: (route, ...handlers) =>
        registered.push({ method: "GET", route, handlers }),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };
    const pool = {
      query: vi.fn().mockResolvedValue({ rowCount: 0, rows: [] }),
    };
    lessonsRoute({
      app,
      pool,
      requireAuth: vi.fn(),
      requireProfessor: vi.fn(),
    });
    const listRoute = registered.find(
      (route) => route.route === "/api/lessons"
    );
    const req = {
      query: { turmaId: "turma-de-outro-usuario" },
      user: {
        id: "123e4567-e89b-42d3-a456-426614174001",
        turma_id: "123e4567-e89b-42d3-a456-426614174002",
        role: "aluno",
      },
    };
    const res = { json: vi.fn() };
    const next = vi.fn();

    await listRoute.handlers.at(-1)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("visible_member.user_id = $2"),
      [req.user.turma_id, req.user.id]
    );
    expect(res.json).toHaveBeenCalledWith({ lessons: [] });
  });
});

describe("Gestor - URL do ITB Ouro Moderno", () => {
  it("deve aceitar somente HTTP ou HTTPS sem credenciais", () => {
    expect(gestorRoute.normalizeOuroModernoUrl("https://escola.test/app")).toBe(
      "https://escola.test/app"
    );
    expect(() =>
      gestorRoute.normalizeOuroModernoUrl("javascript:alert(1)")
    ).toThrow("HTTP ou HTTPS");
    expect(() =>
      gestorRoute.normalizeOuroModernoUrl("https://usuario:senha@escola.test")
    ).toThrow("não pode conter usuário ou senha");
  });

  it("deve permitir leitura autenticada e restringir gravação a professor", () => {
    expect(gestorSource).toContain('"/api/gestor/ouro-moderno"');
    expect(gestorSource).toContain("requireAuth");
    expect(gestorSource).toContain("requireProfessor");
    expect(gestorSource).toContain("ouro_moderno_url");
  });
});

describe("Lições - interface", () => {
  it("deve usar a janela compartilhada e separar professor de aluno", () => {
    expect(lessonsUi).toContain("<AppWindow");
    expect(lessonsUi).toContain('name="Lições"');
    expect(lessonsUi).toContain('user.role === "professor"');
    expect(lessonsUi).toContain("api.createLesson");
    expect(lessonsUi).toContain("api.createLessonGroup");
    expect(lessonsUi).toContain("api.saveLessonProgress");
    expect(lessonsUi).toContain("Em grupo");
    expect(lessonsUi).toContain("Individual");
  });
});
