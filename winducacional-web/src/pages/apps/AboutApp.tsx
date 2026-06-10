import { useGetMeQuery } from "@/features/auth/authApi"
import type { UserRole } from "@/types/user"

const ROLE_LABELS: Record<UserRole, string> = {
  professor: "Professor(a)",
  secretaria: "Secretaria",
  aluno: "Aluno(a)",
}

export default function AboutApp() {
  const { data } = useGetMeQuery()
  const user = data?.user
  if (!user) return null

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
      <dt className="text-white/60">Nome</dt>
      <dd>{user.displayName}</dd>
      <dt className="text-white/60">Usuário</dt>
      <dd>{user.username}</dd>
      <dt className="text-white/60">Perfil</dt>
      <dd>{ROLE_LABELS[user.role]}</dd>
      <dt className="text-white/60">Conta criada em</dt>
      <dd>{new Date(user.createdAt).toLocaleDateString("pt-BR")}</dd>
    </dl>
  )
}
