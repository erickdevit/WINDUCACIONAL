import { fireEvent, screen, waitFor } from "@testing-library/react"
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

  it("abre a Frequência administrativa para o perfil professor", async () => {
    mockAuthenticatedFetch((url) => {
      if (url.endsWith("/api/turmas")) {
        return jsonResponse({ turmas: [{ id: "turma-1", nome: "Turma A", code: "ABC123", studentType: "normal" }] })
      }
      if (url.includes("/api/attendance/summary")) {
        return jsonResponse({
          range: { startDate: "2026-05-10", endDate: "2026-06-10", totalDays: 1 },
          totals: { students: 1, presences: 1, absences: 0, attendanceRate: 100 },
          students: [
            {
              id: "2",
              username: "aluno",
              displayName: "Aluno Teste",
              turmaId: "turma-1",
              turmaNome: "Turma A",
              presentDays: 1,
              absentDays: 0,
              attendanceRate: 100,
              lastLoginAt: "2026-06-10T12:00:00Z",
              records: [
                {
                  id: "r1",
                  userId: "2",
                  attendanceDate: "2026-06-10",
                  firstLoginAt: "2026-06-10T12:00:00Z",
                  lastLoginAt: "2026-06-10T12:00:00Z",
                  loginCount: 1,
                  username: "aluno",
                  displayName: "Aluno Teste",
                  turmaId: "turma-1",
                  turmaNome: "Turma A",
                  classType: "normal",
                },
              ],
            },
          ],
          daily: [{ date: "2026-06-10", expected: 1, present: 1, absent: 0, attendanceRate: 100 }],
          records: [],
        })
      }
      return undefined
    })
    renderApp("/")

    fireEvent.click(await screen.findByRole("button", { name: "Início" }))

    fireEvent.click(await screen.findByRole("button", { name: /Frequência/ }))

    expect(await screen.findByText("Registro manual")).toBeInTheDocument()
    expect(screen.getAllByText("Aluno Teste").length).toBeGreaterThan(0)
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

  it("renderiza a rota direta de Frequência sem montar a área de trabalho", async () => {
    mockAuthenticatedFetch((url) => {
      if (url.endsWith("/api/attendance/me")) {
        return jsonResponse({ today: "2026-06-10", todayRecord: null, records: [] })
      }
      return undefined
    }, studentUser)
    renderApp("/frequencia")

    expect(await screen.findByRole("heading", { name: "Frequência" })).toBeInTheDocument()
    expect(screen.getByText("Acesso direto autenticado")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Início" })).not.toBeInTheDocument()
    expect(await screen.findByText("Nenhum registro de frequência ainda.")).toBeInTheDocument()
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

  it("permite ao professor liberar uma apostila para os alunos", async () => {
    let modulesCallCount = 0
    const file = {
      id: "f1",
      title: "Introdução",
      fileName: "1 - Introdução.pdf",
      order: 1,
      size: 2048,
      url: "/api/booklets/modules/m1/files/f1/pdf",
    }

    mockAuthenticatedFetch((url) => {
      if (url.endsWith("/api/turmas")) {
        return jsonResponse({ turmas: [{ id: "turma-1", nome: "Turma A", code: "ABC123", studentType: "normal" }] })
      }
      if (url.includes("/api/booklets/student-access")) {
        return jsonResponse({ students: [] })
      }
      if (url.endsWith("/api/booklets/modules/access")) {
        return jsonResponse({ modules: [] })
      }
      if (url.endsWith("/api/booklets/modules")) {
        modulesCallCount += 1
        const globalEnabled = modulesCallCount > 1
        return jsonResponse({
          modules: [
            {
              id: "m1",
              title: "Informática Básica",
              folderName: "1 - Informática Básica",
              order: 1,
              totalFiles: 1,
              files: [file],
              globalEnabled,
              studentEnabled: false,
              enabled: globalEnabled,
            },
          ],
        })
      }
      return undefined
    })
    renderApp("/")

    fireEvent.click(await screen.findByRole("button", { name: "Início" }))
    fireEvent.click(await screen.findByRole("button", { name: /Apostilas/ }))

    expect(await screen.findByText("Informática Básica")).toBeInTheDocument()
    expect(screen.getByText("2.0 KB")).toBeInTheDocument()

    const checkbox = screen.getByRole("checkbox", { name: "Liberado para alunos" })
    expect(checkbox).not.toBeChecked()

    fireEvent.click(checkbox)

    await waitFor(() =>
      expect(screen.getByRole("checkbox", { name: "Liberado para alunos" })).toBeChecked(),
    )
  })

  it("permite ao professor liberar apostila específica para um aluno", async () => {
    let savedBody: unknown = null
    const module = {
      id: "m1",
      title: "Informática Básica",
      folderName: "1 - Informática Básica",
      order: 1,
      totalFiles: 0,
      files: [],
      globalEnabled: false,
      studentEnabled: false,
      enabled: false,
    }

    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        const url = request.url
        if (url.endsWith("/api/bootstrap/status")) {
          return jsonResponse({ needsBootstrap: false, requiresToken: false })
        }
        if (url.endsWith("/api/auth/me")) {
          return jsonResponse({ user: professorUser })
        }
        if (url.endsWith("/api/turmas")) {
          return jsonResponse({ turmas: [{ id: "turma-1", nome: "Turma A", code: "ABC123", studentType: "normal" }] })
        }
        if (url.endsWith("/api/booklets/modules")) {
          return jsonResponse({ modules: [module] })
        }
        if (url.includes("/api/booklets/student-access") && request.method === "PUT") {
          savedBody = await request.json()
          return jsonResponse({
            students: [
              {
                id: "2",
                username: "aluno",
                displayName: "Aluno Teste",
                turmaId: "turma-1",
                turmaNome: "Turma A",
                moduleIds: ["m1"],
              },
            ],
          })
        }
        if (url.includes("/api/booklets/student-access")) {
          return jsonResponse({
            students: [
              {
                id: "2",
                username: "aluno",
                displayName: "Aluno Teste",
                turmaId: "turma-1",
                turmaNome: "Turma A",
                moduleIds: [],
              },
            ],
          })
        }
        throw new Error(`fetch inesperado: ${url}`)
      }),
    )
    renderApp("/")

    fireEvent.click(await screen.findByRole("button", { name: "Início" }))
    fireEvent.click(await screen.findByRole("button", { name: /Apostilas/ }))

    fireEvent.click(await screen.findByRole("checkbox", { name: /Aluno Teste/ }))
    fireEvent.click(screen.getByRole("checkbox", { name: "Informática Básica" }))
    fireEvent.click(screen.getByRole("button", { name: "Salvar liberação" }))

    expect(await screen.findByText("1 aluno(s) atualizado(s).")).toBeInTheDocument()
    expect(savedBody).toEqual({ turmaId: "", userIds: ["2"], moduleIds: ["m1"] })
  })

  it("mostra apenas as apostilas liberadas para o perfil aluno, sem opção de gerenciar", async () => {
    mockAuthenticatedFetch((url) => {
      if (url.endsWith("/api/booklets/modules")) {
        return jsonResponse({
          modules: [
            {
              id: "m1",
              title: "Informática Básica",
              folderName: "1 - Informática Básica",
              order: 1,
              totalFiles: 1,
              files: [
                {
                  id: "f1",
                  title: "Introdução",
                  fileName: "1 - Introdução.pdf",
                  order: 1,
                  size: 2048,
                  url: "/api/booklets/modules/m1/files/f1/pdf",
                },
              ],
              globalEnabled: true,
              studentEnabled: false,
              enabled: true,
            },
          ],
        })
      }
      return undefined
    }, studentUser)
    renderApp("/")

    fireEvent.click(await screen.findByRole("button", { name: "Início" }))
    fireEvent.click(await screen.findByRole("button", { name: /Apostilas/ }))

    expect(await screen.findByText("Informática Básica")).toBeInTheDocument()
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Introdução/ })).toHaveAttribute(
      "href",
      `${window.location.origin}/api/booklets/modules/m1/files/f1/pdf`,
    )
  })

  it("abre um arquivo .txt do Explorador no Bloco de Notas, edita e salva", async () => {
    const tree = {
      "C:": {
        data: {
          Users: {
            data: {
              professor: {
                info: { spid: "%user%" },
                data: {
                  "notas.txt": { type: "txt", data: "olá" },
                },
              },
            },
          },
        },
      },
    }

    let savedBody: unknown = null
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        const url = request.url
        if (url.endsWith("/api/bootstrap/status")) {
          return jsonResponse({ needsBootstrap: false, requiresToken: false })
        }
        if (url.endsWith("/api/auth/me")) {
          return jsonResponse({ user: professorUser })
        }
        if (url.endsWith("/api/fs/tree") && request.method === "PUT") {
          savedBody = await request.json()
          return new Response(null, { status: 204 })
        }
        if (url.endsWith("/api/fs/tree")) {
          return jsonResponse({ tree })
        }
        throw new Error(`fetch inesperado: ${url}`)
      }),
    )
    renderApp("/")

    fireEvent.click(await screen.findByRole("button", { name: "Início" }))
    fireEvent.click(await screen.findByRole("button", { name: /Explorador/ }))

    fireEvent.doubleClick(await screen.findByText("notas.txt"))

    const textarea = await screen.findByLabelText("Conteúdo do arquivo")
    expect(textarea).toHaveValue("olá")

    fireEvent.change(textarea, { target: { value: "olá, mundo" } })
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }))

    expect(await screen.findByText("Salvo")).toBeInTheDocument()
    expect(savedBody).toEqual({
      tree: {
        "C:": {
          data: {
            Users: {
              data: {
                professor: {
                  info: { spid: "%user%" },
                  data: {
                    "notas.txt": { type: "txt", data: "olá, mundo" },
                  },
                },
              },
            },
          },
        },
      },
    })
  })

  it("abre a Digitação, lista as lições e mostra o ranking da turma", async () => {
    mockAuthenticatedFetch((url) => {
      if (url.endsWith("/api/typing/settings/normal")) {
        return jsonResponse({
          settings: {
            studentType: "normal",
            passMinWpm: 40,
            passMinAccuracy: 95,
            maxErrors: 7,
            updatedAt: null,
          },
        })
      }
      if (url.endsWith("/api/typing/ranking/turma")) {
        return jsonResponse({
          ranking: [
            {
              name: "Aluno Um",
              lessons_completed: 4,
              points: 320,
              best_wpm: 52,
              best_accuracy: 97.5,
              best_time: 41000,
            },
          ],
        })
      }
      return undefined
    }, studentUser)
    renderApp("/")

    fireEvent.click(await screen.findByRole("button", { name: "Início" }))
    fireEvent.click(await screen.findByRole("button", { name: /^Digitação$/ }))

    expect(await screen.findByText(/Linha Base - Esquerda/)).toBeInTheDocument()
    expect(await screen.findByText(/Meta: 40 PPM · 95% · máx. 7 erros/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /Ranking/ }))

    expect(await screen.findByText("Aluno Um")).toBeInTheDocument()
    expect(screen.getByText("52")).toBeInTheDocument()
    expect(screen.getByText("97%")).toBeInTheDocument()
  })

  it("conclui uma lição de digitação e envia a pontuação", async () => {
    // Garante a variante 0 da lição, já que a rotação fica no localStorage.
    localStorage.clear()
    let scoreBody: unknown = null
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        const url = request.url
        if (url.endsWith("/api/bootstrap/status")) {
          return jsonResponse({ needsBootstrap: false, requiresToken: false })
        }
        if (url.endsWith("/api/auth/me")) {
          return jsonResponse({ user: studentUser })
        }
        if (url.endsWith("/api/typing/settings/normal")) {
          return jsonResponse({
            settings: {
              studentType: "normal",
              passMinWpm: 40,
              passMinAccuracy: 95,
              maxErrors: 7,
              updatedAt: null,
            },
          })
        }
        if (url.endsWith("/api/typing/score")) {
          scoreBody = await request.json()
          return jsonResponse({ ok: true }, 201)
        }
        throw new Error(`fetch inesperado: ${url}`)
      }),
    )
    renderApp("/")

    fireEvent.click(await screen.findByRole("button", { name: "Início" }))
    fireEvent.click(await screen.findByRole("button", { name: /^Digitação$/ }))

    fireEvent.click(await screen.findByText(/Linha Base - Esquerda/))

    const input = await screen.findByLabelText("Digite o texto da lição")
    const lessonText = "asdf asdf asdf fada saca fada casa asdf saca fada casa"
    fireEvent.change(input, { target: { value: lessonText } })

    expect(await screen.findByText(/Lição concluída!|Tente novamente/)).toBeInTheDocument()
    await waitFor(() => expect(scoreBody).not.toBeNull())
    expect(scoreBody).toMatchObject({ lessonId: 1, accuracy: 100 })
  })

  it("abre o Chat no grupo da turma e envia uma mensagem", async () => {
    const baseMessage = {
      thread_id: "thread-1",
      attachment: null,
      sender_role: "aluno",
    }
    const messages = [
      {
        ...baseMessage,
        id: "m1",
        sender_id: "9",
        body: "Bom dia, turma!",
        created_at: "2026-06-10T12:00:00Z",
        sender_name: "Colega",
        sender_username: "colega",
      },
    ]

    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        const url = request.url
        if (url.endsWith("/api/bootstrap/status")) {
          return jsonResponse({ needsBootstrap: false, requiresToken: false })
        }
        if (url.endsWith("/api/auth/me")) {
          return jsonResponse({ user: studentUser })
        }
        if (url.endsWith("/api/chat/turmas")) {
          return jsonResponse({ turmas: [{ id: "turma-1", nome: "Turma A" }] })
        }
        if (url.endsWith("/api/chat/turmas/turma-1/group-thread")) {
          return jsonResponse({ threadId: "thread-1" })
        }
        if (url.endsWith("/api/chat/turmas/turma-1/members")) {
          return jsonResponse({
            members: [{ id: "9", username: "colega", displayName: "Colega", role: "aluno" }],
          })
        }
        if (url.endsWith("/api/chat/threads/thread-1/messages") && request.method === "POST") {
          const body = (await request.json()) as { body: string }
          messages.push({
            ...baseMessage,
            id: `m${messages.length + 1}`,
            sender_id: studentUser.id,
            body: body.body,
            created_at: "2026-06-10T12:01:00Z",
            sender_name: studentUser.displayName,
            sender_username: studentUser.username,
          })
          return jsonResponse({ message: messages[messages.length - 1] }, 201)
        }
        if (url.endsWith("/api/chat/threads/thread-1/messages")) {
          return jsonResponse({ messages })
        }
        throw new Error(`fetch inesperado: ${url}`)
      }),
    )
    renderApp("/")

    fireEvent.click(await screen.findByRole("button", { name: "Início" }))
    fireEvent.click(await screen.findByRole("button", { name: /Chat/ }))

    fireEvent.click(await screen.findByRole("button", { name: /Grupo da turma/ }))

    expect(await screen.findByText("Bom dia, turma!")).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText("Mensagem"), { target: { value: "Olá!" } })
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }))

    expect(await screen.findByText("Olá!")).toBeInTheDocument()
    expect(screen.getByLabelText("Mensagem")).toHaveValue("")
  })

  it("permite ao aluno responder e enviar uma prova de múltipla escolha", async () => {
    const exam = {
      id: "exam-1",
      turmaId: "turma-1",
      title: "Prova de Informática",
      description: "Conceitos básicos",
      containerInitialState: null,
      timeLimit: 0,
      isPublished: true,
      active: true,
      createdAt: "2026-06-01T00:00:00Z",
      updatedAt: "2026-06-01T00:00:00Z",
    }
    let submitBody: unknown = null

    mockAuthenticatedFetch((url) => {
      if (url.endsWith("/api/exams")) {
        return jsonResponse({ exams: [{ ...exam, submissionStatus: "pending" }] })
      }
      if (url.endsWith("/api/exams/student/history")) {
        return jsonResponse({ submissions: [] })
      }
      if (url.endsWith("/api/exams/exam-1")) {
        return jsonResponse({
          exam,
          questions: [
            {
              id: "q1",
              examId: "exam-1",
              type: "mcq",
              text: "O que é um mouse?",
              options: ["Dispositivo de entrada", "Dispositivo de saída"],
              points: 10,
              timeLimit: 0,
              orderIndex: 0,
            },
          ],
        })
      }
      return undefined
    }, studentUser)

    // Intercepta o POST de submissão por cima do mock base.
    const baseFetch = globalThis.fetch
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        if (request.url.endsWith("/api/exams/exam-1/submit") && request.method === "POST") {
          submitBody = await request.json()
          return jsonResponse({
            submission: {
              id: "s1",
              examId: "exam-1",
              userId: studentUser.id,
              status: "completed",
              scoreMcq: 10,
              scorePractical: 0,
              totalScore: 10,
              startedAt: "2026-06-10T12:00:00Z",
              completedAt: "2026-06-10T12:05:00Z",
              username: null,
              displayName: "Aluno Teste",
            },
          })
        }
        return baseFetch(request)
      }),
    )
    renderApp("/")

    fireEvent.click(await screen.findByRole("button", { name: "Início" }))
    fireEvent.click(await screen.findByRole("button", { name: /Avaliações/ }))

    expect(await screen.findByText("Prova de Informática")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Iniciar" }))

    fireEvent.click(await screen.findByLabelText("Dispositivo de entrada"))
    fireEvent.click(screen.getByRole("button", { name: "Finalizar prova" }))

    expect(await screen.findByText("Prova enviada!")).toBeInTheDocument()
    expect(screen.getByText("10")).toBeInTheDocument()
    expect(submitBody).toEqual({
      status: "completed",
      answers: [{ questionId: "q1", answerText: "Dispositivo de entrada" }],
    })
  })

  it("permite ao professor criar uma prova, adicionar questão e publicar", async () => {
    interface MockExam {
      id: string
      turmaId: string | null
      title: string
      description: string | null
      containerInitialState: null
      timeLimit: number
      isPublished: boolean
      active: boolean
      createdAt: string
      updatedAt: string
    }
    const exams: MockExam[] = []
    const questions: { id: string; examId: string; type: string; text: string; options: string[]; points: number; timeLimit: number; orderIndex: number }[] = []

    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        const url = request.url
        if (url.endsWith("/api/bootstrap/status")) {
          return jsonResponse({ needsBootstrap: false, requiresToken: false })
        }
        if (url.endsWith("/api/auth/me")) {
          return jsonResponse({ user: professorUser })
        }
        if (url.endsWith("/api/exams") && request.method === "POST") {
          const body = (await request.json()) as { title: string; timeLimit?: number }
          const exam: MockExam = {
            id: "exam-1",
            turmaId: null,
            title: body.title,
            description: null,
            containerInitialState: null,
            timeLimit: body.timeLimit ?? 0,
            isPublished: false,
            active: true,
            createdAt: "2026-06-10T12:00:00Z",
            updatedAt: "2026-06-10T12:00:00Z",
          }
          exams.push(exam)
          return jsonResponse({ exam }, 201)
        }
        if (url.endsWith("/api/exams")) {
          return jsonResponse({ exams })
        }
        if (url.endsWith("/api/exams/exam-1/questions") && request.method === "POST") {
          const body = (await request.json()) as { text: string; options: string[]; points: number }
          const question = {
            id: `q${questions.length + 1}`,
            examId: "exam-1",
            type: "mcq",
            text: body.text,
            options: body.options,
            points: body.points,
            timeLimit: 0,
            orderIndex: questions.length,
          }
          questions.push(question)
          return jsonResponse({ question }, 201)
        }
        if (url.endsWith("/api/exams/exam-1/publish") && request.method === "PATCH") {
          const body = (await request.json()) as { isPublished?: boolean }
          if (typeof body.isPublished === "boolean") exams[0].isPublished = body.isPublished
          return jsonResponse({ exam: exams[0] })
        }
        if (url.endsWith("/api/exams/exam-1")) {
          return jsonResponse({ exam: exams[0], questions })
        }
        throw new Error(`fetch inesperado: ${url}`)
      }),
    )
    renderApp("/")

    fireEvent.click(await screen.findByRole("button", { name: "Início" }))
    fireEvent.click(await screen.findByRole("button", { name: /Avaliações/ }))

    fireEvent.change(await screen.findByLabelText("Título da nova prova"), {
      target: { value: "Prova Nova" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Criar prova" }))

    // Após criar, entra direto no editor de questões.
    fireEvent.change(await screen.findByLabelText("Enunciado da questão"), {
      target: { value: "Quanto é 2+2?" },
    })
    fireEvent.change(screen.getByLabelText("Alternativa 1"), { target: { value: "4" } })
    fireEvent.change(screen.getByLabelText("Alternativa 2"), { target: { value: "5" } })
    fireEvent.click(screen.getByRole("button", { name: "Adicionar questão" }))

    expect(await screen.findByText(/Quanto é 2\+2\?/)).toBeInTheDocument()
    expect(screen.getByText(/2 alternativas · 10 pts/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "← Voltar" }))

    fireEvent.click(await screen.findByRole("button", { name: "Publicar" }))

    expect(await screen.findByText("Publicada")).toBeInTheDocument()
  })

  it("permite ao professor atribuir uma prova publicada aos alunos de uma turma", async () => {
    const exam = {
      id: "exam-1",
      turmaId: null,
      title: "Prova Publicada",
      description: null,
      containerInitialState: null,
      timeLimit: 0,
      isPublished: true,
      active: true,
      createdAt: "2026-06-10T12:00:00Z",
      updatedAt: "2026-06-10T12:00:00Z",
    }
    const turma = {
      id: "turma-1",
      nome: "Turma A",
      code: "ABC123",
      studentType: "normal",
      scheduleDays: ["seg"],
      scheduleStartTime: "08:00",
      scheduleEndTime: "10:00",
      descricao: "",
      active: true,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    }
    let assignBody: unknown = null

    mockAuthenticatedFetch((url) => {
      if (url.endsWith("/api/exams")) return jsonResponse({ exams: [exam] })
      if (url.endsWith("/api/turmas")) return jsonResponse({ turmas: [turma] })
      if (url.endsWith("/api/users")) {
        return jsonResponse({
          users: [
            { ...studentUser, id: "a1", username: "aluno1", displayName: "Aluno Um" },
            { ...studentUser, id: "a2", username: "aluno2", displayName: "Aluno Dois" },
            professorUser,
          ],
        })
      }
      return undefined
    })

    const baseFetch = globalThis.fetch
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        if (request.url.endsWith("/api/exams/assign-batch") && request.method === "POST") {
          assignBody = await request.json()
          return jsonResponse({
            success: true,
            application: {
              id: "b1",
              mode: "all",
              totalRequested: 2,
              totalCreated: 2,
              totalExisting: 0,
              totalSkipped: 0,
            },
          })
        }
        return baseFetch(request)
      }),
    )
    renderApp("/")

    fireEvent.click(await screen.findByRole("button", { name: "Início" }))
    fireEvent.click(await screen.findByRole("button", { name: /Avaliações/ }))

    fireEvent.click(await screen.findByRole("button", { name: "Atribuir" }))

    expect(await screen.findByText(/Aluno Um/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Selecionar todos" }))
    fireEvent.click(screen.getByRole("button", { name: "Atribuir a 2 aluno(s)" }))

    expect(await screen.findByText(/2 atribuída\(s\), 0 já existiam, 0 ignorada\(s\)\./)).toBeInTheDocument()
    expect(assignBody).toMatchObject({ mode: "all" })
    const assignments = (assignBody as { assignments: { examId: string; userId: string }[] }).assignments
    expect(assignments).toHaveLength(2)
    expect(assignments.map((item) => item.examId)).toEqual(["exam-1", "exam-1"])
    expect(new Set(assignments.map((item) => item.userId))).toEqual(new Set(["a1", "a2"]))
  })

  it("permite ao professor criar turma e usuário na Gestão Escolar", async () => {
    interface MockTurma {
      id: string
      nome: string
      code: string
      studentType: string
      scheduleDays: string[]
      scheduleStartTime: string
      scheduleEndTime: string
      descricao: string
      active: boolean
      createdAt: string
      updatedAt: string
    }
    const turmas: MockTurma[] = []
    const users = [professorUser]

    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        const url = request.url
        if (url.endsWith("/api/bootstrap/status")) {
          return jsonResponse({ needsBootstrap: false, requiresToken: false })
        }
        if (url.endsWith("/api/auth/me")) {
          return jsonResponse({ user: professorUser })
        }
        if (url.endsWith("/api/turmas") && request.method === "POST") {
          const body = (await request.json()) as { nome: string; studentType?: string }
          const turma: MockTurma = {
            id: "turma-9",
            nome: body.nome,
            code: "XYZ789",
            studentType: body.studentType ?? "normal",
            scheduleDays: ["seg"],
            scheduleStartTime: "08:00",
            scheduleEndTime: "10:00",
            descricao: "",
            active: true,
            createdAt: "2026-06-10T12:00:00Z",
            updatedAt: "2026-06-10T12:00:00Z",
          }
          turmas.push(turma)
          return jsonResponse({ turma }, 201)
        }
        if (url.endsWith("/api/turmas")) {
          return jsonResponse({ turmas })
        }
        if (url.endsWith("/api/users") && request.method === "POST") {
          const body = (await request.json()) as { username: string; displayName: string; role: string }
          const user = {
            ...studentUser,
            id: "novo-1",
            username: body.username,
            displayName: body.displayName,
            role: body.role,
          }
          users.push(user as typeof professorUser)
          return jsonResponse({ user }, 201)
        }
        if (url.endsWith("/api/users")) {
          return jsonResponse({ users })
        }
        throw new Error(`fetch inesperado: ${url}`)
      }),
    )
    renderApp("/")

    fireEvent.click(await screen.findByRole("button", { name: "Início" }))
    fireEvent.click(await screen.findByRole("button", { name: /Gestão Escolar/ }))

    // Aba Turmas: cria uma turma nova.
    fireEvent.click(await screen.findByRole("button", { name: "Turmas" }))
    fireEvent.change(await screen.findByLabelText("Nome da nova turma"), {
      target: { value: "Turma Nova" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Criar turma" }))

    expect(await screen.findByText("Turma Nova")).toBeInTheDocument()
    expect(screen.getByText(/código XYZ789/)).toBeInTheDocument()

    // Aba Usuários: cria um aluno na turma nova.
    fireEvent.click(screen.getByRole("button", { name: "Usuários" }))
    fireEvent.change(await screen.findByLabelText("Usuário"), { target: { value: "aluno.novo" } })
    fireEvent.change(screen.getByLabelText("Nome de exibição do novo usuário"), {
      target: { value: "Aluno Novo" },
    })
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "senha12345" } })
    fireEvent.click(screen.getByRole("button", { name: "Criar usuário" }))

    expect(await screen.findByText("Aluno Novo")).toBeInTheDocument()
  })

  it("permite ao professor ajustar os limites de digitação", async () => {
    let settings = {
      studentType: "normal",
      passMinWpm: 40,
      passMinAccuracy: 95,
      maxErrors: 7,
      updatedAt: null as string | null,
    }
    let putBody: unknown = null

    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        const url = request.url
        if (url.endsWith("/api/bootstrap/status")) {
          return jsonResponse({ needsBootstrap: false, requiresToken: false })
        }
        if (url.endsWith("/api/auth/me")) {
          return jsonResponse({ user: professorUser })
        }
        if (url.endsWith("/api/typing/settings/normal") && request.method === "PUT") {
          putBody = await request.json()
          settings = { ...settings, ...(putBody as object), updatedAt: "2026-06-10T12:00:00Z" }
          return jsonResponse({ settings })
        }
        if (url.endsWith("/api/typing/settings/normal")) {
          return jsonResponse({ settings })
        }
        throw new Error(`fetch inesperado: ${url}`)
      }),
    )
    renderApp("/")

    fireEvent.click(await screen.findByRole("button", { name: "Início" }))
    fireEvent.click(await screen.findByRole("button", { name: /^Digitação$/ }))

    fireEvent.click(await screen.findByRole("button", { name: /Limites/ }))

    const wpmInput = await screen.findByLabelText("PPM mínimo")
    expect(wpmInput).toHaveValue(40)

    fireEvent.change(wpmInput, { target: { value: "55" } })
    fireEvent.click(screen.getByRole("button", { name: "Salvar limites" }))

    expect(await screen.findByText(/Limites salvos/)).toBeInTheDocument()
    expect(putBody).toEqual({ passMinWpm: 55, passMinAccuracy: 95, maxErrors: 7 })
  })

  it("mostra o lobby do Duelo de Digitação e envia um desafio", async () => {
    let challengeBody: unknown = null
    mockAuthenticatedFetch((url) => {
      if (url.endsWith("/api/typing-pvp/lobby")) {
        return jsonResponse({
          players: [{ ...studentUser, id: "9", username: "colega", displayName: "Colega" }],
        })
      }
      return undefined
    }, studentUser)

    const baseFetch = globalThis.fetch
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        if (request.url.endsWith("/api/typing-pvp/challenge") && request.method === "POST") {
          challengeBody = await request.json()
          return jsonResponse({ success: true })
        }
        return baseFetch(request)
      }),
    )
    renderApp("/")

    fireEvent.click(await screen.findByRole("button", { name: "Início" }))
    fireEvent.click(await screen.findByRole("button", { name: /Duelo de Digitação/ }))

    expect(await screen.findByText(/Colega/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Desafiar" }))

    await waitFor(() => expect(challengeBody).toEqual({ targetId: "9" }))
  })

  it("abre o Navegador apontando para o proxy e navega por pesquisa", async () => {
    mockAuthenticatedFetch()
    renderApp("/")

    fireEvent.click(await screen.findByRole("button", { name: "Início" }))
    fireEvent.click(await screen.findByRole("button", { name: /Navegador/ }))

    const iframe = (await screen.findByTitle("Navegador")) as HTMLIFrameElement
    expect(iframe.src).toContain("/api/edge-proxy?url=")

    fireEvent.change(screen.getByLabelText("Endereço"), { target: { value: "gatos fofos" } })
    fireEvent.click(screen.getByRole("button", { name: "Ir" }))

    expect((screen.getByTitle("Navegador") as HTMLIFrameElement).src).toContain(
      encodeURIComponent("google.com/search?igu=1&q=gatos%20fofos"),
    )
  })

  it("gera uma imagem pelo Gerador de Imagens", async () => {
    let generateBody: unknown = null
    mockAuthenticatedFetch((url) => {
      if (url.endsWith("/api/imagegen/config")) {
        return jsonResponse({ provider: "worker", label: "Worker", configured: true })
      }
      return undefined
    })

    const baseFetch = globalThis.fetch
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        if (request.url.endsWith("/api/imagegen/generate") && request.method === "POST") {
          generateBody = await request.json()
          return jsonResponse({ image: "data:image/png;base64,abc123" })
        }
        return baseFetch(request)
      }),
    )
    renderApp("/")

    fireEvent.click(await screen.findByRole("button", { name: "Início" }))
    fireEvent.click(await screen.findByRole("button", { name: /Gerador de Imagens/ }))

    fireEvent.change(await screen.findByLabelText("Descrição da imagem"), {
      target: { value: "um gato astronauta" },
    })
    fireEvent.click(screen.getByRole("button", { name: "16:9" }))
    fireEvent.click(screen.getByRole("button", { name: "Gerar" }))

    const image = await screen.findByAltText("um gato astronauta")
    expect(image).toHaveAttribute("src", "data:image/png;base64,abc123")
    expect(generateBody).toEqual({ prompt: "um gato astronauta", aspect: "16:9" })
  })
})
