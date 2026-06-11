import { useCallback, useEffect, useRef, useState } from "react"
import { useGetMeQuery } from "@/features/auth/authApi"
import {
  useGetPvpLobbyQuery,
  usePvpAcceptMutation,
  usePvpChallengeMutation,
  usePvpRejectMutation,
  usePvpSyncMutation,
  usePvpWinMutation,
  type PvpSyncState,
} from "@/features/pvp/pvpApi"
import { generatePvpWords } from "@/features/pvp/pvpWords"
import { usePvpChannel, type PvpEvent } from "@/features/pvp/usePvpChannel"
import { getApiErrorMessage } from "@/utils/errors"
import type { User } from "@/types/user"

const MATCH_WORD_COUNT = 20

interface Match {
  roomId: string
  seed: number
  players: User[]
}

interface MatchResult {
  winnerId: string
  winnerScore: number
  loserScore: number
}

export default function PvpApp() {
  const { data: me } = useGetMeQuery()
  const user = me?.user
  const [challenge, setChallenge] = useState<User | null>(null)
  const [match, setMatch] = useState<Match | null>(null)
  const [result, setResult] = useState<MatchResult | null>(null)
  const [opponentState, setOpponentState] = useState<PvpSyncState>({ wordsCompleted: 0, wpm: 0 })

  const handleEvent = useCallback((event: PvpEvent) => {
    switch (event.type) {
      case "challenge_received":
        setChallenge(event.challenger)
        break
      case "match_started":
        setChallenge(null)
        setResult(null)
        setOpponentState({ wordsCompleted: 0, wpm: 0 })
        setMatch({ roomId: event.roomId, seed: event.seed, players: event.players })
        break
      case "sync":
        setOpponentState(event.state)
        break
      case "match_finished":
        setMatch(null)
        setResult({ winnerId: event.winnerId, winnerScore: event.winnerScore, loserScore: event.loserScore })
        break
      case "opponent_disconnected":
        setMatch(null)
        break
      default:
        break
    }
  }, [])

  usePvpChannel(Boolean(user), handleEvent)

  if (!user) return <p className="text-sm text-white/60">Carregando…</p>

  if (match) {
    return (
      <PvpDuel
        match={match}
        currentUserId={user.id}
        opponentState={opponentState}
      />
    )
  }

  return (
    <PvpLobby
      currentUserId={user.id}
      incomingChallenge={challenge}
      onChallengeHandled={() => setChallenge(null)}
      result={result}
      onDismissResult={() => setResult(null)}
    />
  )
}

function PvpLobby({
  currentUserId,
  incomingChallenge,
  onChallengeHandled,
  result,
  onDismissResult,
}: {
  currentUserId: string
  incomingChallenge: User | null
  onChallengeHandled: () => void
  result: MatchResult | null
  onDismissResult: () => void
}) {
  const { data, isLoading, isError, error } = useGetPvpLobbyQuery(undefined, { pollingInterval: 10000 })
  const [sendChallenge, { isLoading: isChallenging }] = usePvpChallengeMutation()
  const [accept] = usePvpAcceptMutation()
  const [reject] = usePvpRejectMutation()

  if (isLoading) return <p className="text-sm text-white/60">Carregando…</p>
  if (isError || !data) {
    return <p className="text-sm text-red-400">{getApiErrorMessage(error, "Não foi possível carregar o lobby.")}</p>
  }

  return (
    <div className="flex h-full flex-col gap-3 text-sm">
      {result && (
        <div
          className={`flex items-center justify-between rounded-md px-3 py-2 text-xs ${
            result.winnerId === currentUserId ? "bg-green-600/20 text-green-300" : "bg-red-600/20 text-red-300"
          }`}
        >
          <span>
            {result.winnerId === currentUserId ? "Você venceu!" : "Você perdeu."} ({result.winnerScore} ×{" "}
            {result.loserScore})
          </span>
          <button type="button" onClick={onDismissResult} aria-label="Fechar resultado">
            ✕
          </button>
        </div>
      )}

      {incomingChallenge && (
        <div className="flex items-center justify-between rounded-md bg-accent/20 px-3 py-2 text-xs">
          <span>
            <strong>{incomingChallenge.displayName}</strong> desafiou você!
          </span>
          <span className="flex gap-1">
            <button
              type="button"
              className="rounded-md bg-green-600/80 px-2 py-1 font-medium text-white hover:bg-green-500"
              onClick={() => {
                void accept({ challengerId: incomingChallenge.id })
                onChallengeHandled()
              }}
            >
              Aceitar
            </button>
            <button
              type="button"
              className="rounded-md bg-white/10 px-2 py-1 hover:bg-white/20"
              onClick={() => {
                void reject({ challengerId: incomingChallenge.id })
                onChallengeHandled()
              }}
            >
              Recusar
            </button>
          </span>
        </div>
      )}

      <p className="text-xs text-white/60">Desafie um colega da sua turma para um duelo de digitação.</p>

      <div className="flex-1 overflow-auto">
        {data.players.length === 0 ? (
          <p className="text-xs text-white/40">Nenhum colega disponível no momento.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {data.players.map((player) => (
              <li
                key={player.id}
                className="flex items-center justify-between gap-2 rounded-md bg-black/30 px-2 py-1.5 text-xs"
              >
                <span className="truncate">
                  {player.displayName} <span className="text-white/40">({player.username})</span>
                </span>
                <button
                  type="button"
                  disabled={isChallenging}
                  onClick={() => void sendChallenge({ targetId: player.id })}
                  className="shrink-0 rounded-md bg-accent px-2 py-1 font-medium text-white hover:bg-accent-hover disabled:opacity-50"
                >
                  Desafiar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function PvpDuel({
  match,
  currentUserId,
  opponentState,
}: {
  match: Match
  currentUserId: string
  opponentState: PvpSyncState
}) {
  const words = generatePvpWords(match.seed, MATCH_WORD_COUNT)
  const opponent = match.players.find((player) => player.id !== currentUserId)
  const [wordIndex, setWordIndex] = useState(0)
  const [typed, setTyped] = useState("")
  const [startTime] = useState(() => Date.now())
  const [myWpm, setMyWpm] = useState(0)
  const [sync] = usePvpSyncMutation()
  const [win] = usePvpWinMutation()
  const finishedRef = useRef(false)

  const currentWord = words[wordIndex] ?? ""

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = event.target.value
    // Espaço ou palavra completa avança para a próxima.
    if (value.trim() === currentWord && (value.endsWith(" ") || value.trim().length === currentWord.length)) {
      const nextIndex = wordIndex + 1
      const elapsedMin = Math.max((Date.now() - startTime) / 60000, 1 / 60)
      const wpm = Math.round(nextIndex / elapsedMin)
      setWordIndex(nextIndex)
      setMyWpm(wpm)
      setTyped("")
      void sync({ state: { wordsCompleted: nextIndex, wpm } })
      return
    }
    setTyped(value)
  }

  // Vitória: o primeiro a completar todas as palavras chama /win; o servidor
  // emite match_finished para os dois lados.
  useEffect(() => {
    if (wordIndex >= MATCH_WORD_COUNT && !finishedRef.current) {
      finishedRef.current = true
      void win({ winnerScore: wordIndex, loserScore: opponentState.wordsCompleted })
    }
  }, [wordIndex, opponentState.wordsCompleted, win])

  const myProgress = Math.min((wordIndex / MATCH_WORD_COUNT) * 100, 100)
  const opponentProgress = Math.min((opponentState.wordsCompleted / MATCH_WORD_COUNT) * 100, 100)

  return (
    <div className="flex h-full flex-col gap-3 text-sm">
      <div className="flex flex-col gap-2">
        <ProgressBar label="Você" progress={myProgress} detail={`${wordIndex}/${MATCH_WORD_COUNT}`} accent />
        <ProgressBar
          label={opponent?.displayName ?? "Adversário"}
          progress={opponentProgress}
          detail={`${opponentState.wordsCompleted}/${MATCH_WORD_COUNT}`}
        />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <p className="text-xs text-white/40">Digite a palavra e pressione espaço:</p>
        <p className="font-mono text-2xl font-semibold tracking-wide" aria-label="Palavra atual">
          {currentWord}
        </p>
        <input
          type="text"
          aria-label="Digite a palavra do duelo"
          autoFocus
          value={typed}
          onChange={handleChange}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className="w-48 rounded-md bg-black/30 px-3 py-2 text-center font-mono text-white outline-none focus:ring-1 focus:ring-accent"
        />
        <p className="text-xs text-white/40">{myWpm} palavras/min</p>
      </div>
    </div>
  )
}

function ProgressBar({
  label,
  progress,
  detail,
  accent = false,
}: {
  label: string
  progress: number
  detail: string
  accent?: boolean
}) {
  return (
    <div className="text-xs">
      <div className="mb-0.5 flex justify-between text-white/60">
        <span>{label}</span>
        <span>{detail}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-black/40">
        <div
          className={`h-full transition-all ${accent ? "bg-accent" : "bg-white/40"}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
