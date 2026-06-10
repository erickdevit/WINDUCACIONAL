import { useEffect, useRef } from "react"
import { getCableConsumer } from "@/api/cable"
import type { User } from "@/types/user"
import type { PvpSyncState } from "./pvpApi"

// Eventos do TypingPvpChannel (mesmos tipos do SSE legado).
export type PvpEvent =
  | { type: "connected"; user: User }
  | { type: "challenge_received"; challenger: User }
  | { type: "challenge_rejected"; targetId: string }
  | { type: "match_started"; roomId: string; seed: number; players: User[] }
  | { type: "sync"; userId: string; state: PvpSyncState }
  | { type: "match_finished"; winnerId: string; loserId: string; winnerScore: number; loserScore: number }
  | { type: "opponent_disconnected" }

export function usePvpChannel(enabled: boolean, onEvent: (event: PvpEvent) => void) {
  // Mantém o callback atual sem recriar a assinatura a cada render.
  const handlerRef = useRef(onEvent)
  useEffect(() => {
    handlerRef.current = onEvent
  }, [onEvent])

  useEffect(() => {
    if (!enabled) return
    const consumer = getCableConsumer()
    if (!consumer) return

    const subscription = consumer.subscriptions.create(
      { channel: "TypingPvpChannel" },
      {
        received: (event: PvpEvent) => handlerRef.current(event),
      },
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [enabled])
}
