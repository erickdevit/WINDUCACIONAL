import { Link } from "react-router-dom"
import AttendanceApp from "@/pages/apps/AttendanceApp"

export default function AttendancePage() {
  return (
    <main className="flex h-full min-h-0 flex-col bg-desktop p-3 text-white">
      <header className="mb-3 flex shrink-0 items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold">Frequência</h1>
          <p className="text-xs text-white/50">Acesso direto autenticado</p>
        </div>
        <Link to="/" className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/20">
          Área de trabalho
        </Link>
      </header>
      <section className="min-h-0 flex-1 overflow-hidden rounded-md border border-desktop-border bg-desktop-surface p-3">
        <AttendanceApp />
      </section>
    </main>
  )
}
