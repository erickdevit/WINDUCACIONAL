import { fireEvent, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { renderApp } from "@/test/renderApp"
import type { User } from "@/types/user"

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

const professorUser: User = {
  id: "1",
  username: "professor",
  displayName: "Professor Teste",
  role: "professor",
  studentType: "normal",
  turmaId: null,
  active: true,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
}

const studentUser: User = {
  id: "2",
  username: "aluno",
  displayName: "Aluno Teste",
  role: "aluno",
  studentType: "normal",
  turmaId: "turma-1",
  active: true,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
}

function mockAuthenticatedFetch(extra?: (url: string) => Response | undefined, user: User = professorUser) {
  mockFetch((url) => {
    if (url.endsWith("/api/bootstrap/status")) {
      return jsonResponse({ needsBootstrap: false, requiresToken: false })
    }
    if (url.endsWith("/api/auth/me")) {
      return jsonResponse({ user })
    }
    const extraResponse = extra?.(url)
    if (extraResponse) return extraResponse
    throw new Error(`fetch inesperado: ${url}`)
  })
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

  it("mostra a área de trabalho para usuários com sessão válida", async () => {
    mockAuthenticatedFetch()

    renderApp("/")

    expect(await screen.findByRole("button", { name: "Início" })).toBeInTheDocument()
  })

  it("abre e fecha o app Sobre pelo menu Iniciar", async () => {
    mockAuthenticatedFetch()
    renderApp("/")

    fireEvent.click(await screen.findByRole("button", { name: "Início" }))
    fireEvent.click(await screen.findByRole("button", { name: /Sobre/ }))

    expect(await screen.findByText("Professor Teste")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Fechar" }))

    expect(screen.queryByText("Professor Teste")).not.toBeInTheDocument()
  })

  it("abre o app Configurações com o nome de exibição atual", async () => {
    mockAuthenticatedFetch()
    renderApp("/")

    fireEvent.click(await screen.findByRole("button", { name: "Início" }))
    fireEvent.click(await screen.findByRole("button", { name: /Configurações/ }))

    expect(await screen.findByLabelText("Nome de exibição")).toHaveValue("Professor Teste")
  })

  it("abre a Calculadora e realiza uma operação simples", async () => {
    mockAuthenticatedFetch()
    renderApp("/")

    fireEvent.click(await screen.findByRole("button", { name: "Início" }))
    fireEvent.click(await screen.findByRole("button", { name: /Calculadora/ }))

    fireEvent.click(await screen.findByRole("button", { name: "5" }))
    fireEvent.click(screen.getByRole("button", { name: "Somar" }))
    fireEvent.click(screen.getByRole("button", { name: "3" }))
    fireEvent.click(screen.getByRole("button", { name: "Igual" }))

    expect(await screen.findByRole("status", { name: "Visor" })).toHaveTextContent("8")
  })

  it("abre o Explorador de Arquivos e navega entre pastas", async () => {
    const tree = {
      "C:": {
        data: {
          Users: {
            data: {
              professor: {
                info: { spid: "%user%" },
                data: {
                  Desktop: { info: { spid: "%desktop%" }, data: {} },
                  Documents: {
                    info: { spid: "%documents%" },
                    data: { "notas.txt": { type: "txt", data: "oi" } },
                  },
                },
              },
            },
          },
        },
      },
    }

    mockAuthenticatedFetch((url) => {
      if (url.endsWith("/api/fs/tree")) return jsonResponse({ tree })
      return undefined
    })
    renderApp("/")

    fireEvent.click(await screen.findByRole("button", { name: "Início" }))
    fireEvent.click(await screen.findByRole("button", { name: /Explorador/ }))

    expect(await screen.findByText("Documents")).toBeInTheDocument()
    expect(screen.getByText("C:\\Users\\professor")).toBeInTheDocument()

    fireEvent.doubleClick(screen.getByText("Documents"))

    expect(await screen.findByText("notas.txt")).toBeInTheDocument()
    expect(screen.getByText("C:\\Users\\professor\\Documents")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Voltar" }))

    expect(await screen.findByText("Desktop")).toBeInTheDocument()
  })

  it("esconde o app Frequência do menu Iniciar para o perfil professor", async () => {
    mockAuthenticatedFetch()
    renderApp("/")

    fireEvent.click(await screen.findByRole("button", { name: "Início" }))

    expect(await screen.findByRole("button", { name: /Sobre/ })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Frequência/ })).not.toBeInTheDocument()
  })

  it("abre a Frequência para o perfil aluno e mostra os registros", async () => {
    mockAuthenticatedFetch((url) => {
      if (url.endsWith("/api/attendance/me")) {
        return jsonResponse({
          today: "2026-06-10",
          todayRecord: null,
          records: [
            {
              id: "r1",
              userId: "2",
              attendanceDate: "2026-06-09",
              firstLoginAt: "2026-06-09T12:30:00Z",
              lastLoginAt: "2026-06-09T18:00:00Z",
              loginCount: 3,
              username: "aluno",
              displayName: "Aluno Teste",
              turmaId: "turma-1",
              turmaNome: "Turma A",
              classType: "normal",
            },
          ],
        })
      }
      return undefined
    }, studentUser)
    renderApp("/")

    fireEvent.click(await screen.findByRole("button", { name: "Início" }))
    fireEvent.click(await screen.findByRole("button", { name: /Frequência/ }))

    expect(await screen.findByText("Sem registro hoje")).toBeInTheDocument()
    expect(screen.getByText("09/06/2026")).toBeInTheDocument()
    expect(screen.getByText("09:30")).toBeInTheDocument()
  })

  it("permite ao professor visualizar e encerrar sessões pelo Gestor de Sessões", async () => {
    let sessionsCallCount = 0
    mockAuthenticatedFetch((url) => {
      if (url.endsWith("/api/gestor/sessions/logout")) {
        return new Response(null, { status: 204 })
      }
      if (url.endsWith("/api/gestor/sessions")) {
        sessionsCallCount += 1
        const sessions =
          sessionsCallCount === 1
            ? [
                {
                  sessionId: "s1",
                  loginAt: "2026-06-10T12:00:00Z",
                  userId: "2",
                  username: "aluno1",
                  displayName: "Aluno Um",
                  turmaId: "turma-1",
                  turmaNome: "Turma A",
                },
              ]
            : []
        return jsonResponse({ sessions })
      }
      return undefined
    })
    renderApp("/")

    fireEvent.click(await screen.findByRole("button", { name: "Início" }))
    fireEvent.click(await screen.findByRole("button", { name: /Gestor/ }))

    expect(await screen.findByText("Turma A")).toBeInTheDocument()
    expect(screen.getByText(/Aluno Um/)).toBeInTheDocument()
    expect(screen.getByText("1 aluno conectado")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Encerrar" }))

    expect(await screen.findByText("Nenhum aluno conectado no momento.")).toBeInTheDocument()
  })

  it("esconde o app Gestor de Sessões do menu Iniciar para o perfil aluno", async () => {
    mockAuthenticatedFetch(undefined, studentUser)
    renderApp("/")

    fireEvent.click(await screen.findByRole("button", { name: "Início" }))

    expect(await screen.findByRole("button", { name: /Frequência/ })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Gestor/ })).not.toBeInTheDocument()
  })
})
