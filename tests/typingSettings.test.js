/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  normalizeTypingGameSettings,
  normalizeTypingSettings,
  useTypingGameSettings,
  useTypingSettings,
} from "../src/containers/applications/apps/typingSettings";
import { api } from "../src/lib/api";

const typingSettingsMock = vi.hoisted(() => ({
  subscribers: {},
  close: vi.fn(),
}));

vi.mock("../src/lib/api", () => ({
  api: {
    getTypingSettings: vi.fn((studentType) =>
      Promise.resolve({
        settings: {
          studentType,
          passMinWpm: 40,
          passMinAccuracy: 95,
          maxErrors: 7,
          updatedAt: null,
        },
      })
    ),
    saveTypingSettings: vi.fn((studentType, payload) =>
      Promise.resolve({
        settings: {
          studentType,
          passMinWpm: payload.passMinWpm,
          passMinAccuracy: payload.passMinAccuracy,
          maxErrors: payload.maxErrors,
          updatedAt: "2026-05-11T00:00:00.000Z",
        },
      })
    ),
    subscribeTypingSettings: vi.fn((studentType, { onSettings } = {}) => {
      typingSettingsMock.subscribers[studentType] = onSettings;
      return { close: typingSettingsMock.close };
    }),
    getTypingGameSettings: vi.fn((studentType) =>
      Promise.resolve({
        settings: {
          studentType,
          passMinWpm: 40,
          passMinAccuracy: 95,
          maxLives: 7,
          gameSpeed: 100,
          gameSpeedBoost: 3,
          updatedAt: null,
        },
      })
    ),
    saveTypingGameSettings: vi.fn((studentType, payload) =>
      Promise.resolve({
        settings: {
          studentType,
          passMinWpm: payload.passMinWpm,
          passMinAccuracy: payload.passMinAccuracy,
          maxLives: payload.maxLives,
          gameSpeed: payload.gameSpeed,
          gameSpeedBoost: payload.gameSpeedBoost,
          updatedAt: "2026-05-11T00:00:00.000Z",
        },
      })
    ),
    subscribeTypingGameSettings: vi.fn((studentType, { onSettings } = {}) => {
      typingSettingsMock.subscribers[`game:${studentType}`] = onSettings;
      return { close: typingSettingsMock.close };
    }),
  },
}));

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("Configurações de digitação", () => {
  beforeEach(() => {
    localStorage.clear();
    typingSettingsMock.subscribers = {};
    vi.clearAllMocks();
  });

  it("normaliza limites de dificuldade dentro das faixas permitidas", () => {
    expect(
      normalizeTypingSettings("normal", {
        passMinWpm: 999,
        passMinAccuracy: 10,
        maxErrors: 99,
      })
    ).toMatchObject({
      studentType: "normal",
      passMinWpm: 120,
      passMinAccuracy: 50,
      maxErrors: 10,
    });
  });

  it("normaliza limites separados do game de digitação", () => {
    expect(
      normalizeTypingGameSettings("normal", {
        passMinWpm: 999,
        passMinAccuracy: 10,
        maxLives: 99,
        gameSpeed: 999,
        gameSpeedBoost: 999,
      })
    ).toMatchObject({
      studentType: "normal",
      passMinWpm: 120,
      passMinAccuracy: 50,
      maxLives: 10,
      gameSpeed: 100,
      gameSpeedBoost: 100,
    });
  });

  it("atualiza metas do app Normal ao receber evento em tempo real", async () => {
    const { result } = renderHook(() =>
      useTypingSettings({ studentType: "normal", isProfessor: false })
    );
    await act(async () => {});

    act(() => {
      typingSettingsMock.subscribers.normal({
        studentType: "normal",
        passMinWpm: 64,
        passMinAccuracy: 97,
        maxErrors: 7,
        updatedAt: "2026-05-11T00:00:00.000Z",
      });
    });

    expect(result.current.settings.passMinWpm).toBe(64);
    expect(result.current.settings.passMinAccuracy).toBe(97);
    expect(result.current.draftSettings.passMinWpm).toBe(64);
  });

  it("salva o rascunho do professor no backend", async () => {
    const { result } = renderHook(() =>
      useTypingSettings({ studentType: "normal", isProfessor: true })
    );
    await act(async () => {});

    act(() => {
      result.current.updateDraftSettings("passMinWpm", 58);
      result.current.updateDraftSettings("passMinAccuracy", 92);
    });

    await act(async () => {
      await result.current.saveDraftSettings();
    });

    expect(api.saveTypingSettings).toHaveBeenCalledWith(
      "normal",
      expect.objectContaining({
        passMinWpm: 58,
        passMinAccuracy: 92,
      })
    );
    expect(result.current.settings.passMinWpm).toBe(58);
    expect(result.current.status.type).toBe("success");
  });

  it("atualiza configurações do game por evento em tempo real", async () => {
    const { result } = renderHook(() =>
      useTypingGameSettings({ studentType: "normal", isProfessor: false })
    );
    await act(async () => {});

    act(() => {
      typingSettingsMock.subscribers["game:normal"]({
        studentType: "normal",
        passMinWpm: 52,
        passMinAccuracy: 91,
        maxLives: 5,
        gameSpeed: 80,
        gameSpeedBoost: 12,
        updatedAt: "2026-05-11T00:00:00.000Z",
      });
    });

    expect(result.current.settings.passMinWpm).toBe(52);
    expect(result.current.settings.passMinAccuracy).toBe(91);
    expect(result.current.settings.maxLives).toBe(5);
    expect(result.current.settings.gameSpeed).toBe(80);
    expect(result.current.settings.gameSpeedBoost).toBe(12);
  });

  it("não abre requisições nem SSE enquanto o app está oculto", async () => {
    const { rerender } = renderHook(
      ({ enabled }) =>
        useTypingSettings({
          studentType: "normal",
          isProfessor: false,
          enabled,
        }),
      { initialProps: { enabled: false } }
    );
    await act(async () => {});

    expect(api.getTypingSettings).not.toHaveBeenCalled();
    expect(api.subscribeTypingSettings).not.toHaveBeenCalled();

    rerender({ enabled: true });
    await act(async () => {});

    expect(api.getTypingSettings).toHaveBeenCalledTimes(1);
    expect(api.subscribeTypingSettings).toHaveBeenCalledTimes(1);

    rerender({ enabled: false });
    expect(typingSettingsMock.close).toHaveBeenCalledTimes(1);
  });
});
