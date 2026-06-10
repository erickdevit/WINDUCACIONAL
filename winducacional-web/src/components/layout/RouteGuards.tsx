import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useGetBootstrapStatusQuery, useGetMeQuery } from "@/features/auth/authApi"
import { FullScreenLoading } from "./FullScreenLoading"

// Enquanto não houver nenhum usuário cadastrado, força a tela de bootstrap
// (criação do primeiro professor); depois disso, bloqueia o acesso a ela.
export function AppGate() {
  const { data, isLoading } = useGetBootstrapStatusQuery()
  const location = useLocation()

  if (isLoading || !data) return <FullScreenLoading />

  if (data.needsBootstrap && location.pathname !== "/bootstrap") {
    return <Navigate to="/bootstrap" replace />
  }

  if (!data.needsBootstrap && location.pathname === "/bootstrap") {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

// Libera o acesso somente para usuários autenticados (sessão válida).
export function RequireAuth() {
  const { data, isLoading, isError } = useGetMeQuery()

  if (isLoading) return <FullScreenLoading />
  if (isError || !data) return <Navigate to="/login" replace />

  return <Outlet />
}

// Libera o acesso somente para visitantes (sem sessão), redirecionando
// usuários já autenticados para a área principal.
export function RequireGuest() {
  const { data, isLoading } = useGetMeQuery()

  if (isLoading) return <FullScreenLoading />
  if (data) return <Navigate to="/" replace />

  return <Outlet />
}
