import { describe, expect, it } from "vitest"
import { formatDateBR, formatTimeBR } from "./attendanceFormat"

describe("attendanceFormat", () => {
  it("formata data ISO para o padrão dd/mm/aaaa", () => {
    expect(formatDateBR("2026-06-10")).toBe("10/06/2026")
  })

  it("formata horário ISO para HH:MM no fuso de São Paulo", () => {
    expect(formatTimeBR("2026-06-10T12:30:00Z")).toBe("09:30")
  })

  it("retorna travessão quando o horário é nulo", () => {
    expect(formatTimeBR(null)).toBe("—")
  })
})
