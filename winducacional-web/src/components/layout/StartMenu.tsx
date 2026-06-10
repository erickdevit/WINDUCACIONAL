import { useAppDispatch } from "@/app/hooks"
import { useGetMeQuery, useLogoutMutation } from "@/features/auth/authApi"
import { APPS } from "@/features/apps/registry"
import { openWindow, type WindowSize } from "@/features/windows/windowsSlice"

interface StartMenuProps {
  onClose: () => void
}

export function StartMenu({ onClose }: StartMenuProps) {
  const dispatch = useAppDispatch()
  const { data } = useGetMeQuery()
  const [logout] = useLogoutMutation()
  const user = data?.user
  const visibleApps = APPS.filter((app) => !app.roles || (user && app.roles.includes(user.role)))

  function handleOpen(appId: string, title: string, size: WindowSize) {
    dispatch(openWindow(appId, title, size))
    onClose()
  }

  return (
    <>
      <button
        type="button"
        aria-label="Fechar menu Iniciar"
        className="fixed inset-0 z-40 cursor-default"
        onClick={onClose}
      />
      <div className="absolute bottom-12 left-2 z-50 w-72 rounded-window border border-desktop-border bg-desktop-elevated p-3 shadow-window">
        {user && (
          <div className="mb-2 border-b border-desktop-border pb-2">
            <p className="text-sm font-semibold">{user.displayName}</p>
            <p className="text-xs text-white/60">{user.username}</p>
          </div>
        )}
        <ul className="flex flex-col gap-1">
          {visibleApps.map((app) => (
            <li key={app.id}>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-white/10"
                onClick={() => handleOpen(app.id, app.title, app.defaultSize)}
              >
                <span aria-hidden="true">{app.icon}</span>
                {app.title}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-2 border-t border-desktop-border pt-2">
          <button
            type="button"
            className="w-full rounded-md px-2 py-1.5 text-left text-sm text-red-400 hover:bg-white/10"
            onClick={() => void logout()}
          >
            Sair
          </button>
        </div>
      </div>
    </>
  )
}
