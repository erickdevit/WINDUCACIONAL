import { Taskbar } from "@/components/layout/Taskbar"
import { WindowManager } from "@/components/windows/WindowManager"

export default function DesktopPage() {
  return (
    <main className="relative h-full overflow-hidden bg-desktop">
      <WindowManager />
      <Taskbar />
    </main>
  )
}
