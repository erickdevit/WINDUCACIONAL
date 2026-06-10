import { useEffect, useState } from "react"
import { useAppDispatch, useAppSelector } from "@/app/hooks"
import { focusWindow, selectWindows, toggleMinimize } from "@/features/windows/windowsSlice"
import { StartMenu } from "./StartMenu"

const CLOCK_UPDATE_INTERVAL_MS = 30_000

export function Taskbar() {
  const dispatch = useAppDispatch()
  const windows = useAppSelector(selectWindows)
  const [startOpen, setStartOpen] = useState(false)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), CLOCK_UPDATE_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [])

  function handleWindowButtonClick(id: string, minimized: boolean) {
    if (minimized) {
      dispatch(focusWindow(id))
    } else {
      dispatch(toggleMinimize(id))
    }
  }

  return (
    <>
      {startOpen && <StartMenu onClose={() => setStartOpen(false)} />}
      <footer className="absolute inset-x-0 bottom-0 z-50 flex h-12 items-center gap-2 border-t border-desktop-border bg-desktop-surface/95 px-2 shadow-taskbar backdrop-blur">
        <button
          type="button"
          onClick={() => setStartOpen((open) => !open)}
          className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
            startOpen ? "bg-accent text-white" : "hover:bg-white/10"
          }`}
        >
          Início
        </button>

        <div className="flex flex-1 items-center gap-1 overflow-x-auto">
          {windows.map((win) => (
            <button
              key={win.id}
              type="button"
              onClick={() => handleWindowButtonClick(win.id, win.minimized)}
              className={`max-w-[160px] truncate rounded-md px-3 py-1.5 text-sm transition ${
                win.minimized ? "bg-white/5 text-white/60" : "bg-white/10"
              }`}
            >
              {win.title}
            </button>
          ))}
        </div>

        <time className="px-3 text-sm tabular-nums text-white/80" dateTime={now.toISOString()}>
          {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </time>
      </footer>
    </>
  )
}
