import { useState, type FormEvent } from "react"
import {
  useCreateExamMutation,
  useCreateQuestionMutation,
  useDeleteExamMutation,
  useDeleteQuestionMutation,
  useGetExamQuery,
  useGetExamsQuery,
  useUpdateExamMutation,
  type Exam,
} from "@/features/exams/examsApi"
import { getApiErrorMessage } from "@/utils/errors"

const SMALL_BUTTON = "rounded-md bg-white/10 px-2 py-1 text-xs hover:bg-white/20 disabled:opacity-50"

export function ExamsProfessorView() {
  const [editingExam, setEditingExam] = useState<Exam | null>(null)

  if (editingExam) {
    return <ExamEditor exam={editingExam} onBack={() => setEditingExam(null)} />
  }

  return <ProfessorExamList onEdit={setEditingExam} />
}

function ProfessorExamList({ onEdit }: { onEdit: (exam: Exam) => void }) {
  const { data, isLoading, isError, error } = useGetExamsQuery()
  const [createExam, { isLoading: isCreating, error: createError }] = useCreateExamMutation()
  const [updateExam] = useUpdateExamMutation()
  const [deleteExam] = useDeleteExamMutation()
  const [title, setTitle] = useState("")
  const [timeLimit, setTimeLimit] = useState("")

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) return
    const result = await createExam({ title: title.trim(), timeLimit: Number(timeLimit) || 0 }).unwrap()
    setTitle("")
    setTimeLimit("")
    onEdit(result.exam)
  }

  if (isLoading) return <p className="text-sm text-white/60">Carregando…</p>
  if (isError || !data) {
    return <p className="text-sm text-red-400">{getApiErrorMessage(error, "Não foi possível carregar as provas.")}</p>
  }

  return (
    <div className="flex h-full flex-col gap-3 text-sm">
      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          type="text"
          aria-label="Título da nova prova"
          placeholder="Título da nova prova"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="min-w-0 flex-1 rounded-md bg-black/30 px-2 py-1.5 text-xs text-white outline-none placeholder:text-white/40 focus:ring-1 focus:ring-accent"
        />
        <input
          type="number"
          aria-label="Tempo limite em minutos"
          placeholder="min"
          min={0}
          value={timeLimit}
          onChange={(event) => setTimeLimit(event.target.value)}
          className="w-16 rounded-md bg-black/30 px-2 py-1.5 text-xs text-white outline-none placeholder:text-white/40"
        />
        <button
          type="submit"
          disabled={isCreating || !title.trim()}
          className="shrink-0 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        >
          Criar prova
        </button>
      </form>
      {createError && (
        <p className="text-xs text-red-400">{getApiErrorMessage(createError, "Não foi possível criar a prova.")}</p>
      )}

      <div className="flex-1 overflow-auto">
        {data.exams.length === 0 ? (
          <p className="text-xs text-white/40">Nenhuma prova criada ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.exams.map((exam) => (
              <li key={exam.id} className="rounded-md bg-black/30 p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-white/90">{exam.title}</span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      exam.isPublished ? "bg-green-600/30 text-green-400" : "bg-white/10 text-white/60"
                    }`}
                  >
                    {exam.isPublished ? "Publicada" : "Rascunho"}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <button type="button" className={SMALL_BUTTON} onClick={() => onEdit(exam)}>
                    Editar questões
                  </button>
                  <button
                    type="button"
                    className={SMALL_BUTTON}
                    onClick={() => void updateExam({ examId: exam.id, isPublished: !exam.isPublished })}
                  >
                    {exam.isPublished ? "Despublicar" : "Publicar"}
                  </button>
                  <button
                    type="button"
                    className={`${SMALL_BUTTON} text-red-400`}
                    onClick={() => void deleteExam(exam.id)}
                  >
                    Excluir
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function ExamEditor({ exam, onBack }: { exam: Exam; onBack: () => void }) {
  const { data, isLoading, isError, error } = useGetExamQuery(exam.id)
  const [createQuestion, { isLoading: isAdding, error: addError }] = useCreateQuestionMutation()
  const [deleteQuestion] = useDeleteQuestionMutation()
  const [text, setText] = useState("")
  const [options, setOptions] = useState(["", "", "", ""])
  const [correctIndex, setCorrectIndex] = useState(0)
  const [points, setPoints] = useState("10")

  async function handleAdd(event: FormEvent) {
    event.preventDefault()
    const filledOptions = options.map((option) => option.trim()).filter(Boolean)
    if (!text.trim() || filledOptions.length < 2) return

    await createQuestion({
      examId: exam.id,
      type: "mcq",
      text: text.trim(),
      options: filledOptions,
      correctAnswer: filledOptions[Math.min(correctIndex, filledOptions.length - 1)],
      points: Number(points) || 10,
      orderIndex: data?.questions.length ?? 0,
    }).unwrap()

    setText("")
    setOptions(["", "", "", ""])
    setCorrectIndex(0)
  }

  if (isLoading) return <p className="text-sm text-white/60">Carregando…</p>
  if (isError || !data) {
    return <p className="text-sm text-red-400">{getApiErrorMessage(error, "Não foi possível carregar a prova.")}</p>
  }

  return (
    <div className="flex h-full flex-col gap-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="truncate font-medium text-white/90">{exam.title}</span>
        <button type="button" onClick={onBack} className="text-xs text-white/50 hover:text-white">
          ← Voltar
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {data.questions.length === 0 ? (
          <p className="text-xs text-white/40">Nenhuma questão ainda — adicione abaixo.</p>
        ) : (
          <ol className="flex flex-col gap-1.5">
            {data.questions.map((question, index) => (
              <li key={question.id} className="flex items-start justify-between gap-2 rounded-md bg-black/30 p-2 text-xs">
                <div className="min-w-0">
                  <p className="font-medium text-white/80">
                    {index + 1}. {question.text}
                  </p>
                  <p className="text-white/40">
                    {question.type === "mcq" ? `${(question.options ?? []).length} alternativas` : "prática"} ·{" "}
                    {question.points} pts
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Excluir questão ${index + 1}`}
                  className="shrink-0 text-red-400 hover:text-red-300"
                  onClick={() => void deleteQuestion({ examId: exam.id, questionId: question.id })}
                >
                  ✕
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>

      <form onSubmit={handleAdd} className="flex flex-col gap-1.5 border-t border-desktop-border pt-2">
        <input
          type="text"
          aria-label="Enunciado da questão"
          placeholder="Enunciado da questão"
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="rounded-md bg-black/30 px-2 py-1.5 text-xs text-white outline-none placeholder:text-white/40 focus:ring-1 focus:ring-accent"
        />
        <div className="grid grid-cols-2 gap-1.5">
          {options.map((option, index) => (
            <label key={index} className="flex items-center gap-1.5 text-xs">
              <input
                type="radio"
                name="correct-option"
                aria-label={`Alternativa ${index + 1} é a correta`}
                checked={correctIndex === index}
                onChange={() => setCorrectIndex(index)}
              />
              <input
                type="text"
                aria-label={`Alternativa ${index + 1}`}
                placeholder={`Alternativa ${index + 1}`}
                value={option}
                onChange={(event) =>
                  setOptions((prev) => prev.map((value, i) => (i === index ? event.target.value : value)))
                }
                className="min-w-0 flex-1 rounded-md bg-black/30 px-2 py-1 text-xs text-white outline-none placeholder:text-white/40"
              />
            </label>
          ))}
        </div>
        {addError && (
          <p className="text-xs text-red-400">{getApiErrorMessage(addError, "Não foi possível adicionar a questão.")}</p>
        )}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1 text-xs text-white/60">
            Pontos
            <input
              type="number"
              aria-label="Pontos da questão"
              min={1}
              value={points}
              onChange={(event) => setPoints(event.target.value)}
              className="w-14 rounded-md bg-black/30 px-2 py-1 text-xs text-white outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={isAdding}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            Adicionar questão
          </button>
        </div>
      </form>
    </div>
  )
}
