import { useGetGestorSessionsQuery, useLogoutGestorSessionsMutation } from "@/features/gestor/gestorApi"
import { formatDateTimeBR, groupSessionsByTurma } from "@/features/gestor/gestorFormat"
import { getApiErrorMessage } from "@/utils/errors"

const ACTION_BUTTON_CLASS =
  "shrink-0 rounded-md bg-white/10 px-2 py-0.5 text-xs hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"

export default function GestorApp() {
  const { data, isLoading, isError, error } = useGetGestorSessionsQuery()
  const [logoutSessions, { isLoading: isLoggingOut }] = useLogoutGestorSessionsMutation()

  if (isLoading) return <p className="text-sm text-white/60">Carregando…</p>
  if (isError || !data) {
    return <p className="text-sm text-red-400">{getApiErrorMessage(error, "Não foi possível carregar as sessões.")}</p>
  }

  const groups = groupSessionsByTurma(data.sessions)

  return (
    <div className="flex h-full flex-col gap-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-white/70">
          {data.sessions.length} {data.sessions.length === 1 ? "aluno conectado" : "alunos conectados"}
        </span>
        <button
          type="button"
          disabled={isLoggingOut || data.sessions.length === 0}
          onClick={() => void logoutSessions({ target: "all" })}
          className="rounded-md bg-red-600/80 px-2 py-1 text-xs font-medium text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Encerrar todas
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {groups.length === 0 ? (
          <p className="text-xs text-white/40">Nenhum aluno conectado no momento.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {groups.map((group) => (
              <div key={group.turmaId ?? "sem-turma"} className="rounded-md bg-black/30 p-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-medium text-white/80">{group.turmaNome}</span>
                  {group.turmaId && (
                    <button
                      type="button"
                      disabled={isLoggingOut}
                      onClick={() => void logoutSessions({ target: "turma", turmaId: group.turmaId as string })}
                      className={ACTION_BUTTON_CLASS}
                    >
                      Encerrar turma
                    </button>
                  )}
                </div>
                <ul className="flex flex-col gap-1">
                  {group.sessions.map((session) => (
                    <li key={session.sessionId} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate">
                        {session.displayName} <span className="text-white/40">({session.username})</span>
                      </span>
                      <span className="shrink-0 text-white/50">{formatDateTimeBR(session.loginAt)}</span>
                      <button
                        type="button"
                        disabled={isLoggingOut}
                        onClick={() => void logoutSessions({ target: "user", userId: session.userId })}
                        className={ACTION_BUTTON_CLASS}
                      >
                        Encerrar
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
