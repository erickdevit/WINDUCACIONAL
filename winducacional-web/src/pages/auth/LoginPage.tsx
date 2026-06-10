import { useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { AuthCard } from "@/components/layout/AuthCard"
import { Button } from "@/components/ui/Button"
import { TextField } from "@/components/ui/TextField"
import { useLoginMutation } from "@/features/auth/authApi"
import { getApiErrorMessage } from "@/utils/errors"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [login, { isLoading, error }] = useLoginMutation()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    void login({ username, password })
  }

  return (
    <AuthCard title="Entrar">
      <form onSubmit={handleSubmit}>
        <TextField
          id="username"
          label="Usuário"
          autoComplete="username"
          required
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
        <TextField
          id="password"
          label="Senha"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {error && (
          <p className="mb-4 text-sm text-red-400">
            {getApiErrorMessage(error, "Não foi possível entrar. Tente novamente.")}
          </p>
        )}

        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Entrando…" : "Entrar"}
        </Button>

        <p className="mt-4 text-center text-sm text-white/70">
          Não tem conta?{" "}
          <Link to="/cadastro" className="text-accent hover:underline">
            Cadastre-se
          </Link>
        </p>
      </form>
    </AuthCard>
  )
}
