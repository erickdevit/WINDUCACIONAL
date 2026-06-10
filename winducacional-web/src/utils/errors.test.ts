import { describe, expect, it } from "vitest"
import { getApiErrorMessage } from "./errors"

describe("getApiErrorMessage", () => {
  it("retorna a mensagem padrão quando não há erro", () => {
    expect(getApiErrorMessage(undefined, "Falha.")).toBe("Falha.")
  })

  it("extrai a mensagem em pt-BR do corpo da resposta da API", () => {
    const error = { status: 401, data: { error: "Usuário ou senha inválidos." } }
    expect(getApiErrorMessage(error, "Falha.")).toBe("Usuário ou senha inválidos.")
  })

  it("usa a mensagem padrão quando a API responde sem campo error", () => {
    const error = { status: 500, data: {} }
    expect(getApiErrorMessage(error, "Falha.")).toBe("Falha.")
  })

  it("usa a mensagem do erro serializado quando não há resposta HTTP", () => {
    const error = { name: "Error", message: "Failed to fetch" }
    expect(getApiErrorMessage(error, "Falha.")).toBe("Failed to fetch")
  })
})
