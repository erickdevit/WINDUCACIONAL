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

  it("limpa a identidade local no logout", () => {
    const sessionState = settingsReducer(undefined, {
      type: "SESSIONUSER",
      payload: {
        id: "professor-1",
        displayName: "Professor Teste",
        username: "professor",
        role: "professor",
        studentType: "normal",
        turmaId: null,
      },
    });

    const nextState = settingsReducer(sessionState, { type: "LOGOUT" });

    expect(nextState.person).toMatchObject({
      name: "Usuário",
      username: "",
      role: "aluno",
      studentType: "normal",
      turmaId: null,
      theme: "light",
      color: "blue",
    });
    expect(nextState.person.id).toBeUndefined();
  });
});
