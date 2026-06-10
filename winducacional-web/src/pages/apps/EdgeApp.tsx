import { useState, type FormEvent } from "react"

// Domínios espelham EdgeProxyController::ALLOWED_DOMAINS (winducacional-api).
const HOME_URL = "https://www.google.com/webhp?igu=1"

function normalizeUrl(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return HOME_URL
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(trimmed)) return `https://${trimmed}`
  // Sem cara de URL: pesquisa no Google.
  return `https://www.google.com/search?igu=1&q=${encodeURIComponent(trimmed)}`
}

function proxiedUrl(url: string): string {
  return `${window.location.origin}/api/edge-proxy?url=${encodeURIComponent(url)}`
}

export default function EdgeApp() {
  const [address, setAddress] = useState(HOME_URL)
  const [currentUrl, setCurrentUrl] = useState(HOME_URL)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const next = normalizeUrl(address)
    setAddress(next)
    setCurrentUrl(next)
  }

  return (
    <div className="flex h-full flex-col gap-2 text-sm">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <button
          type="button"
          aria-label="Página inicial"
          onClick={() => {
            setAddress(HOME_URL)
            setCurrentUrl(HOME_URL)
          }}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md hover:bg-white/10"
        >
          🏠
        </button>
        <input
          type="text"
          aria-label="Endereço"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          className="min-w-0 flex-1 rounded-md bg-black/30 px-2 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-accent"
        />
        <button
          type="submit"
          className="shrink-0 rounded-md bg-accent px-3 py-1 text-xs font-medium text-white hover:bg-accent-hover"
        >
          Ir
        </button>
      </form>

      <iframe
        title="Navegador"
        src={proxiedUrl(currentUrl)}
        className="flex-1 rounded-md border-0 bg-white"
        sandbox="allow-scripts allow-forms allow-same-origin"
      />
    </div>
  )
}
