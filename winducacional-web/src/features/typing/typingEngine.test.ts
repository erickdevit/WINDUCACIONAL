import { describe, expect, it } from "vitest"
import {
  calculateAccuracy,
  calculateLiveWpm,
  calculateMomentum,
  countUncorrectedErrors,
  evaluateLesson,
  getVariantIndex,
} from "./typingEngine"

const THRESHOLDS = { passMinWpm: 40, passMinAccuracy: 95, maxErrors: 7 }

describe("countUncorrectedErrors", () => {
  it("conta caracteres divergentes do texto de referência", () => {
    expect(countUncorrectedErrors("casa", "casa")).toBe(0)
    expect(countUncorrectedErrors("cesa", "casa")).toBe(1)
    expect(countUncorrectedErrors("xxxx", "casa")).toBe(4)
  })

  it("aceita texto acentuado em NFC sem marcar erro", () => {
    // O valor digitado chega em NFC via normalizeTypingInputValue; a
    // equival\u00eancia decomposto\u00d7precomposto \u00e9 coberta nos testes de typingInput.
    expect(countUncorrectedErrors("an\u00e3o", "an\u00e3o")).toBe(0)
  })
})

describe("calculateLiveWpm", () => {
  it("calcula PPM líquido: bruto menos erros não corrigidos por minuto", () => {
    // 50 caracteres corretos em 60s → 10 palavras/min
    expect(calculateLiveWpm("a".repeat(50), "a".repeat(50), 60000)).toBe(10)
  })

  it("desconta erros do PPM bruto", () => {
    // 50 caracteres com 5 erros em 60s → 10 - 5 = 5
    const typed = "b".repeat(5) + "a".repeat(45)
    expect(calculateLiveWpm(typed, "a".repeat(50), 60000)).toBe(5)
  })

  it("nunca retorna PPM negativo", () => {
    expect(calculateLiveWpm("bbbb", "aaaa", 60000)).toBe(0)
  })

  it("retorna zero sem texto ou sem tempo", () => {
    expect(calculateLiveWpm("", "casa", 60000)).toBe(0)
    expect(calculateLiveWpm("casa", "casa", 0)).toBe(0)
  })
})

describe("calculateAccuracy", () => {
  it("retorna 100 para entrada vazia ou sem erros", () => {
    expect(calculateAccuracy("", "casa")).toBe(100)
    expect(calculateAccuracy("casa", "casa")).toBe(100)
  })

  it("calcula o percentual de acertos sobre o digitado", () => {
    expect(calculateAccuracy("cesa", "casa")).toBe(75)
    expect(calculateAccuracy("xxxx", "casa")).toBe(0)
  })
})

describe("evaluateLesson", () => {
  it("aprova quando PPM, precisão e erros atingem os limites", () => {
    const text = "a".repeat(250)
    const result = evaluateLesson(text, text, 60000, THRESHOLDS)

    expect(result).toEqual({ wpm: 50, accuracy: 100, errors: 0, passed: true })
  })

  it("reprova por PPM abaixo do mínimo", () => {
    const text = "a".repeat(100)
    const result = evaluateLesson(text, text, 60000, THRESHOLDS)

    expect(result.wpm).toBe(20)
    expect(result.passed).toBe(false)
  })

  it("reprova por excesso de erros mesmo com PPM e precisão altos", () => {
    const typed = "b".repeat(8) + "a".repeat(492)
    const reference = "a".repeat(500)
    const result = evaluateLesson(typed, reference, 60000, THRESHOLDS)

    expect(result.errors).toBe(8)
    expect(result.accuracy).toBeGreaterThanOrEqual(95)
    expect(result.passed).toBe(false)
  })
})

describe("calculateMomentum", () => {
  it("retorna zero sem lição", () => {
    expect(
      calculateMomentum({
        accuracyValue: 100,
        comboValue: 10,
        progressValue: 0,
        lessonLength: 0,
        liveWpm: 50,
        passMinWpm: 40,
        passMinAccuracy: 95,
      }),
    ).toBe(0)
  })

  it("chega perto de 100 com tudo no máximo", () => {
    const momentum = calculateMomentum({
      accuracyValue: 100,
      comboValue: 24,
      progressValue: 50,
      lessonLength: 50,
      liveWpm: 54,
      passMinWpm: 40,
      passMinAccuracy: 95,
    })

    expect(momentum).toBeGreaterThanOrEqual(95)
    expect(momentum).toBeLessThanOrEqual(100)
  })
})

describe("getVariantIndex", () => {
  it("rotaciona dentro do número de variantes", () => {
    expect(getVariantIndex(0, 8)).toBe(0)
    expect(getVariantIndex(9, 8)).toBe(1)
    expect(getVariantIndex(-1, 8)).toBe(7)
  })

  it("usa limite 1 quando não há variantes", () => {
    expect(getVariantIndex(5, 0)).toBe(0)
  })
})
