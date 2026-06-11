import type { PvpScoreRow } from "./pvpApi"

export type PvpScoreOutcome = "win" | "loss" | "neutral"

export function getPvpScoreOutcome(match: PvpScoreRow, currentUserId: string): PvpScoreOutcome {
  if (match.winner_id === currentUserId) return "win"
  if (match.loser_id === currentUserId) return "loss"
  return "neutral"
}

export function getPvpScoreTitle(match: PvpScoreRow, currentUserId: string) {
  const outcome = getPvpScoreOutcome(match, currentUserId)
  if (outcome === "win") return "Vitória"
  if (outcome === "loss") return "Derrota"
  return "Duelo"
}

export function getPvpPlayerName(name: string | null) {
  const normalized = name?.trim()
  return normalized && normalized.length > 0 ? normalized : "Aluno removido"
}
