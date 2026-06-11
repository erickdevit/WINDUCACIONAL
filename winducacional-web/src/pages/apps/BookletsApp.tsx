import { useState } from "react"
import { useGetMeQuery } from "@/features/auth/authApi"
import {
  useGetBookletModulesQuery,
  useGetBookletStudentAccessQuery,
  useUpdateBookletAccessMutation,
  useUpdateBookletStudentAccessMutation,
  type BookletModule,
  type BookletStudentAccess,
} from "@/features/booklets/bookletsApi"
import { formatFileSize, getBookletFileUrl } from "@/features/booklets/bookletsFormat"
import { useGetTurmasQuery } from "@/features/users/usersApi"
import { getApiErrorMessage } from "@/utils/errors"

const SMALL_BUTTON =
  "rounded-md bg-white/10 px-2 py-1 text-xs font-medium text-white/80 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
const EMPTY_STUDENT_ACCESS: BookletStudentAccess[] = []

export default function BookletsApp() {
  const { data: me } = useGetMeQuery()
  const { data, isLoading, isError, error } = useGetBookletModulesQuery()
  const [updateAccess, { isLoading: isUpdating, error: updateError }] = useUpdateBookletAccessMutation()
  const role = me?.user.role
  const canManage = role === "professor"
  const canReadStudentAccess = role === "professor" || role === "secretaria"

  if (isLoading) return <p className="text-sm text-white/60">Carregando…</p>
  if (isError || !data) {
    return <p className="text-sm text-red-400">{getApiErrorMessage(error, "Não foi possível carregar as apostilas.")}</p>
  }

  if (data.modules.length === 0) {
    return <p className="text-xs text-white/40">Nenhuma apostila disponível no momento.</p>
  }

  function handleToggle(module: BookletModule) {
    if (!data || !canManage) return
    const enabledIds = data.modules.filter((mod) => mod.globalEnabled).map((mod) => mod.id)
    const next = module.globalEnabled ? enabledIds.filter((id) => id !== module.id) : [...enabledIds, module.id]
    void updateAccess({ enabledModuleIds: next })
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 text-sm">
      <section className="min-h-0 flex-1 overflow-auto">
        <div className="grid gap-2 lg:grid-cols-2">
          {data.modules.map((module) => (
            <BookletModuleCard
              key={module.id}
              module={module}
              canManage={canManage}
              isUpdating={isUpdating}
              onToggle={handleToggle}
            />
          ))}
        </div>
      </section>

      {updateError && (
        <p className="text-xs text-red-400">{getApiErrorMessage(updateError, "Não foi possível atualizar as apostilas.")}</p>
      )}

      {canReadStudentAccess && <StudentAccessPanel modules={data.modules} canManage={canManage} />}
    </div>
  )
}

function BookletModuleCard({
  module,
  canManage,
  isUpdating,
  onToggle,
}: {
  module: BookletModule
  canManage: boolean
  isUpdating: boolean
  onToggle: (module: BookletModule) => void
}) {
  return (
    <div className="rounded-md bg-black/30 p-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="min-w-0 truncate font-medium text-white/80">{module.title}</span>
        {canManage ? (
          <label className="flex shrink-0 items-center gap-1 text-xs text-white/60">
            <input type="checkbox" checked={module.globalEnabled} disabled={isUpdating} onChange={() => onToggle(module)} />
            Liberado para alunos
          </label>
        ) : (
          <span className={`shrink-0 text-xs ${module.enabled ? "text-green-400" : "text-white/40"}`}>
            {module.enabled ? "Liberado" : "Bloqueado"}
          </span>
        )}
      </div>
      <ul className="flex flex-col gap-1">
        {module.files.map((file) => (
          <li key={file.id}>
            <a
              href={getBookletFileUrl(file.url)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-xs hover:bg-white/10"
            >
              <span className="truncate">
                <span className="mr-1 rounded bg-white/10 px-1 text-[10px] font-medium text-white/60">PDF</span>
                {file.title}
              </span>
              <span className="shrink-0 text-white/40">{formatFileSize(file.size)}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function StudentAccessPanel({ modules, canManage }: { modules: BookletModule[]; canManage: boolean }) {
  const { data: turmasData } = useGetTurmasQuery()
  const [turmaId, setTurmaId] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedModuleIds, setSelectedModuleIds] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState<string | null>(null)
  const { data, isLoading, isError, error } = useGetBookletStudentAccessQuery({ turmaId })
  const [updateStudentAccess, { isLoading: isSaving, error: saveError }] = useUpdateBookletStudentAccessMutation()
  const students = data?.students ?? EMPTY_STUDENT_ACCESS

  function toggleStudent(student: BookletStudentAccess) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(student.id)) next.delete(student.id)
      else next.add(student.id)
      if (next.size === 0) {
        setSelectedModuleIds(new Set())
      } else if (next.size === 1 && next.has(student.id)) {
        setSelectedModuleIds(new Set(student.moduleIds))
      }
      return next
    })
  }

  function toggleModule(moduleId: string) {
    setSelectedModuleIds((prev) => {
      const next = new Set(prev)
      if (next.has(moduleId)) next.delete(moduleId)
      else next.add(moduleId)
      return next
    })
  }

  async function handleSave() {
    if (!canManage || selectedIds.size === 0) return
    await updateStudentAccess({
      turmaId,
      userIds: [...selectedIds],
      moduleIds: [...selectedModuleIds],
    }).unwrap()
    setMessage(`${selectedIds.size} aluno(s) atualizado(s).`)
  }

  return (
    <section className="min-h-[14rem] rounded-md bg-black/25 p-3">
      <div className="mb-2 flex flex-wrap items-end gap-2">
        <label className="flex min-w-44 flex-col gap-1 text-xs text-white/60">
          Liberação por turma
          <select
            value={turmaId}
            onChange={(event) => {
              setTurmaId(event.target.value)
              setSelectedIds(new Set())
              setSelectedModuleIds(new Set())
              setMessage(null)
            }}
            className="rounded-md bg-black/30 px-2 py-1.5 text-xs text-white outline-none"
          >
            <option value="">Todas as turmas</option>
            {(turmasData?.turmas ?? []).map((turma) => (
              <option key={turma.id} value={turma.id}>
                {turma.nome}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={SMALL_BUTTON}
          disabled={students.length === 0}
          onClick={() =>
            setSelectedIds((prev) =>
              prev.size === students.length ? new Set() : new Set(students.map((student) => student.id)),
            )
          }
        >
          {selectedIds.size === students.length && students.length > 0 ? "Desmarcar todos" : "Selecionar todos"}
        </button>
        <button
          type="button"
          className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canManage || isSaving || selectedIds.size === 0}
          onClick={() => void handleSave()}
        >
          {isSaving ? "Salvando…" : "Salvar liberação"}
        </button>
        {!canManage && <span className="text-xs text-white/40">A secretaria possui acesso somente leitura.</span>}
      </div>

      {isLoading && <p className="text-xs text-white/60">Carregando alunos…</p>}
      {isError && (
        <p className="text-xs text-red-400">
          {getApiErrorMessage(error, "Não foi possível carregar as liberações por aluno.")}
        </p>
      )}

      {!isLoading && !isError && (
        <div className="grid min-h-0 gap-3 lg:grid-cols-[1.2fr_1fr]">
          <div className="max-h-44 overflow-auto rounded-md border border-white/10">
            {students.length === 0 ? (
              <p className="p-2 text-xs text-white/40">Nenhum aluno encontrado.</p>
            ) : (
              students.map((student) => (
                <label key={student.id} className="flex cursor-pointer items-start gap-2 px-2 py-1.5 text-xs hover:bg-white/10">
                  <input type="checkbox" checked={selectedIds.has(student.id)} onChange={() => toggleStudent(student)} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-white/80">{student.displayName}</span>
                    <span className="block truncate text-white/40">
                      {student.turmaNome} · {student.moduleIds.length} módulo(s)
                    </span>
                  </span>
                </label>
              ))
            )}
          </div>

          <div className="max-h-44 overflow-auto rounded-md border border-white/10 p-2">
            <p className="mb-1 text-xs text-white/50">
              {selectedIds.size === 0
                ? "Selecione aluno(s) para definir módulos específicos."
                : `${selectedIds.size} aluno(s) selecionado(s).`}
            </p>
            {modules.map((module) => (
              <label key={module.id} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-xs hover:bg-white/10">
                <input
                  type="checkbox"
                  checked={selectedModuleIds.has(module.id)}
                  disabled={selectedIds.size === 0}
                  onChange={() => toggleModule(module.id)}
                />
                <span className="truncate">{module.title}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {saveError && (
        <p className="mt-2 text-xs text-red-400">
          {getApiErrorMessage(saveError, "Não foi possível salvar a liberação por aluno.")}
        </p>
      )}
      {message && <p className="mt-2 text-xs text-green-400">{message}</p>}
    </section>
  )
}
