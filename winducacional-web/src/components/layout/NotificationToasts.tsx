import { useAppDispatch, useAppSelector } from "@/app/hooks"
import { dismissNotification, selectNotifications } from "@/features/notifications/notificationsSlice"

export function NotificationToasts() {
  const dispatch = useAppDispatch()
  const notifications = useAppSelector(selectNotifications)

  if (notifications.length === 0) return null

  return (
    <div className="absolute right-3 top-3 z-[60] flex w-72 flex-col gap-2" role="region" aria-label="Notificações">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="rounded-window border border-desktop-border bg-desktop-elevated p-3 shadow-window"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold">{notification.title}</p>
            <button
              type="button"
              aria-label="Dispensar notificação"
              onClick={() => dispatch(dismissNotification(notification.id))}
              className="text-xs text-white/50 hover:text-white"
            >
              ✕
            </button>
          </div>
          <p className="mt-0.5 text-xs text-white/70">{notification.body}</p>
        </div>
      ))}
    </div>
  )
}
