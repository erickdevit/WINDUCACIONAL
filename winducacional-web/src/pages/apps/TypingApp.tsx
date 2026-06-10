import { useEffect, useMemo, useRef, useState } from "react"
import { useGetMeQuery } from "@/features/auth/authApi"
import {
  calculateAccuracy,
  calculateLiveWpm,
  countUncorrectedErrors,
  evaluateLesson,
  getVariantIndex,
  type LessonEvaluation,
} from "@/features/typing/typingEngine"
import {
  normalizeTypingInputValue,
  resolveDeadKeyMarkFromEvent,
  areTypingCharactersEquivalent,
} from "@/features/typing/typingInput"
import { TYPING_LESSONS, type TypingLesson } from "@/features/typing/typingLessons"
import {
  useGetTypingRankingGlobalQuery,
  useGetTypingRankingTurmaQuery,
  useGetTypingSettingsQuery,
  useSaveTypingScoreMutation,
} from "@/features/typing/typingApi"
import { getApiErrorMessage } from "@/utils/errors"

type View = "menu" | "lesson" | "result" | "ranking"

interface Session {
  lesson: TypingLesson
  text: string
}

function variantStorageKey(username: string) {
  return `typingLessonVariants_${username}`
}

function loadVariantMap(username: string): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(variantStorageKey(username)) ?? "{}") as Record<string, number>
  } catch {
    return {}
  }
}

function bumpVariant(username: string, lessonId: number) {
  const map = loadVariantMap(username)
  map[lessonId] = (Number(map[lessonId]) || 0) + 1
  localStorage.setItem(variantStorageKey(username), JSON.stringify(map))
}

export default function TypingApp() {
  const { data: me } = useGetMeQuery()
  const user = me?.user
  const studentType = user?.studentType === "kids" ? "kids" : "normal"
  const { data: settingsData } = useGetTypingSettingsQuery(studentType, { skip: !user })

  const [view, setView] = useState<View>("menu")
  const [session, setSession] = useState<Session | null>(null)
  const [typed, setTyped] = useState("")
  const [pendingMark, setPendingMark] = useState("")
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [result, setResult] = useState<LessonEvaluation | null>(null)
  const [saveScore] = useSaveTypingScoreMutation()
  const inputRef = useRef<HTMLInputElement>(null)

  const settings = settingsData?.settings
  const passMinWpm = settings?.passMinWpm ?? 40
  const passMinAccuracy = settings?.passMinAccuracy ?? 95
  const maxErrors = settings?.maxErrors ?? 7

  // Cronômetro da lição em andamento.
  useEffect(() => {
    if (view !== "lesson" || startTime === null) return
    const interval = setInterval(() => setElapsedMs(Date.now() - startTime), 250)
    return () => clearInterval(interval)
  }, [view, startTime])

  const liveErrors = session ? countUncorrectedErrors(typed, session.text) : 0
  const liveWpm = session ? calculateLiveWpm(typed, session.text, elapsedMs) : 0
  const liveAccuracy = session ? calculateAccuracy(typed, session.text) : 100

  function startLesson(lesson: TypingLesson) {
    const map = user ? loadVariantMap(user.username) : {}
    const variantIndex = getVariantIndex(Number(map[lesson.id]) || 0, lesson.variants.length)
    setSession({ lesson, text: lesson.variants[variantIndex] })
    setTyped("")
    setPendingMark("")
    setStartTime(null)
    setElapsedMs(0)
    setResult(null)
    setView("lesson")
  }

  function finishLesson(finalTyped: string, finalElapsed: number) {
    if (!session || !user) return
    const evaluation = evaluateLesson(finalTyped, session.text, finalElapsed, {
      passMinWpm,
      passMinAccuracy,
      maxErrors,
    })
    setResult(evaluation)
    setView("result")
    bumpVariant(user.username, session.lesson.id)
    void saveScore({
      lessonId: session.lesson.id,
      wpm: evaluation.wpm,
      accuracy: evaluation.accuracy,
      timeMs: finalElapsed,
    })
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (!session) return
    const now = Date.now()
    const effectiveStart = startTime ?? now
    if (startTime === null) setStartTime(now)

    const normalized = normalizeTypingInputValue({
      nextValue: event.target.value,
      previousValue: typed,
      pendingMark,
      referenceText: session.text,
    })
    setPendingMark(normalized.pendingMark)
    if (normalized.ignored) return

    const nextTyped = normalized.value.slice(0, session.text.length)
    setTyped(nextTyped)

    const elapsed = now - effectiveStart
    setElapsedMs(elapsed)

    const errors = countUncorrectedErrors(nextTyped, session.text)
    if (nextTyped.length >= session.text.length || errors > maxErrors) {
      finishLesson(nextTyped, Math.max(elapsed, 1000))
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    const mark = resolveDeadKeyMarkFromEvent(event)
    if (mark) setPendingMark(mark)
  }

  const charStates = useMemo(() => {
    if (!session) return []
    return [...session.text].map((char, index) => {
      if (index >= typed.length) return { char, state: index === typed.length ? "current" : "pending" }
      return { char, state: areTypingCharactersEquivalent(typed[index], char) ? "correct" : "wrong" }
    })
  }, [session, typed])

  if (!user) return <p className="text-sm text-white/60">Carregando…</p>

  if (view === "ranking") {
    return <TypingRanking onBack={() => setView("menu")} />
  }

  if (view === "lesson" && session) {
    return (
      <div className="flex h-full flex-col gap-3 text-sm">
        <div className="flex items-center justify-between text-xs text-white/60">
          <span className="font-medium text-white/80">{session.lesson.title}</span>
          <div className="flex gap-3">
            <span>{liveWpm} PPM</span>
            <span>{liveAccuracy}%</span>
            <span>
              Erros: {liveErrors}/{maxErrors}
            </span>
          </div>
        </div>

        <div className="rounded-md bg-black/30 p-3 font-mono text-base leading-relaxed">
          {charStates.map((item, index) => (
            <span
              key={index}
              className={
                item.state === "correct"
                  ? "text-green-400"
                  : item.state === "wrong"
                    ? "bg-red-600/40 text-red-300"
                    : item.state === "current"
                      ? "border-b-2 border-accent text-white"
                      : "text-white/50"
              }
            >
              {item.char}
            </span>
          ))}
        </div>

        <input
          ref={inputRef}
          type="text"
          aria-label="Digite o texto da lição"
          autoFocus
          value={typed}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className="rounded-md bg-black/30 px-3 py-2 font-mono text-white outline-none focus:ring-1 focus:ring-accent"
        />

        <button type="button" onClick={() => setView("menu")} className="self-start text-xs text-white/50 hover:text-white">
          ← Voltar ao menu
        </button>
      </div>
    )
  }

  if (view === "result" && result && session) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <p className={`text-lg font-semibold ${result.passed ? "text-green-400" : "text-red-400"}`}>
          {result.passed ? "Lição concluída!" : "Tente novamente"}
        </p>
        <div className="flex gap-6 text-sm">
          <span>
            <strong>{result.wpm}</strong> PPM (mín. {passMinWpm})
          </span>
          <span>
            <strong>{result.accuracy}%</strong> precisão (mín. {passMinAccuracy}%)
          </span>
          <span>
            <strong>{result.errors}</strong> erros (máx. {maxErrors})
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => startLesson(session.lesson)}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Repetir lição
          </button>
          <button
            type="button"
            onClick={() => setView("menu")}
            className="rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20"
          >
            Menu
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/60">
          Meta: {passMinWpm} PPM · {passMinAccuracy}% · máx. {maxErrors} erros
        </span>
        <button
          type="button"
          onClick={() => setView("ranking")}
          className="rounded-md bg-white/10 px-2 py-1 text-xs hover:bg-white/20"
        >
          🏆 Ranking
        </button>
      </div>
      <div className="grid flex-1 grid-cols-2 content-start gap-2 overflow-auto">
        {TYPING_LESSONS.map((lesson) => (
          <button
            key={lesson.id}
            type="button"
            onClick={() => startLesson(lesson)}
            className="rounded-md bg-black/30 px-3 py-2 text-left text-xs hover:bg-white/10"
          >
            <span className="block font-medium text-white/90">
              {lesson.id}. {lesson.title}
            </span>
            <span className="text-white/40">{lesson.variants.length} variações</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function TypingRanking({ onBack }: { onBack: () => void }) {
  const [scope, setScope] = useState<"turma" | "global">("turma")
  const turma = useGetTypingRankingTurmaQuery(undefined, { skip: scope !== "turma" })
  const global = useGetTypingRankingGlobalQuery(undefined, { skip: scope !== "global" })
  const active = scope === "turma" ? turma : global

  return (
    <div className="flex h-full flex-col gap-3 text-sm">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(["turma", "global"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setScope(value)}
              className={`rounded-md px-2 py-1 text-xs ${scope === value ? "bg-accent text-white" : "bg-white/10 hover:bg-white/20"}`}
            >
              {value === "turma" ? "Minha turma" : "Global"}
            </button>
          ))}
        </div>
        <button type="button" onClick={onBack} className="text-xs text-white/50 hover:text-white">
          ← Voltar
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {active.isLoading ? (
          <p className="text-xs text-white/60">Carregando…</p>
        ) : active.isError || !active.data ? (
          <p className="text-xs text-red-400">{getApiErrorMessage(active.error, "Não foi possível carregar o ranking.")}</p>
        ) : active.data.ranking.length === 0 ? (
          <p className="text-xs text-white/40">Nenhuma pontuação registrada ainda.</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="text-white/50">
              <tr>
                <th className="py-1 pr-2 font-medium">#</th>
                <th className="py-1 pr-2 font-medium">Nome</th>
                <th className="py-1 pr-2 font-medium">Pontos</th>
                <th className="py-1 pr-2 font-medium">Lições</th>
                <th className="py-1 pr-2 font-medium">PPM</th>
                <th className="py-1 font-medium">Precisão</th>
              </tr>
            </thead>
            <tbody>
              {active.data.ranking.map((row, index) => (
                <tr key={`${row.name}-${index}`} className="border-t border-white/5">
                  <td className="py-1 pr-2 text-white/50">{index + 1}</td>
                  <td className="py-1 pr-2">{row.name}</td>
                  <td className="py-1 pr-2">{row.points}</td>
                  <td className="py-1 pr-2">{row.lessons_completed}</td>
                  <td className="py-1 pr-2">{row.best_wpm}</td>
                  <td className="py-1">{Math.floor(row.best_accuracy || 0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
