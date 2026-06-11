import { useCallback, useEffect, useRef, useState } from "react"
import { useGetMeQuery } from "@/features/auth/authApi"
import { useGetTurmasQuery } from "@/features/users/usersApi"
import {
  useGetPvpLobbyQuery,
  useGetPvpScoresQuery,
  usePvpAcceptMutation,
  usePvpChallengeMutation,
  usePvpRejectMutation,
  usePvpSyncMutation,
  usePvpWinMutation,
  type PvpScoreRow,
  type PvpScoreScope,
  type PvpSyncState,
} from "@/features/pvp/pvpApi"
import { getPvpPlayerName, getPvpScoreOutcome, getPvpScoreTitle } from "@/features/pvp/pvpScoresFormat"
import { generatePvpWords } from "@/features/pvp/pvpWords"
import { usePvpChannel, type PvpEvent } from "@/features/pvp/usePvpChannel"
import { getApiErrorMessage } from "@/utils/errors"
import type { User, UserRole } from "@/types/user"

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
      currentUser={user}
      incomingChallenge={challenge}
      onChallengeHandled={() => setChallenge(null)}
      result={result}
      onDismissResult={() => setResult(null)}
    />
  )
}

function PvpLobby({
  currentUser,
  incomingChallenge,
  onChallengeHandled,
  result,
  onDismissResult,
}: {
  currentUser: User
  incomingChallenge: User | null
  onChallengeHandled: () => void
  result: MatchResult | null
  onDismissResult: () => void
}) {
  const canPlay = currentUser.role === "aluno"
  const { data, isLoading, isError, error } = useGetPvpLobbyQuery(undefined, {
    pollingInterval: 10000,
    skip: !canPlay,
  })
  const [sendChallenge, { isLoading: isChallenging }] = usePvpChallengeMutation()
  const [accept] = usePvpAcceptMutation()
  const [reject] = usePvpRejectMutation()
  const [scoreScope, setScoreScope] = useState<PvpScoreScope>("turma")

  if (canPlay && isLoading) return <p className="text-sm text-white/60">Carregando…</p>
  if (canPlay && (isError || !data)) {
    return <p className="text-sm text-red-400">{getApiErrorMessage(error, "Não foi possível carregar o lobby.")}</p>
  }

  return (
    <div className="flex h-full flex-col gap-3 text-sm">
      {canPlay && result && (
        <div
          className={`flex items-center justify-between rounded-md px-3 py-2 text-xs ${
            result.winnerId === currentUser.id ? "bg-green-600/20 text-green-300" : "bg-red-600/20 text-red-300"
          }`}
        >
          <span>
            {result.winnerId === currentUser.id ? "Você venceu!" : "Você perdeu."} ({result.winnerScore} ×{" "}
            {result.loserScore})
          </span>
          <button type="button" onClick={onDismissResult} aria-label="Fechar resultado">
            ✕
          </button>
        </div>
      )}

      {canPlay && incomingChallenge && (
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

      {canPlay ? (
        <>
          <p className="text-xs text-white/60">Desafie um colega da sua turma para um duelo de digitação.</p>
          <div className="min-h-[120px] overflow-auto">
            {(data?.players ?? []).length === 0 ? (
              <p className="text-xs text-white/40">Nenhum colega disponível no momento.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {(data?.players ?? []).map((player) => (
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
        </>
      ) : (
        <p className="text-xs text-white/60">Acompanhe os duelos de digitação por turma ou no histórico global.</p>
      )}

      <PvpScoresPanel
        currentUserId={currentUser.id}
        currentUserRole={currentUser.role}
        scope={scoreScope}
        onScopeChange={setScoreScope}
      />
    </div>
  )
}

function PvpScoresPanel({
  currentUserId,
  currentUserRole,
  scope,
  onScopeChange,
}: {
  currentUserId: string
  currentUserRole: UserRole
  scope: PvpScoreScope
  onScopeChange: (scope: PvpScoreScope) => void
}) {
  const canSelectTurma = currentUserRole !== "aluno"
  const { data: turmasData, isLoading: isLoadingTurmas } = useGetTurmasQuery(undefined, { skip: !canSelectTurma })
  const turmas = turmasData?.turmas ?? []
  const [selectedTurmaId, setSelectedTurmaId] = useState("")
  const effectiveTurmaId = canSelectTurma ? selectedTurmaId || turmas[0]?.id : undefined
  const { data, isLoading, isError, error } = useGetPvpScoresQuery(
    { scope, turmaId: scope === "turma" ? effectiveTurmaId : undefined },
    { refetchOnMountOrArgChange: true, skip: scope === "turma" && canSelectTurma && !effectiveTurmaId },
  )
  const matches = data?.matches ?? []

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-2 border-t border-white/10 pt-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-white/70">Histórico</span>
        <div className="flex gap-1">
          {(["turma", "global"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onScopeChange(value)}
              className={`rounded-md px-2 py-1 text-xs ${
                scope === value ? "bg-accent text-white" : "bg-white/10 hover:bg-white/20"
              }`}
            >
              {value === "turma" ? "Minha turma" : "Global"}
            </button>
          ))}
        </div>
      </div>

      {scope === "turma" && canSelectTurma && (
        <select
          aria-label="Filtrar histórico PVP por turma"
          value={effectiveTurmaId ?? ""}
          onChange={(event) => setSelectedTurmaId(event.target.value)}
          className="rounded-md bg-black/30 px-2 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-accent"
          disabled={isLoadingTurmas || turmas.length === 0}
        >
          {turmas.length === 0 ? (
            <option value="">Nenhuma turma disponível</option>
          ) : (
            turmas.map((turma) => (
              <option key={turma.id} value={turma.id}>
                {turma.nome}
              </option>
            ))
          )}
        </select>
      )}

      <div className="min-h-[120px] flex-1 overflow-auto">
        {isLoading || (scope === "turma" && canSelectTurma && isLoadingTurmas) ? (
          <p className="text-xs text-white/60">Carregando histórico…</p>
        ) : scope === "turma" && canSelectTurma && !effectiveTurmaId ? (
          <p className="text-xs text-white/40">Cadastre uma turma para acompanhar o histórico.</p>
        ) : isError ? (
          <p className="text-xs text-red-400">
            {getApiErrorMessage(error, "Não foi possível carregar o histórico.")}
          </p>
        ) : matches.length === 0 ? (
          <p className="text-xs text-white/40">Nenhum duelo registrado ainda.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {matches.map((match) => (
              <PvpScoreItem key={match.id} match={match} currentUserId={currentUserId} />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function PvpScoreItem({ match, currentUserId }: { match: PvpScoreRow; currentUserId: string }) {
  const outcome = getPvpScoreOutcome(match, currentUserId)
  const tone =
    outcome === "win"
      ? "bg-green-600/15 text-green-300"
      : outcome === "loss"
        ? "bg-red-600/15 text-red-300"
        : "bg-black/30 text-white/70"

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-md bg-black/30 px-2 py-1.5 text-xs">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className={`rounded px-1.5 py-0.5 font-medium ${tone}`}>
            {getPvpScoreTitle(match, currentUserId)}
          </span>
          <span className="truncate text-white/80">
            {getPvpPlayerName(match.winner_name)} venceu {getPvpPlayerName(match.loser_name)}
          </span>
        </div>
        <p className="mt-0.5 text-white/40">{formatPvpDate(match.created_at)}</p>
      </div>
      <span className="self-center font-mono text-white/80">
        {match.winner_score}×{match.loser_score}
      </span>
    </li>
  )
}

function formatPvpDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Data indisponível"
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date)
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

  // Vitória: o cliente só sinaliza que terminou; o servidor decide o vencedor
  // usando o progresso sincronizado da sala.
  useEffect(() => {
    if (wordIndex >= MATCH_WORD_COUNT && !finishedRef.current) {
      finishedRef.current = true
      void sync({ state: { wordsCompleted: wordIndex, wpm: myWpm } })
        .unwrap()
        .then(() => win().unwrap())
    }
  }, [myWpm, sync, win, wordIndex])

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
