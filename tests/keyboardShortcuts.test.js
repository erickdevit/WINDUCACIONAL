import { describe, expect, it } from "vitest";
import {
  getGlobalShortcutAction,
  getTopClosableApp,
} from "../src/lib/keyboardShortcuts";

describe("keyboardShortcuts", () => {
  it("fecha a janela ativa com Alt+F4", () => {
    const action = getGlobalShortcutAction(
      {
        key: "F4",
        altKey: true,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
      },
      {
        apps: {
          hz: 4,
          explorer: { action: "EXPLORER", hide: false, z: 2 },
          chat: { action: "CHATAPP", hide: false, z: 4 },
        },
      }
    );

    expect(action).toEqual({ type: "CHATAPP", payload: "close" });
  });

  it("fecha o FileDialog antes de fechar uma janela com Alt+F4", () => {
    const action = getGlobalShortcutAction(
      {
        key: "F4",
        altKey: true,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
      },
      {
        fileDialogOpen: true,
        apps: {
          hz: 1,
          explorer: { action: "EXPLORER", hide: false, z: 1 },
        },
      }
    );

    expect(action).toEqual({ type: "FILEDIALOG_CLOSE" });
  });

  it("mapeia os atalhos globais principais do simulador", () => {
    expect(getGlobalShortcutAction({ key: "e", metaKey: true }, {})).toEqual({
      type: "EXPLORER",
    });
    expect(getGlobalShortcutAction({ key: "i", metaKey: true }, {})).toEqual({
      type: "SETTINGS",
    });
    expect(getGlobalShortcutAction({ key: "r", metaKey: true }, {})).toEqual({
      type: "TERMINAL",
    });
    expect(getGlobalShortcutAction({ key: "d", metaKey: true }, {})).toEqual({
      type: "DESKTOGG",
    });
    expect(getGlobalShortcutAction({ key: "a", metaKey: true }, {})).toEqual({
      type: "BANDTOGG",
    });
    expect(getGlobalShortcutAction({ key: "n", metaKey: true }, {})).toEqual({
      type: "CALNTOGG",
    });
    expect(getGlobalShortcutAction({ key: "s", metaKey: true }, {})).toEqual({
      type: "STARTSRC",
    });
    expect(getGlobalShortcutAction({ key: "w", metaKey: true }, {})).toEqual({
      type: "WIDGTOGG",
    });
    expect(
      getGlobalShortcutAction(
        {
          key: "Escape",
          ctrlKey: true,
          shiftKey: true,
          altKey: false,
          metaKey: false,
        },
        {}
      )
    ).toEqual({ type: "TASKMANAGER" });
  });

  it("seleciona a janela visível mais ao topo para fechamento", () => {
    const activeApp = getTopClosableApp({
      hz: 7,
      explorer: { action: "EXPLORER", hide: false, z: 3 },
      settings: { action: "SETTINGS", hide: true, z: 7 },
      chat: { action: "CHATAPP", hide: false, z: 6 },
    });

    expect(activeApp).toMatchObject({ action: "CHATAPP", z: 6 });
  });
});
