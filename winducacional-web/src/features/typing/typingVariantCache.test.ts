import { describe, expect, it, vi } from "vitest"
import { bumpVariant, loadVariantMap, parseVariantMap, variantStorageKey } from "./typingVariantCache"

function memoryStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial))
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => store.set(key, value)),
    read: (key: string) => store.get(key) ?? null,
  }
}

describe("parseVariantMap", () => {
  it("aceita apenas contadores numéricos finitos e não negativos", () => {
    expect(
      parseVariantMap(
        JSON.stringify({
          1: 2,
          2: "3",
          3: -1,
          4: null,
          5: "texto",
          6: Number.POSITIVE_INFINITY,
          7: 1.8,
        }),
      ),
    ).toEqual({ 1: 2, 2: 3, 7: 1 })
  })

  it("retorna mapa vazio para JSON inválido, arrays e objetos nulos", () => {
    expect(parseVariantMap("{")).toEqual({})
    expect(parseVariantMap("[]")).toEqual({})
    expect(parseVariantMap("null")).toEqual({})
  })

  it("limita valores absurdos para evitar crescimento sem controle", () => {
    expect(parseVariantMap(JSON.stringify({ 1: 9_999_999 }))).toEqual({ 1: 1_000_000 })
  })
})

describe("loadVariantMap", () => {
  it("lê o cache validado a partir da chave do usuário", () => {
    const username = "ana"
    const storage = memoryStorage({ [variantStorageKey(username)]: JSON.stringify({ 10: 4 }) })

    expect(loadVariantMap(username, storage)).toEqual({ 10: 4 })
  })

  it("retorna mapa vazio quando a leitura do storage falha", () => {
    const storage = {
      getItem: vi.fn(() => {
        throw new Error("storage indisponível")
      }),
      setItem: vi.fn(),
    }

    expect(loadVariantMap("ana", storage)).toEqual({})
  })
})

describe("bumpVariant", () => {
  it("incrementa a variante da lição e persiste JSON sanitizado", () => {
    const username = "ana"
    const key = variantStorageKey(username)
    const storage = memoryStorage({ [key]: JSON.stringify({ 1: 2, 2: "inválido" }) })

    bumpVariant(username, 1, storage)

    expect(JSON.parse(storage.read(key) ?? "{}")).toEqual({ 1: 3 })
  })

  it("ignora falha de escrita porque o cache é apenas conveniência visual", () => {
    const storage = {
      getItem: vi.fn(() => JSON.stringify({ 1: 2 })),
      setItem: vi.fn(() => {
        throw new Error("quota excedida")
      }),
    }

    expect(() => bumpVariant("ana", 1, storage)).not.toThrow()
  })
})
