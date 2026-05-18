/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useTypingEngine,
  calculateLiveWpm,
  calculateMomentum,
  PASS_MIN_WPM,
  PASS_MIN_ACCURACY,
} from "../src/containers/applications/apps/typingKids/hooks/useTypingEngine";
import { TYPING_LESSONS } from "../src/containers/applications/apps/assets/typingLessons";
import { api } from "../src/lib/api";

const typingSettingsMock = vi.hoisted(() => ({
  subscribers: {},
  close: vi.fn(),
}));

vi.mock("../src/lib/api", () => ({
  api: {
    saveTypingScore: vi.fn().mockResolvedValue({}),
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

describe("Typing Kids Engine", () => {
  const mockUser = { username: "testuser", role: "student" };

  beforeEach(() => {
    localStorage.clear();
    typingSettingsMock.subscribers = {};
    vi.clearAllMocks();
  });

  describe("Math Helpers", () => {
    it("calculates live WPM correctly", () => {
      // 25 chars = 5 words. 1 minute = 60000ms. 5 words / 1 min = 5 WPM.
      expect(
        calculateLiveWpm(
          "abcde abcde abcde abcde a",
          "abcde abcde abcde abcde a",
          60000
        )
      ).toBe(5);
    });

    it("calculates momentum accurately based on performance", () => {
      const momentum = calculateMomentum({
        accuracyValue: 100, // Ratio: 1.05 (clamped to 1.1)
        comboValue: 24, // Ratio: 1.0
        progressValue: 50, // Ratio: 0.5
        lessonLength: 100,
        liveWpm: 40, // Ratio: 1.0
      });
      // speed (1 * 34) + acc (1.05 * 34 -> clamped to 1.0 * 34 maybe? formula: 100/95=1.05 * 34 = 35.7) + combo (1 * 20) + progress (0.5 * 12 = 6) = 34+35.7+20+6 = ~95
      expect(momentum).toBeGreaterThan(80);
      expect(momentum).toBeLessThanOrEqual(100);
    });
  });

  describe("useTypingEngine Hook", () => {
    it("initializes with default values", () => {
      const { result } = renderHook(() => useTypingEngine(mockUser));
      expect(result.current.userInput).toBe("");
      expect(result.current.finished).toBe(false);
      expect(result.current.wpm).toBe(0);
      expect(result.current.combo).toBe(0);
    });

    it("launches a lesson correctly", () => {
      const { result } = renderHook(() => useTypingEngine(mockUser));
      act(() => {
        result.current.launchLesson(TYPING_LESSONS[0]);
      });

      expect(result.current.currentLesson).toBeDefined();
      expect(result.current.currentLesson.id).toBe(1);
      expect(result.current.userInput).toBe("");
    });

    it("handles correct input and increments combo", () => {
      const { result } = renderHook(() => useTypingEngine(mockUser));
      act(() => {
        result.current.launchLesson(TYPING_LESSONS[0]);
      });

      const firstChar = result.current.currentLesson.text[0];

      act(() => {
        result.current.handleInputChange(firstChar);
      });

      expect(result.current.userInput).toBe(firstChar);
      expect(result.current.totalErrors).toBe(0);
      expect(result.current.combo).toBe(1);
      expect(result.current.mistakeJustAdded).toBe(false);
    });

    it("handles incorrect input, resets combo and flags mistake", () => {
      const { result } = renderHook(() => useTypingEngine(mockUser));
      act(() => {
        result.current.launchLesson(TYPING_LESSONS[0]);
      });

      const firstChar = result.current.currentLesson.text[0];
      const wrongChar = firstChar === "a" ? "b" : "a";

      act(() => {
        result.current.handleInputChange(wrongChar);
      });

      expect(result.current.totalErrors).toBe(1);
      expect(result.current.combo).toBe(0);
      expect(result.current.mistakeJustAdded).toBe(true);
    });

    it("não perde vida nem registra erro ao pressionar acento antes da letra", () => {
      const { result } = renderHook(() => useTypingEngine(mockUser));
      act(() => {
        result.current.launchLesson(TYPING_LESSONS[0]);
      });

      act(() => {
        result.current.handleInputChange("~");
      });

      expect(result.current.userInput).toBe("");
      expect(result.current.totalErrors).toBe(0);
      expect(result.current.lives).toBe(result.current.maxErrors);
    });

    it("compõe acento morto com a letra seguinte quando o navegador envia só a letra base", () => {
      const { result } = renderHook(() => useTypingEngine(mockUser));
      const accentedLesson = {
        ...TYPING_LESSONS[0],
        id: 999,
        variants: ["anão"],
      };

      act(() => {
        result.current.launchLesson(accentedLesson);
      });

      act(() => {
        result.current.handleInputChange("an");
      });

      act(() => {
        result.current.handleInputDeadKey({ key: "Dead" });
      });

      act(() => {
        result.current.handleInputChange("ana");
      });

      expect(result.current.userInput).toBe("anã");
      expect(result.current.totalErrors).toBe(0);
      expect(result.current.lives).toBe(result.current.maxErrors);
    });

    it("não registra erro quando o navegador já entrega a letra acentuada composta", () => {
      const { result } = renderHook(() => useTypingEngine(mockUser));
      const accentedLesson = {
        ...TYPING_LESSONS[0],
        id: 1000,
        variants: ["anão"],
      };

      act(() => {
        result.current.launchLesson(accentedLesson);
      });

      act(() => {
        result.current.handleInputChange("an");
      });

      act(() => {
        result.current.handleInputDeadKey({ key: "Dead", code: "Backquote" });
      });

      act(() => {
        result.current.handleInputChange("anã");
      });

      expect(result.current.userInput).toBe("anã");
      expect(result.current.totalErrors).toBe(0);
      expect(result.current.lives).toBe(result.current.maxErrors);
    });

    it("completes the lesson when text is fully typed", () => {
      const { result } = renderHook(() => useTypingEngine(mockUser));
      act(() => {
        result.current.launchLesson(TYPING_LESSONS[0]);
      });

      const fullText = result.current.currentLesson.text;

      act(() => {
        // Simulate typing the whole thing correctly at once for speed test
        result.current.handleInputChange(fullText);
      });

      expect(result.current.finished).toBe(true);
      expect(result.current.accuracy).toBe(100);
      expect(result.current.passed).toBe(true); // WPM will be very high due to instant typing
    });

    it("saves score to API upon passing", async () => {
      const { result } = renderHook(() => useTypingEngine(mockUser));
      act(() => {
        result.current.launchLesson(TYPING_LESSONS[0]);
      });

      const fullText = result.current.currentLesson.text;

      act(() => {
        // Fast forward start time to simulate 1 minute of typing
        result.current.handleInputChange(fullText[0]); // Start clock
      });

      // We must hack the clock or elapsed time to get a passing WPM,
      // but since we are testing the hook logic directly, we can just observe if finishLesson calls API
      // We'll write a test that forces a pass condition by typing all at once.
      // Since time is instantaneous, WPM will be extremely high.
      act(() => {
        result.current.handleInputChange(fullText);
      });

      // WPM should be very high, Accuracy 100%. Therefore passed = true.
      expect(result.current.passed).toBe(true);
      expect(api.saveTypingScore).toHaveBeenCalled();
    });

    it("atualiza metas e vidas em tempo real durante uma lição aberta", async () => {
      const { result } = renderHook(() => useTypingEngine(mockUser));
      await act(async () => {});

      act(() => {
        result.current.launchLesson(TYPING_LESSONS[0]);
      });

      expect(result.current.passMinWpm).toBe(40);
      expect(result.current.passMinAccuracy).toBe(95);

      act(() => {
        typingSettingsMock.subscribers.kids({
          studentType: "kids",
          passMinWpm: 72,
          passMinAccuracy: 98,
          maxErrors: 5,
          updatedAt: "2026-05-11T00:00:00.000Z",
        });
      });

      expect(result.current.passMinWpm).toBe(72);
      expect(result.current.passMinAccuracy).toBe(98);
      expect(result.current.maxErrors).toBe(5);
    });
  });
});
