import { describe, expect, it } from "vitest"
import { getPvpPlayerName, getPvpScoreOutcome, getPvpScoreTitle } from "./pvpScoresFormat"
import type { PvpScoreRow } from "./pvpApi"

const baseMatch: PvpScoreRow = {
  id: "m1",
  created_at: "2026-06-11T12:00:00Z",
  winner_id: "u1",
  winner_name: "ana",
  winner_score: 20,
  loser_id: "u2",
  loser_name: "bia",
  loser_score: 13,
}

describe("getPvpScoreOutcome", () => {
  it("classifica vitória, derrota e duelo neutro pelo usuário atual", () => {
    expect(getPvpScoreOutcome(baseMatch, "u1")).toBe("win")
    expect(getPvpScoreOutcome(baseMatch, "u2")).toBe("loss")
    expect(getPvpScoreOutcome(baseMatch, "u3")).toBe("neutral")
  })
})

describe("getPvpScoreTitle", () => {
  it("retorna o título exibido no histórico", () => {
    expect(getPvpScoreTitle(baseMatch, "u1")).toBe("Vitória")
    expect(getPvpScoreTitle(baseMatch, "u2")).toBe("Derrota")
    expect(getPvpScoreTitle(baseMatch, "u3")).toBe("Duelo")
  })
})

describe("getPvpPlayerName", () => {
  it("normaliza nomes ausentes de alunos removidos", () => {
    expect(getPvpPlayerName(" Ana ")).toBe("Ana")
    expect(getPvpPlayerName("")).toBe("Aluno removido")
    expect(getPvpPlayerName(null)).toBe("Aluno removido")
  })
})
