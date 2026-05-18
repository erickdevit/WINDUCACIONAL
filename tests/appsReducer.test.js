import { beforeAll, describe, expect, it, vi } from "vitest";

let appReducer;

beforeAll(async () => {
  vi.stubGlobal("localStorage", {
    getItem: () => "[]",
    setItem: () => {},
    removeItem: () => {},
  });
  ({ default: appReducer } = await import("../src/reducers/apps"));
});

describe("appReducer", () => {
  it("deve reabrir app oculto por togg em tela cheia, sem reaproveitar dimensão customizada", () => {
    const state = {
      hz: 3,
      chat: {
        name: "Chat da Turma",
        icon: "chat",
        action: "CHATAPP",
        size: "cstm",
        dim: {
          top: "-28px",
          left: "0px",
          width: "100%",
          height: "760px",
        },
        hide: true,
        max: null,
        z: -1,
      },
    };

    const nextState = appReducer(state, { type: "CHATAPP", payload: "togg" });

    expect(nextState.chat.size).toBe("full");
    expect(nextState.chat.dim).toBeUndefined();
    expect(nextState.chat.hide).toBe(false);
    expect(nextState.chat.max).toBe(true);
    expect(nextState.chat.z).toBe(nextState.hz);
  });

  it("deve limpar dimensões customizadas ao abrir explicitamente em tela cheia", () => {
    const state = {
      hz: 2,
      explorer: {
        name: "Explorador de Arquivos",
        icon: "explorer",
        action: "EXPLORER",
        size: "cstm",
        dim: {
          top: "10px",
          left: "20px",
          width: "640px",
          height: "480px",
        },
        hide: true,
        max: null,
        z: -1,
      },
    };

    const nextState = appReducer(state, { type: "EXPLORER", payload: "full" });

    expect(nextState.explorer.size).toBe("full");
    expect(nextState.explorer.dim).toBeUndefined();
    expect(nextState.explorer.hide).toBe(false);
    expect(nextState.explorer.max).toBe(true);
  });

  it("deve abrir app com payload estruturado para rotas internas", () => {
    const state = {
      hz: 2,
      chat: {
        name: "Chat da Turma",
        icon: "chat",
        action: "CHATAPP",
        size: "full",
        hide: true,
        max: null,
        z: -1,
      },
    };

    const payload = {
      kind: "chat-thread",
      threadId: "thread-1",
    };
    const nextState = appReducer(state, { type: "CHATAPP", payload });

    expect(nextState.chat.hide).toBe(false);
    expect(nextState.chat.max).toBe(true);
    expect(nextState.chat.payload).toEqual(payload);
    expect(nextState.chat.z).toBe(nextState.hz);
  });
});
