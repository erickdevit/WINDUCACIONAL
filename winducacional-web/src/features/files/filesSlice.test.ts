import { describe, expect, it } from "vitest"
import reducer, {
  goBack,
  goForward,
  goUp,
  navigateTo,
  selectCanGoBack,
  selectCanGoForward,
  selectCanGoUp,
  selectCurrentPath,
} from "./filesSlice"
import type { RootState } from "@/app/store"

function wrap(files: ReturnType<typeof reducer>) {
  return { files } as unknown as RootState
}

describe("filesSlice", () => {
  it("inicia na raiz da unidade C:", () => {
    const state = reducer(undefined, { type: "@@INIT" })

    expect(selectCurrentPath(wrap(state))).toEqual(["C:"])
    expect(selectCanGoBack(wrap(state))).toBe(false)
    expect(selectCanGoForward(wrap(state))).toBe(false)
    expect(selectCanGoUp(wrap(state))).toBe(false)
  })

  it("navega para um novo caminho e habilita voltar", () => {
    let state = reducer(undefined, { type: "@@INIT" })
    state = reducer(state, navigateTo(["C:", "Users"]))

    expect(selectCurrentPath(wrap(state))).toEqual(["C:", "Users"])
    expect(selectCanGoBack(wrap(state))).toBe(true)
    expect(selectCanGoUp(wrap(state))).toBe(true)
  })

  it("navegar para o mesmo caminho não duplica histórico", () => {
    let state = reducer(undefined, { type: "@@INIT" })
    state = reducer(state, navigateTo(["C:", "Users"]))
    state = reducer(state, navigateTo(["C:", "Users"]))

    expect(state.history).toHaveLength(2)
  })

  it("voltar e avançar navegam pelo histórico", () => {
    let state = reducer(undefined, { type: "@@INIT" })
    state = reducer(state, navigateTo(["C:", "Users"]))
    state = reducer(state, navigateTo(["C:", "Users", "professor"]))

    state = reducer(state, goBack())
    expect(selectCurrentPath(wrap(state))).toEqual(["C:", "Users"])
    expect(selectCanGoForward(wrap(state))).toBe(true)

    state = reducer(state, goForward())
    expect(selectCurrentPath(wrap(state))).toEqual(["C:", "Users", "professor"])
  })

  it("navegar após voltar descarta o histórico futuro", () => {
    let state = reducer(undefined, { type: "@@INIT" })
    state = reducer(state, navigateTo(["C:", "Users"]))
    state = reducer(state, navigateTo(["C:", "Users", "professor"]))
    state = reducer(state, goBack())
    state = reducer(state, navigateTo(["C:", "Programas"]))

    expect(state.history).toEqual([["C:"], ["C:", "Users"], ["C:", "Programas"]])
    expect(selectCanGoForward(wrap(state))).toBe(false)
  })

  it("subir um nível remove o último segmento do caminho", () => {
    let state = reducer(undefined, { type: "@@INIT" })
    state = reducer(state, navigateTo(["C:", "Users", "professor", "Documents"]))
    state = reducer(state, goUp())

    expect(selectCurrentPath(wrap(state))).toEqual(["C:", "Users", "professor"])
  })

  it("subir na raiz da unidade não faz nada", () => {
    const state = reducer(reducer(undefined, { type: "@@INIT" }), goUp())

    expect(selectCurrentPath(wrap(state))).toEqual(["C:"])
  })

  it("voltar no início do histórico não faz nada", () => {
    const state = reducer(reducer(undefined, { type: "@@INIT" }), goBack())

    expect(selectCurrentPath(wrap(state))).toEqual(["C:"])
  })
})
