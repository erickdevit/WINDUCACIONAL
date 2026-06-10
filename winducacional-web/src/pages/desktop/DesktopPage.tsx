import { Button } from "@/components/ui/Button"
import { useGetMeQuery, useLogoutMutation } from "@/features/auth/authApi"

// Placeholder da área autenticada: será substituído pela área de trabalho
// (Desktop, Taskbar, janelas dos apps) nas próximas fases do frontend.
export default function DesktopPage() {
  const { data } = useGetMeQuery()
  const [logout, { isLoading }] = useLogoutMutation()
  const user = data?.user

  return (
    <main className="flex h-full flex-col items-center justify-center gap-4 bg-desktop text-white">
      <h1 className="text-2xl font-semibold">
        Bem-vindo{user ? `, ${user.displayName}` : ""}!
      </h1>
      {user && <p className="text-white/70">Perfil: {user.role}</p>}
      <Button type="button" className="w-auto px-6" onClick={() => void logout()} disabled={isLoading}>
        {isLoading ? "Saindo…" : "Sair"}
      </Button>
    </main>
  )
}
