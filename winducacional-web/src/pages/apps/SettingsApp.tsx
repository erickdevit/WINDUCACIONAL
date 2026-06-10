import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/Button"
import { TextField } from "@/components/ui/TextField"
import { useGetMeQuery, useLogoutMutation, useUpdateDisplayNameMutation } from "@/features/auth/authApi"
import { getApiErrorMessage } from "@/utils/errors"

export default function SettingsApp() {
  const { data } = useGetMeQuery()
  const [displayName, setDisplayName] = useState(data?.user.displayName ?? "")
  const [updateDisplayName, { isLoading, error, isSuccess }] = useUpdateDisplayNameMutation()
  const [logout] = useLogoutMutation()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    void updateDisplayName({ displayName })
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit}>
        <TextField
          id="settings-display-name"
          label="Nome de exibição"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          required
        />
        {error && (
          <p className="mb-2 text-sm text-red-400">
            {getApiErrorMessage(error, "Não foi possível salvar. Tente novamente.")}
          </p>
        )}
        {isSuccess && <p className="mb-2 text-sm text-emerald-400">Nome atualizado.</p>}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Salvando…" : "Salvar"}
        </Button>
      </form>

      <div className="border-t border-desktop-border pt-4">
        <Button type="button" className="bg-red-600 hover:bg-red-500" onClick={() => void logout()}>
          Sair da conta
        </Button>
      </div>
    </div>
  )
}
