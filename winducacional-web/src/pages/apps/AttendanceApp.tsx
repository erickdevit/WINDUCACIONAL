import { useMemo, useState } from "react"
import { useGetMeQuery } from "@/features/auth/authApi"
import {
  useGetAttendanceSummaryQuery,
  useGetMyAttendanceQuery,
  useRegisterAttendanceMutation,
  type AttendanceSummaryStudent,
} from "@/features/attendance/attendanceApi"
import { formatDateBR, formatTimeBR } from "@/features/attendance/attendanceFormat"
import { useGetTurmasQuery } from "@/features/users/usersApi"
import { getApiErrorMessage } from "@/utils/errors"

const FIELD_CLASS =
  "rounded-md bg-black/30 px-2 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-accent"
const SMALL_BUTTON =
  "rounded-md bg-white/10 px-2 py-1 text-xs font-medium text-white/80 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
const EMPTY_STUDENTS: AttendanceSummaryStudent[] = []
const EMPTY_DAILY: { date: string; expected: number; present: number; absent: number; attendanceRate: number }[] = []

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10)
}

function defaultStartDate() {
  const date = new Date()
  date.setDate(date.getDate() - 30)
  return toDateInput(date)
}

export default function AttendanceApp() {
  const { data: me } = useGetMeQuery()

  if (me?.user.role === "aluno") return <StudentAttendance />
  return <AdministrativeAttendance canRegister={me?.user.role === "professor"} />
}

function StudentAttendance() {
  const { data, isLoading, isError, error } = useGetMyAttendanceQuery()

  if (isLoading) return <p className="text-sm text-white/60">Carregando…</p>
  if (isError || !data) {
    return <p className="text-sm text-red-400">{getApiErrorMessage(error, "Não foi possível carregar a frequência.")}</p>
  }

  return (
    <div className="flex h-full flex-col gap-3 text-sm">
      <div className="flex items-center justify-between rounded-md bg-black/30 px-3 py-2">
        <span className="text-white/70">Hoje, {formatDateBR(data.today)}</span>
        {data.todayRecord ? (
          <span className="rounded-full bg-green-600/30 px-2 py-0.5 text-xs font-medium text-green-400">
            Presença registrada
          </span>
        ) : (
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white/60">Sem registro hoje</span>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {data.records.length === 0 ? (
          <p className="text-xs text-white/40">Nenhum registro de frequência ainda.</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="text-white/50">
              <tr>
                <th className="py-1 pr-2 font-medium">Data</th>
                <th className="py-1 pr-2 font-medium">1º acesso</th>
                <th className="py-1 pr-2 font-medium">Último acesso</th>
                <th className="py-1 font-medium">Acessos</th>
              </tr>
            </thead>
            <tbody>
              {data.records.map((record) => (
                <tr key={record.id} className="border-t border-white/5">
                  <td className="py-1 pr-2">{formatDateBR(record.attendanceDate)}</td>
                  <td className="py-1 pr-2">{formatTimeBR(record.firstLoginAt)}</td>
                  <td className="py-1 pr-2">{formatTimeBR(record.lastLoginAt)}</td>
                  <td className="py-1">{record.loginCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function AdministrativeAttendance({ canRegister }: { canRegister: boolean }) {
  const [startDate, setStartDate] = useState(defaultStartDate)
  const [endDate, setEndDate] = useState(() => toDateInput(new Date()))
  const [turmaId, setTurmaId] = useState("")
  const [registerDate, setRegisterDate] = useState(() => toDateInput(new Date()))
  const [manualPresence, setManualPresence] = useState<{ key: string; presentIds: Set<string> }>({
    key: "",
    presentIds: new Set(),
  })
  const [registerMessage, setRegisterMessage] = useState<string | null>(null)
  const { data: turmasData } = useGetTurmasQuery()
  const { data, isLoading, isError, error } = useGetAttendanceSummaryQuery({ startDate, endDate, turmaId })
  const [registerAttendance, { isLoading: isRegistering, error: registerError }] = useRegisterAttendanceMutation()

  const students = data?.students ?? EMPTY_STUDENTS
  const daily = data?.daily ?? EMPTY_DAILY
  const selectedTurmaName = turmasData?.turmas.find((turma) => turma.id === turmaId)?.nome ?? ""
  const registerKey = `${turmaId}:${registerDate}`
  const defaultPresentIds = useMemo(
    () =>
      new Set(
        students
          .filter((student) => student.records.some((record) => record.attendanceDate === registerDate))
          .map((student) => student.id),
      ),
    [registerDate, students],
  )
  const presentIds = manualPresence.key === registerKey ? manualPresence.presentIds : defaultPresentIds

  function setCurrentPresentIds(next: Set<string>) {
    setManualPresence({ key: registerKey, presentIds: next })
  }

  const totalLabel = useMemo(() => {
    if (!data) return "Sem dados"
    return `${data.totals.presences} presença(s), ${data.totals.absences} ausência(s), ${data.totals.attendanceRate}%`
  }, [data])

  function toggleStudent(studentId: string) {
    const next = new Set(presentIds)
    if (next.has(studentId)) next.delete(studentId)
    else next.add(studentId)
    setCurrentPresentIds(next)
  }

  async function handleRegister() {
    if (!turmaId || students.length === 0) return
    await registerAttendance({
      date: registerDate,
      turmaId,
      students: students.map((student) => ({ id: student.id, isPresent: presentIds.has(student.id) })),
    }).unwrap()
    setRegisterMessage(`Frequência de ${formatDateBR(registerDate)} salva para ${selectedTurmaName}.`)
  }

  if (isLoading) return <p className="text-sm text-white/60">Carregando…</p>
  if (isError || !data) {
    return <p className="text-sm text-red-400">{getApiErrorMessage(error, "Não foi possível carregar a frequência.")}</p>
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 text-sm">
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1.4fr]">
        <label className="flex flex-col gap-1 text-xs text-white/60">
          Início
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className={FIELD_CLASS} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/60">
          Fim
          <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className={FIELD_CLASS} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/60">
          Turma
          <select value={turmaId} onChange={(event) => setTurmaId(event.target.value)} className={FIELD_CLASS}>
            <option value="">Todas as turmas</option>
            {(turmasData?.turmas ?? []).map((turma) => (
              <option key={turma.id} value={turma.id}>
                {turma.nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Metric label="Alunos" value={data.totals.students.toString()} />
        <Metric label="Resumo" value={totalLabel} />
        <Metric label="Dias letivos" value={data.range.totalDays.toString()} />
      </div>

      {canRegister && (
        <section className="rounded-md bg-black/25 p-3">
          <div className="mb-2 flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-xs text-white/60">
              Registro manual
              <input
                type="date"
                value={registerDate}
                onChange={(event) => setRegisterDate(event.target.value)}
                className={FIELD_CLASS}
              />
            </label>
            <button
              type="button"
              className={SMALL_BUTTON}
              disabled={!turmaId || students.length === 0}
              onClick={() => setCurrentPresentIds(new Set(students.map((student) => student.id)))}
            >
              Marcar todos
            </button>
            <button
              type="button"
              className={SMALL_BUTTON}
              disabled={!turmaId || students.length === 0}
              onClick={() => setCurrentPresentIds(new Set())}
            >
              Limpar
            </button>
            <button
              type="button"
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isRegistering || !turmaId || students.length === 0}
              onClick={() => void handleRegister()}
            >
              {isRegistering ? "Salvando…" : "Salvar frequência"}
            </button>
            {!turmaId && <span className="text-xs text-white/40">Selecione uma turma para registrar presença.</span>}
          </div>
          <div className="max-h-32 overflow-auto rounded-md border border-white/10">
            {students.length === 0 ? (
              <p className="p-2 text-xs text-white/40">Nenhum aluno encontrado no filtro atual.</p>
            ) : (
              students.map((student) => (
                <label key={student.id} className="flex cursor-pointer items-center gap-2 px-2 py-1 text-xs hover:bg-white/10">
                  <input
                    type="checkbox"
                    checked={presentIds.has(student.id)}
                    disabled={!turmaId}
                    onChange={() => toggleStudent(student.id)}
                  />
                  <span className="truncate">
                    {student.displayName} <span className="text-white/40">({student.username})</span>
                  </span>
                </label>
              ))
            )}
          </div>
          {registerError && (
            <p className="mt-2 text-xs text-red-400">
              {getApiErrorMessage(registerError, "Não foi possível salvar a frequência.")}
            </p>
          )}
          {registerMessage && <p className="mt-2 text-xs text-green-400">{registerMessage}</p>}
        </section>
      )}

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[1.5fr_1fr]">
        <StudentSummary students={students} />
        <DailySummary daily={daily} />
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-black/30 px-3 py-2">
      <p className="text-xs text-white/45">{label}</p>
      <p className="truncate text-sm font-medium text-white/85">{value}</p>
    </div>
  )
}

function StudentSummary({ students }: { students: AttendanceSummaryStudent[] }) {
  return (
    <section className="min-h-0 overflow-auto rounded-md bg-black/20">
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 bg-desktop-surface text-white/50">
          <tr>
            <th className="px-2 py-1.5 font-medium">Aluno</th>
            <th className="px-2 py-1.5 font-medium">Turma</th>
            <th className="px-2 py-1.5 font-medium">Presenças</th>
            <th className="px-2 py-1.5 font-medium">Faltas</th>
            <th className="px-2 py-1.5 font-medium">Taxa</th>
          </tr>
        </thead>
        <tbody>
          {students.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-2 py-3 text-white/40">
                Nenhum aluno encontrado.
              </td>
            </tr>
          ) : (
            students.map((student) => (
              <tr key={student.id} className="border-t border-white/5">
                <td className="px-2 py-1.5">
                  <span className="block truncate text-white/85">{student.displayName}</span>
                  <span className="text-white/40">{student.username}</span>
                </td>
                <td className="px-2 py-1.5 text-white/60">{student.turmaNome || "Sem turma"}</td>
                <td className="px-2 py-1.5">{student.presentDays}</td>
                <td className="px-2 py-1.5">{student.absentDays}</td>
                <td className="px-2 py-1.5">{student.attendanceRate}%</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  )
}

function DailySummary({ daily }: { daily: { date: string; expected: number; present: number; absent: number; attendanceRate: number }[] }) {
  return (
    <section className="min-h-0 overflow-auto rounded-md bg-black/20 p-2">
      <h2 className="mb-2 text-xs font-medium text-white/60">Resumo por dia</h2>
      {daily.length === 0 ? (
        <p className="text-xs text-white/40">Nenhum dia letivo no período.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {daily.map((day) => (
            <li key={day.date} className="rounded-md bg-black/25 px-2 py-1.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-white/80">{formatDateBR(day.date)}</span>
                <span className="text-white/50">{day.attendanceRate}%</span>
              </div>
              <p className="text-white/45">
                {day.present} presente(s), {day.absent} ausente(s), {day.expected} esperado(s)
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
