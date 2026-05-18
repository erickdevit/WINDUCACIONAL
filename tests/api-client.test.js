import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const apiPath = path.resolve(__dirname, "../src/lib/api.js");
const apiCode = fs.readFileSync(apiPath, "utf8");

describe("API client - endpoints de turmas", () => {
  it("deve exportar getTurmas", () => {
    expect(apiCode).toContain("getTurmas");
    expect(apiCode).toContain("/api/turmas");
  });

  it("deve exportar createTurma", () => {
    expect(apiCode).toContain("createTurma");
  });

  it("deve exportar updateTurma", () => {
    expect(apiCode).toContain("updateTurma");
  });

  it("deve exportar deleteTurma", () => {
    expect(apiCode).toContain("deleteTurma");
  });
});

describe("API client - endpoints existentes", () => {
  it("deve manter endpoints de autenticação", () => {
    expect(apiCode).toContain("/api/app/version");
    expect(apiCode).toContain("/api/auth/me");
    expect(apiCode).toContain("/api/auth/login");
    expect(apiCode).toContain("/api/auth/register");
    expect(apiCode).toContain("/api/auth/logout");
  });

  it("deve manter endpoints de usuários", () => {
    expect(apiCode).toContain("/api/users");
    expect(apiCode).toContain("getUsers");
    expect(apiCode).toContain("createUser");
    expect(apiCode).toContain("updateUser");
    expect(apiCode).toContain("checkUsernameAvailability");
    expect(apiCode).toContain("/api/users/username/");
    expect(apiCode).toContain("/availability");
  });

  it("deve manter endpoints de sistema de arquivos", () => {
    expect(apiCode).toContain("/api/fs/tree");
    expect(apiCode).toContain("getFileTree");
    expect(apiCode).toContain("saveFileTree");
  });

  it("deve expor reset de ranking de turma por código", () => {
    expect(apiCode).toContain("resetTypingTurmaRanking");
    expect(apiCode).toContain("/api/typing/ranking/turma/reset");
    expect(apiCode).toContain("turmaCode");
    expect(apiCode).toContain("studentType");
  });

  it("deve expor configurações de digitação e assinatura em tempo real", () => {
    expect(apiCode).toContain("getTypingSettings");
    expect(apiCode).toContain("saveTypingSettings");
    expect(apiCode).toContain("subscribeTypingSettings");
    expect(apiCode).toContain("/api/typing/settings/");
    expect(apiCode).toContain("/api/typing/settings/events");
    expect(apiCode).toContain("EventSource");
  });

  it("deve expor configurações e ranking do game de digitação", () => {
    expect(apiCode).toContain("saveTypingGameScore");
    expect(apiCode).toContain("getTypingGameGlobalRanking");
    expect(apiCode).toContain("getTypingGameTurmaRanking");
    expect(apiCode).toContain("resetTypingGameTurmaRanking");
    expect(apiCode).toContain("getTypingGameSettings");
    expect(apiCode).toContain("saveTypingGameSettings");
    expect(apiCode).toContain("subscribeTypingGameSettings");
    expect(apiCode).toContain("/api/typing/game/settings/events");
    expect(apiCode).toContain("/api/typing/game/ranking/turma/reset");
  });

  it("deve expor assinatura em tempo real de notificações do usuário", () => {
    expect(apiCode).toContain("subscribeNotifications");
    expect(apiCode).toContain("/api/notifications/events");
    expect(apiCode).toContain("user-notification");
  });

  it("deve consultar placar PVP com escopo global ou turma", () => {
    expect(apiCode).toContain("getPvpScores");
    expect(apiCode).toContain("new URLSearchParams({ scope })");
    expect(apiCode).toContain('params.set("turmaId", turmaId)');
    expect(apiCode).toContain("/api/typing-pvp/scores?");
  });

  it("deve expor rastreabilidade de aplicações de provas", () => {
    expect(apiCode).toContain("getExamApplications");
    expect(apiCode).toContain("deleteExamApplication");
    expect(apiCode).toContain("/api/exams/applications");
    expect(apiCode).toContain('method: "DELETE"');
  });
});
