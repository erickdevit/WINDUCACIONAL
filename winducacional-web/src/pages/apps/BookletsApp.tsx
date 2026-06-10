import { useGetMeQuery } from "@/features/auth/authApi"
import {
  useGetBookletModulesQuery,
  useUpdateBookletAccessMutation,
  type BookletModule,
} from "@/features/booklets/bookletsApi"
import { formatFileSize, getBookletFileUrl } from "@/features/booklets/bookletsFormat"
import { getApiErrorMessage } from "@/utils/errors"

export default function BookletsApp() {
  const { data: me } = useGetMeQuery()
  const { data, isLoading, isError, error } = useGetBookletModulesQuery()
  const [updateAccess, { isLoading: isUpdating }] = useUpdateBookletAccessMutation()
  const role = me?.user.role

  if (isLoading) return <p className="text-sm text-white/60">Carregando…</p>
  if (isError || !data) {
    return <p className="text-sm text-red-400">{getApiErrorMessage(error, "Não foi possível carregar as apostilas.")}</p>
  }

  if (data.modules.length === 0) {
    return <p className="text-xs text-white/40">Nenhuma apostila disponível no momento.</p>
  }

  function handleToggle(module: BookletModule) {
    if (!data) return
    const enabledIds = data.modules.filter((mod) => mod.globalEnabled).map((mod) => mod.id)
    const next = module.globalEnabled
      ? enabledIds.filter((id) => id !== module.id)
      : [...enabledIds, module.id]
    void updateAccess({ enabledModuleIds: next })
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-auto text-sm">
      {data.modules.map((module) => (
        <div key={module.id} className="rounded-md bg-black/30 p-2">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="font-medium text-white/80">{module.title}</span>
            {role === "professor" && (
              <label className="flex shrink-0 items-center gap-1 text-xs text-white/60">
                <input
                  type="checkbox"
                  checked={module.globalEnabled}
                  disabled={isUpdating}
                  onChange={() => handleToggle(module)}
                />
                Liberado para alunos
              </label>
            )}
            {role === "secretaria" && (
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
                  <span className="truncate">📕 {file.title}</span>
                  <span className="shrink-0 text-white/40">{formatFileSize(file.size)}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
