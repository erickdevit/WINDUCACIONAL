import { screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { renderApp } from "@/test/renderApp"

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

// fetchBaseQuery chama fetchFn com um objeto Request; usamos request.url
// (e não request.toString(), que retorna "[object Request]") para rotear
// as respostas mockadas por endpoint.
function mockFetch(handler: (url: string) => Response) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (request: Request) => handler(request.url)),
  )
}

describe("App", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("redireciona visitantes não autenticados para a tela de login", async () => {
    mockFetch((url) => {
      if (url.endsWith("/api/bootstrap/status")) {
        return jsonResponse({ needsBootstrap: false, requiresToken: false })
      }
      if (url.endsWith("/api/auth/me")) {
        return jsonResponse({ error: "Sessão ausente." }, 401)
      }
      throw new Error(`fetch inesperado: ${url}`)
    })

    renderApp("/")

    expect(await screen.findByRole("heading", { name: "Entrar" })).toBeInTheDocument()
  })

  it("força a tela de configuração inicial quando ainda não há usuários", async () => {
    mockFetch((url) => {
      if (url.endsWith("/api/bootstrap/status")) {
        return jsonResponse({ needsBootstrap: true, requiresToken: false })
      }
      throw new Error(`fetch inesperado: ${url}`)
    })

    renderApp("/")

    expect(await screen.findByRole("heading", { name: "Configuração inicial" })).toBeInTheDocument()
  })

  it("mostra a área autenticada para usuários com sessão válida", async () => {
    mockFetch((url) => {
      if (url.endsWith("/api/bootstrap/status")) {
        return jsonResponse({ needsBootstrap: false, requiresToken: false })
      }
      if (url.endsWith("/api/auth/me")) {
        return jsonResponse({
          user: {
            id: "1",
            username: "professor",
            displayName: "Professor Teste",
            role: "professor",
            studentType: "normal",
            turmaId: null,
            active: true,
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z",
          },
        })
      }
      throw new Error(`fetch inesperado: ${url}`)
    })

    renderApp("/")

    expect(await screen.findByRole("heading", { name: "Bem-vindo, Professor Teste!" })).toBeInTheDocument()
  })
})
