import { useEffect, useState } from "react"
import { useGetMeQuery } from "@/features/auth/authApi"
import {
  useGetExamQuery,
  useGetExamsQuery,
  useGetStudentHistoryQuery,
  useSubmitExamMutation,
  type Exam,
  type ExamSubmission,
} from "@/features/exams/examsApi"
import { ExamsProfessorView } from "@/pages/apps/ExamsProfessorView"
import { getApiErrorMessage } from "@/utils/errors"

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-white/10 text-white/60" },
  in_progress: { label: "Em andamento", className: "bg-yellow-600/30 text-yellow-300" },
  completed: { label: "Concluída", className: "bg-green-600/30 text-green-400" },
}

export default function ExamsApp() {
  const { data: me } = useGetMeQuery()
  const [activeExam, setActiveExam] = useState<Exam | null>(null)
  const [lastResult, setLastResult] = useState<ExamSubmission | null>(null)

  if (!me) return <p className="text-sm text-white/60">Carregando…</p>

  if (me.user.role !== "aluno") {
    return <ExamsProfessorView />
  }

  if (lastResult) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm">
        <p className="text-lg font-semibold text-green-400">Prova enviada!</p>
        <p>
          Pontuação: <strong>{lastResult.totalScore}</strong>
        </p>
        <button
          type="button"
          onClick={() => setLastResult(null)}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Voltar à lista
        </button>
      </div>
    )
  }

  if (activeExam) {
    return (
      <ExamSession
        exam={activeExam}
        onExit={() => setActiveExam(null)}
        onFinished={(submission) => {
          setActiveExam(null)
          setLastResult(submission)
        }}
      />
    )
  }

  return <ExamList onOpen={setActiveExam} />
}

// Lista de provas atribuídas ao aluno (professor/secretaria usam ExamsProfessorView).
function ExamList({ onOpen }: { onOpen: (exam: Exam) => void }) {
  const { data, isLoading, isError, error } = useGetExamsQuery()
  const history = useGetStudentHistoryQuery()

  if (isLoading) return <p className="text-sm text-white/60">Carregando…</p>
  if (isError || !data) {
    return <p className="text-sm text-red-400">{getApiErrorMessage(error, "Não foi possível carregar as provas.")}</p>
  }

  return (
    <div className="flex h-full flex-col gap-3 text-sm">
      <div className="flex-1 overflow-auto">
        {data.exams.length === 0 ? (
          <p className="text-xs text-white/40">Nenhuma prova disponível no momento.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.exams.map((exam) => {
              const status = STATUS_LABELS[exam.submissionStatus ?? "pending"]
              const finished = exam.submissionStatus === "completed"
              return (
                <li key={exam.id} className="rounded-md bg-black/30 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-white/90">{exam.title}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
                      {status.label}
                    </span>
                  </div>
                  {exam.description && <p className="mt-0.5 text-xs text-white/50">{exam.description}</p>}
                  <div className="mt-1 flex items-center justify-between text-xs text-white/40">
                    <span>{exam.timeLimit > 0 ? `${exam.timeLimit} min` : "Sem limite de tempo"}</span>
                    {!finished && (
                      <button
                        type="button"
                        onClick={() => onOpen(exam)}
                        className="rounded-md bg-accent px-2 py-1 font-medium text-white hover:bg-accent-hover"
                      >
                        {exam.submissionStatus === "in_progress" ? "Continuar" : "Iniciar"}
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {history.data && history.data.submissions.length > 0 && (
        <div className="border-t border-desktop-border pt-2">
          <p className="mb-1 text-xs font-medium text-white/60">Histórico</p>
          <ul className="flex max-h-24 flex-col gap-1 overflow-auto text-xs">
            {history.data.submissions.map((submission) => (
              <li key={submission.id} className="flex items-center justify-between text-white/50">
                <span className="truncate">{submission.examTitle}</span>
                <span className="shrink-0">
                  {submission.status === "completed" ? `${submission.totalScore} pts` : "em andamento"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function ExamSession({
  exam,
  onExit,
  onFinished,
}: {
  exam: Exam
  onExit: () => void
  onFinished: (submission: ExamSubmission) => void
}) {
  const { data, isLoading, isError, error } = useGetExamQuery(exam.id)
  const [submitExam, { isLoading: isSubmitting, error: submitError }] = useSubmitExamMutation()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [remainingSec, setRemainingSec] = useState<number | null>(
    exam.timeLimit > 0 ? exam.timeLimit * 60 : null,
  )

  useEffect(() => {
    if (remainingSec === null) return
    if (remainingSec <= 0) return
    const timeout = setTimeout(() => setRemainingSec((value) => (value === null ? null : value - 1)), 1000)
    return () => clearTimeout(timeout)
  }, [remainingSec])

  async function handleSubmit() {
    if (!data) return
    const payload = {
      examId: exam.id,
      status: "completed" as const,
      answers: data.questions.map((question) => ({
        questionId: question.id,
        answerText: answers[question.id] ?? null,
      })),
    }
    const result = await submitExam(payload).unwrap()
    onFinished(result.submission)
  }

  // Envio automático quando o tempo acaba.
  const timedOut = remainingSec !== null && remainingSec <= 0
  useEffect(() => {
    if (timedOut && data && !isSubmitting) void handleSubmit()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dispara apenas na virada do tempo
  }, [timedOut])

  if (isLoading) return <p className="text-sm text-white/60">Carregando…</p>
  if (isError || !data) {
    return <p className="text-sm text-red-400">{getApiErrorMessage(error, "Não foi possível carregar a prova.")}</p>
  }

  const mcqQuestions = data.questions.filter((question) => question.type === "mcq")
  const practicalCount = data.questions.length - mcqQuestions.length
  const answeredCount = mcqQuestions.filter((question) => answers[question.id]).length

  return (
    <div className="flex h-full flex-col gap-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium text-white/90">{exam.title}</span>
        {remainingSec !== null && (
          <span className={`text-xs font-medium ${remainingSec <= 60 ? "text-red-400" : "text-white/60"}`}>
            Tempo {Math.floor(remainingSec / 60)}:{String(remainingSec % 60).padStart(2, "0")}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <ol className="flex flex-col gap-3">
          {mcqQuestions.map((question, index) => (
            <li key={question.id} className="rounded-md bg-black/30 p-2">
              <p className="mb-1.5 text-xs font-medium text-white/80">
                {index + 1}. {question.text}{" "}
                <span className="text-white/40">({question.points} pts)</span>
              </p>
              <div className="flex flex-col gap-1">
                {(question.options ?? []).map((option) => (
                  <label key={option} className="flex cursor-pointer items-center gap-2 text-xs">
                    <input
                      type="radio"
                      name={question.id}
                      value={option}
                      checked={answers[question.id] === option}
                      onChange={() => setAnswers((prev) => ({ ...prev, [question.id]: option }))}
                    />
                    {option}
                  </label>
                ))}
              </div>
            </li>
          ))}
        </ol>
        {practicalCount > 0 && (
          <p className="mt-2 text-xs text-white/40">
            Esta prova tem {practicalCount} questão(ões) prática(s) corrigida(s) pelo estado do ambiente.
          </p>
        )}
      </div>

      {submitError && (
        <p className="text-xs text-red-400">{getApiErrorMessage(submitError, "Não foi possível enviar a prova.")}</p>
      )}

      <div className="flex items-center justify-between">
        <button type="button" onClick={onExit} className="text-xs text-white/50 hover:text-white">
          ← Sair sem enviar
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">
            {answeredCount}/{mcqQuestions.length} respondidas
          </span>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => void handleSubmit()}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Enviando…" : "Finalizar prova"}
          </button>
        </div>
      </div>
    </div>
  )
}
