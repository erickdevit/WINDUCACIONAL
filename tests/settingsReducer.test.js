import { beforeAll, describe, expect, it, vi } from "vitest";

let settingsReducer;

beforeAll(async () => {
  vi.stubGlobal("localStorage", {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  });
  vi.stubGlobal("document", { body: { dataset: {} } });
  ({ default: settingsReducer } = await import("../src/reducers/settings"));
});

describe("settingsReducer", () => {
  it("não permite que preferências persistidas alterem o papel da sessão", () => {
    const sessionState = settingsReducer(undefined, {
      type: "SESSIONUSER",
      payload: {
        id: "aluno-1",
        displayName: "Aluno Teste",
        username: "aluno",
        role: "aluno",
        studentType: "normal",
        turmaId: "turma-1",
      },
    });

    const nextState = settingsReducer(sessionState, {
      type: "SETTLOAD",
      payload: {
        person: {
          id: "professor-1",
          name: "Professor Falso",
          username: "professor",
          role: "professor",
          studentType: "normal",
          turmaId: null,
          theme: "dark",
          color: "green",
        },
      },
    });

    expect(nextState.person).toMatchObject({
      id: "aluno-1",
      name: "Aluno Teste",
      username: "aluno",
      role: "aluno",
      studentType: "normal",
      turmaId: "turma-1",
      theme: "dark",
      color: "green",
    });
  });
});
