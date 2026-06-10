import { useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { AuthCard } from "@/components/layout/AuthCard"
import { Button } from "@/components/ui/Button"
import { TextField } from "@/components/ui/TextField"
import { useRegisterMutation } from "@/features/auth/authApi"
import { getApiErrorMessage } from "@/utils/errors"

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [turmaCode, setTurmaCode] = useState("")
  const [register, { isLoading, error }] = useRegisterMutation()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    void register({ displayName, username, password, turmaCode: turmaCode.toUpperCase() })
  }

  return (
    <AuthCard title="Criar conta">
      <form onSubmit={handleSubmit}>
        <TextField
          id="displayName"
          label="Nome completo"
          autoComplete="name"
          required
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />
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
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <TextField
          id="turmaCode"
          label="Código da turma"
          autoComplete="off"
          required
          maxLength={6}
          value={turmaCode}
          onChange={(event) => setTurmaCode(event.target.value)}
        />

        {error && (
          <p className="mb-4 text-sm text-red-400">
            {getApiErrorMessage(error, "Não foi possível criar a conta. Tente novamente.")}
          </p>
        )}

        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Criando…" : "Criar conta"}
        </Button>

        <p className="mt-4 text-center text-sm text-white/70">
          Já tem conta?{" "}
          <Link to="/login" className="text-accent hover:underline">
            Entrar
          </Link>
        </p>
      </form>
    </AuthCard>
  )
}
