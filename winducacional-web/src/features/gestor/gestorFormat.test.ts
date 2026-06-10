import { describe, expect, it } from "vitest"
import { formatDateTimeBR, groupSessionsByTurma } from "./gestorFormat"

describe("formatDateTimeBR", () => {
  it("formata data e hora ISO no padrão pt-BR e fuso de São Paulo", () => {
    expect(formatDateTimeBR("2026-06-10T12:30:00Z")).toBe("10/06/2026, 09:30")
  })
})

describe("groupSessionsByTurma", () => {
  it("agrupa sessões pela turma preservando a ordem de chegada", () => {
    const sessions = [
      { turmaId: "t1", turmaNome: "Turma A", username: "ana" },
      { turmaId: "t2", turmaNome: "Turma B", username: "bia" },
      { turmaId: "t1", turmaNome: "Turma A", username: "caio" },
    ]

    const groups = groupSessionsByTurma(sessions)

    expect(groups).toEqual([
      { turmaId: "t1", turmaNome: "Turma A", sessions: [sessions[0], sessions[2]] },
      { turmaId: "t2", turmaNome: "Turma B", sessions: [sessions[1]] },
    ])
  })

  it("agrupa alunos sem turma sob 'Sem turma'", () => {
    const sessions = [{ turmaId: null, turmaNome: null, username: "duda" }]

    const groups = groupSessionsByTurma(sessions)

    expect(groups).toEqual([{ turmaId: null, turmaNome: "Sem turma", sessions: [sessions[0]] }])
  })
})
