import { describe, expect, it } from "vitest"
import { generatePvpWords, PVP_WORD_POOL } from "./pvpWords"

describe("generatePvpWords", () => {
  it("gera a mesma sequência para o mesmo seed (determinístico)", () => {
    expect(generatePvpWords(12345, 20)).toEqual(generatePvpWords(12345, 20))
  })

  it("gera sequências diferentes para seeds diferentes", () => {
    expect(generatePvpWords(1, 20)).not.toEqual(generatePvpWords(2, 20))
  })

  it("usa apenas palavras do pool, na quantidade pedida", () => {
    const words = generatePvpWords(999, 50)

    expect(words).toHaveLength(50)
    const pool = new Set<string>(PVP_WORD_POOL)
    expect(words.every((word) => pool.has(word))).toBe(true)
  })
})
