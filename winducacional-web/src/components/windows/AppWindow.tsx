import { useRef, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react"
import { useAppDispatch } from "@/app/hooks"
import {
  closeWindow,
  constrainWindowGeometry,
  focusWindow,
  moveWindow,
  resizeWindow,
  toggleMaximize,
  toggleMinimize,
  type AppWindowState,
  type WindowGeometry,
  type WindowSize,
} from "@/features/windows/windowsSlice"

interface AppWindowProps {
  window: AppWindowState
  children: ReactNode
}

const TITLEBAR_BUTTON_CLASS =
  "flex h-6 w-6 items-center justify-center rounded text-xs text-white/80 hover:bg-white/15"
const TASKBAR_HEIGHT = 48

type ResizeDirection = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw"

const RESIZE_HANDLES: Array<{ direction: ResizeDirection; className: string }> = [
  { direction: "n", className: "top-0 left-2 right-2 h-1 cursor-n-resize" },
  { direction: "s", className: "bottom-0 left-2 right-2 h-1 cursor-s-resize" },
  { direction: "e", className: "right-0 top-2 bottom-2 w-1 cursor-e-resize" },
  { direction: "w", className: "left-0 top-2 bottom-2 w-1 cursor-w-resize" },
  { direction: "ne", className: "right-0 top-0 h-3 w-3 cursor-ne-resize" },
  { direction: "nw", className: "left-0 top-0 h-3 w-3 cursor-nw-resize" },
  { direction: "se", className: "right-0 bottom-0 h-3 w-3 cursor-se-resize" },
  { direction: "sw", className: "left-0 bottom-0 h-3 w-3 cursor-sw-resize" },
]

interface PointerStart {
  startX: number
  startY: number
  originX: number
  originY: number
}

interface ResizeStart extends PointerStart {
  width: number
  height: number
  direction: ResizeDirection
  workArea: WindowSize
}

export function AppWindow({ window: win, children }: AppWindowProps) {
  const dispatch = useAppDispatch()
  const windowRef = useRef<HTMLElement>(null)
  const dragRef = useRef<PointerStart | null>(null)
  const resizeRef = useRef<ResizeStart | null>(null)

  function getWorkArea(): WindowSize {
    const parent = windowRef.current?.parentElement
    return {
      width: parent?.clientWidth || window.innerWidth,
      height: Math.max(0, (parent?.clientHeight || window.innerHeight) - TASKBAR_HEIGHT),
    }
  }

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
    const geometry = constrainWindowGeometry(
      {
        x: drag.originX + (event.clientX - drag.startX),
        y: drag.originY + (event.clientY - drag.startY),
      },
      win.size,
      getWorkArea(),
    )
    dispatch(
      moveWindow({
        id: win.id,
        position: geometry.position,
        workArea: getWorkArea(),
      }),
    )
  }

  function handleTitleBarPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    dragRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  function getResizeGeometry(resize: ResizeStart, event: ReactPointerEvent<HTMLElement>): WindowGeometry {
    const deltaX = event.clientX - resize.startX
    const deltaY = event.clientY - resize.startY
    let x = resize.originX
    let y = resize.originY
    let width = resize.width
    let height = resize.height

    if (resize.direction.includes("e")) width = resize.width + deltaX
    if (resize.direction.includes("s")) height = resize.height + deltaY
    if (resize.direction.includes("w")) {
      width = resize.width - deltaX
      const constrainedWidth = constrainWindowGeometry({ x, y }, { width, height }, resize.workArea).size.width
      x = resize.originX + resize.width - constrainedWidth
      width = constrainedWidth
    }
    if (resize.direction.includes("n")) {
      height = resize.height - deltaY
      const constrainedHeight = constrainWindowGeometry({ x, y }, { width, height }, resize.workArea).size.height
      y = resize.originY + resize.height - constrainedHeight
      height = constrainedHeight
    }

    return constrainWindowGeometry({ x, y }, { width, height }, resize.workArea)
  }

  function handleResizePointerDown(direction: ResizeDirection, event: ReactPointerEvent<HTMLElement>) {
    if (win.maximized) return
    event.preventDefault()
    event.stopPropagation()
    resizeRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: win.position.x,
      originY: win.position.y,
      width: win.size.width,
      height: win.size.height,
      direction,
      workArea: getWorkArea(),
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handleResizePointerMove(event: ReactPointerEvent<HTMLElement>) {
    const resize = resizeRef.current
    if (!resize) return
    const geometry = getResizeGeometry(resize, event)
    dispatch(resizeWindow({ id: win.id, ...geometry, workArea: resize.workArea }))
  }

  function handleResizePointerUp(event: ReactPointerEvent<HTMLElement>) {
    resizeRef.current = null
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
      ref={windowRef}
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
      {!win.maximized &&
        RESIZE_HANDLES.map((handle) => (
          <span
            key={handle.direction}
            aria-hidden="true"
            className={`absolute ${handle.className}`}
            onPointerDown={(event) => handleResizePointerDown(handle.direction, event)}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            onPointerCancel={handleResizePointerUp}
          />
        ))}
    </section>
  )
}
