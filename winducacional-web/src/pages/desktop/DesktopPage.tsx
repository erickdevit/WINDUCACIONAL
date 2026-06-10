import { NotificationToasts } from "@/components/layout/NotificationToasts"
import { Taskbar } from "@/components/layout/Taskbar"
import { WindowManager } from "@/components/windows/WindowManager"
import { useNotificationsChannel } from "@/features/notifications/useNotificationsChannel"

export default function DesktopPage() {
  useNotificationsChannel(true)

  return (
    <main className="relative h-full overflow-hidden bg-desktop">
      <NotificationToasts />
      <WindowManager />
      <Taskbar />
    </main>
  )
}
