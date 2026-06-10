import { useState, type FormEvent } from "react"
import { AuthCard } from "@/components/layout/AuthCard"
import { Button } from "@/components/ui/Button"
import { TextField } from "@/components/ui/TextField"
import { useBootstrapMutation, useGetBootstrapStatusQuery } from "@/features/auth/authApi"
import { getApiErrorMessage } from "@/utils/errors"

export default function BootstrapPage() {
  const { data: status } = useGetBootstrapStatusQuery()
  const [displayName, setDisplayName] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [token, setToken] = useState("")
  const [bootstrap, { isLoading, error }] = useBootstrapMutation()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    void bootstrap({
      displayName,
      username,
      password,
      token: status?.requiresToken ? token : undefined,
    })
  }

  return (
    <AuthCard title="Configuração inicial">
      <p className="mb-4 text-sm text-white/70">
        Crie a primeira conta de professor para começar a usar o simulador.
      </p>
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
        {status?.requiresToken && (
          <TextField
            id="token"
            label="Token de bootstrap"
            autoComplete="off"
            required
            value={token}
            onChange={(event) => setToken(event.target.value)}
          />
        )}

        {error && (
          <p className="mb-4 text-sm text-red-400">
            {getApiErrorMessage(error, "Não foi possível concluir a configuração. Tente novamente.")}
          </p>
        )}

        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Criando…" : "Criar conta de professor"}
        </Button>
      </form>
    </AuthCard>
  )
}
