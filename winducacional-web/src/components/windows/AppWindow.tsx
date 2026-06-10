import { useRef, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react"
import { useAppDispatch } from "@/app/hooks"
import {
  closeWindow,
  focusWindow,
  moveWindow,
  toggleMaximize,
  toggleMinimize,
  type AppWindowState,
} from "@/features/windows/windowsSlice"

interface AppWindowProps {
  window: AppWindowState
  children: ReactNode
}

const TITLEBAR_BUTTON_CLASS =
  "flex h-6 w-6 items-center justify-center rounded text-xs text-white/80 hover:bg-white/15"

export function AppWindow({ window: win, children }: AppWindowProps) {
  const dispatch = useAppDispatch()
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null)

  function handleTitleBarPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (win.maximized) return
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: win.position.x,
      originY: win.position.y,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handleTitleBarPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag) return
    dispatch(
      moveWindow({
        id: win.id,
        position: {
          x: drag.originX + (event.clientX - drag.startX),
          y: Math.max(0, drag.originY + (event.clientY - drag.startY)),
        },
      }),
    )
  }

  function handleTitleBarPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    dragRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const style: CSSProperties = win.maximized
    ? { top: 0, left: 0, width: "100%", height: "calc(100% - 3rem)" }
    : {
        top: win.position.y,
        left: win.position.x,
        width: win.size.width,
        height: win.size.height,
      }

  return (
    <section
      className="absolute flex flex-col overflow-hidden rounded-window border border-desktop-border bg-desktop-surface shadow-window"
      style={{ ...style, zIndex: win.zIndex }}
      onPointerDownCapture={() => dispatch(focusWindow(win.id))}
    >
      <header
        className="flex h-9 shrink-0 cursor-move items-center justify-between bg-desktop-elevated px-3 select-none"
        onPointerDown={handleTitleBarPointerDown}
        onPointerMove={handleTitleBarPointerMove}
        onPointerUp={handleTitleBarPointerUp}
        onDoubleClick={() => dispatch(toggleMaximize(win.id))}
      >
        <span className="truncate text-sm font-medium">{win.title}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Minimizar"
            className={TITLEBAR_BUTTON_CLASS}
            onClick={() => dispatch(toggleMinimize(win.id))}
          >
            &#x2013;
          </button>
          <button
            type="button"
            aria-label={win.maximized ? "Restaurar" : "Maximizar"}
            className={TITLEBAR_BUTTON_CLASS}
            onClick={() => dispatch(toggleMaximize(win.id))}
          >
            &#x25A1;
          </button>
          <button
            type="button"
            aria-label="Fechar"
            className={`${TITLEBAR_BUTTON_CLASS} hover:bg-red-600`}
            onClick={() => dispatch(closeWindow(win.id))}
          >
            &#x2715;
          </button>
        </div>
      </header>
      <div className="flex-1 overflow-auto p-4">{children}</div>
    </section>
  )
}
