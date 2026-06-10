import type { ReactNode } from "react"

interface AuthCardProps {
  title: string
  children: ReactNode
}

export function AuthCard({ title, children }: AuthCardProps) {
  return (
    <main className="flex h-full items-center justify-center bg-desktop px-4">
      <div className="w-full max-w-sm rounded-window border border-desktop-border bg-desktop-surface p-8 shadow-window">
        <h1 className="mb-6 text-center text-2xl font-semibold text-white">{title}</h1>
        {children}
      </div>
    </main>
  )
}
