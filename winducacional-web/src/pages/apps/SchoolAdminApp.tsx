import { useState, type FormEvent } from "react"
import {
  useCreateTurmaMutation,
  useCreateUserMutation,
  useDeleteTurmaMutation,
  useGetTurmasQuery,
  useGetUsersQuery,
  useUpdateTurmaMutation,
  useUpdateUserMutation,
} from "@/features/users/usersApi"
import type { UserRole } from "@/types/user"
import { getApiErrorMessage } from "@/utils/errors"

const SMALL_BUTTON = "rounded-md bg-white/10 px-2 py-1 text-xs hover:bg-white/20 disabled:opacity-50"
const INPUT_CLASS =
  "rounded-md bg-black/30 px-2 py-1.5 text-xs text-white outline-none placeholder:text-white/40 focus:ring-1 focus:ring-accent"

const ROLE_LABELS: Record<UserRole, string> = {
  professor: "Professor",
  secretaria: "Secretaria",
  aluno: "Aluno",
}

export default function SchoolAdminApp() {
  const [tab, setTab] = useState<"users" | "turmas">("users")

  return (
    <div className="flex h-full flex-col gap-3 text-sm">
      <div className="flex gap-1">
        {(["users", "turmas"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`rounded-md px-2 py-1 text-xs ${tab === value ? "bg-accent text-white" : "bg-white/10 hover:bg-white/20"}`}
          >
            {value === "users" ? "Usuários" : "Turmas"}
          </button>
        ))}
      </div>
      {tab === "users" ? <UsersTab /> : <TurmasTab />}
    </div>
  )
}

function UsersTab() {
  const { data, isLoading, isError, error } = useGetUsersQuery()
  const { data: turmasData } = useGetTurmasQuery()
  const [createUser, { isLoading: isCreating, error: createError }] = useCreateUserMutation()
  const [updateUser] = useUpdateUserMutation()
  const [username, setUsername] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<UserRole>("aluno")
  const [turmaId, setTurmaId] = useState("")

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    if (!username.trim() || !displayName.trim() || password.length < 8) return
    await createUser({
      username: username.trim(),
      displayName: displayName.trim(),
      password,
      role,
      turmaId: role === "aluno" ? turmaId || null : null,
    }).unwrap()
    setUsername("")
    setDisplayName("")
    setPassword("")
  }

  if (isLoading) return <p className="text-sm text-white/60">Carregando…</p>
  if (isError || !data) {
    return <p className="text-sm text-red-400">{getApiErrorMessage(error, "Não foi possível carregar os usuários.")}</p>
  }

  const turmaName = (id: string | null) =>
    (turmasData?.turmas ?? []).find((turma) => turma.id === id)?.nome ?? "—"

  return (
    <>
      <form onSubmit={handleCreate} className="grid grid-cols-2 gap-1.5">
        <input
          type="text"
          aria-label="Usuário"
          placeholder="Usuário"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className={INPUT_CLASS}
        />
        <input
          type="text"
          aria-label="Nome de exibição do novo usuário"
          placeholder="Nome de exibição"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          className={INPUT_CLASS}
        />
        <input
          type="password"
          aria-label="Senha"
          placeholder="Senha (mín. 8)"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={INPUT_CLASS}
        />
        <div className="flex gap-1.5">
          <select
            aria-label="Grupo"
            value={role}
            onChange={(event) => setRole(event.target.value as UserRole)}
            className={`${INPUT_CLASS} flex-1`}
          >
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {role === "aluno" && (
            <select
              aria-label="Turma do novo aluno"
              value={turmaId}
              onChange={(event) => setTurmaId(event.target.value)}
              className={`${INPUT_CLASS} flex-1`}
            >
              <option value="">Sem turma</option>
              {(turmasData?.turmas ?? []).map((turma) => (
                <option key={turma.id} value={turma.id}>
                  {turma.nome}
                </option>
              ))}
            </select>
          )}
        </div>
        {createError && (
          <p className="col-span-2 text-xs text-red-400">
            {getApiErrorMessage(createError, "Não foi possível criar o usuário.")}
          </p>
        )}
        <button
          type="submit"
          disabled={isCreating || !username.trim() || !displayName.trim() || password.length < 8}
          className="col-span-2 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        >
          Criar usuário
        </button>
      </form>

      <div className="flex-1 overflow-auto">
        <ul className="flex flex-col gap-1">
          {data.users.map((user) => (
            <li
              key={user.id}
              className={`flex items-center justify-between gap-2 rounded-md bg-black/30 px-2 py-1.5 text-xs ${user.active ? "" : "opacity-50"}`}
            >
              <span className="min-w-0 truncate">
                <span className="font-medium text-white/90">{user.displayName}</span>{" "}
                <span className="text-white/40">
                  ({user.username}) · {ROLE_LABELS[user.role]}
                  {user.role === "aluno" && ` · ${turmaName(user.turmaId)}`}
                </span>
              </span>
              <button
                type="button"
                className={`${SMALL_BUTTON} shrink-0 ${user.active ? "text-red-400" : "text-green-400"}`}
                onClick={() => void updateUser({ id: user.id, active: !user.active })}
              >
                {user.active ? "Desativar" : "Ativar"}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

function TurmasTab() {
  const { data, isLoading, isError, error } = useGetTurmasQuery()
  const [createTurma, { isLoading: isCreating, error: createError }] = useCreateTurmaMutation()
  const [updateTurma] = useUpdateTurmaMutation()
  const [deleteTurma] = useDeleteTurmaMutation()
  const [nome, setNome] = useState("")
  const [studentType, setStudentType] = useState<"normal" | "kids">("normal")

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    if (nome.trim().length < 2) return
    await createTurma({ nome: nome.trim(), studentType }).unwrap()
    setNome("")
  }

  if (isLoading) return <p className="text-sm text-white/60">Carregando…</p>
  if (isError || !data) {
    return <p className="text-sm text-red-400">{getApiErrorMessage(error, "Não foi possível carregar as turmas.")}</p>
  }

  return (
    <>
      <form onSubmit={handleCreate} className="flex gap-1.5">
        <input
          type="text"
          aria-label="Nome da nova turma"
          placeholder="Nome da nova turma"
          value={nome}
          onChange={(event) => setNome(event.target.value)}
          className={`${INPUT_CLASS} min-w-0 flex-1`}
        />
        <select
          aria-label="Tipo da turma"
          value={studentType}
          onChange={(event) => setStudentType(event.target.value as "normal" | "kids")}
          className={INPUT_CLASS}
        >
          <option value="normal">Normal</option>
          <option value="kids">Kids</option>
        </select>
        <button
          type="submit"
          disabled={isCreating || nome.trim().length < 2}
          className="shrink-0 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        >
          Criar turma
        </button>
      </form>
      {createError && (
        <p className="text-xs text-red-400">{getApiErrorMessage(createError, "Não foi possível criar a turma.")}</p>
      )}

      <div className="flex-1 overflow-auto">
        {data.turmas.length === 0 ? (
          <p className="text-xs text-white/40">Nenhuma turma cadastrada.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {data.turmas.map((turma) => (
              <li
                key={turma.id}
                className={`flex items-center justify-between gap-2 rounded-md bg-black/30 px-2 py-1.5 text-xs ${turma.active ? "" : "opacity-50"}`}
              >
                <span className="min-w-0 truncate">
                  <span className="font-medium text-white/90">{turma.nome}</span>{" "}
                  <span className="text-white/40">
                    · código {turma.code} · {turma.studentType === "kids" ? "Kids" : "Normal"}
                  </span>
                </span>
                <span className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    className={SMALL_BUTTON}
                    onClick={() => void updateTurma({ id: turma.id, active: !turma.active })}
                  >
                    {turma.active ? "Desativar" : "Ativar"}
                  </button>
                  <button
                    type="button"
                    className={`${SMALL_BUTTON} text-red-400`}
                    onClick={() => void deleteTurma(turma.id)}
                  >
                    Excluir
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
