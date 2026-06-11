import { describe, expect, it } from "vitest"
import reducer, {
  closeWindow,
  constrainWindowGeometry,
  focusWindow,
  moveWindow,
  openWindow,
  resizeWindow,
  toggleMaximize,
  toggleMinimize,
} from "./windowsSlice"

const SIZE = { width: 400, height: 300 }

describe("windowsSlice", () => {
  it("abre uma nova janela com posição em cascata e foco no topo", () => {
    const state = reducer(undefined, openWindow("about", "Sobre", SIZE))

    expect(state.windows).toHaveLength(1)
    expect(state.windows[0]).toMatchObject({
      appId: "about",
      title: "Sobre",
      size: SIZE,
      minimized: false,
      maximized: false,
    })
  })

  it("reabrir o mesmo app foca a janela existente em vez de duplicar", () => {
    let state = reducer(undefined, openWindow("about", "Sobre", SIZE))
    const firstZIndex = state.windows[0].zIndex

    state = reducer(state, openWindow("about", "Sobre", SIZE))

    expect(state.windows).toHaveLength(1)
    expect(state.windows[0].zIndex).toBeGreaterThan(firstZIndex)
  })

  it("fecha a janela pelo id", () => {
    let state = reducer(undefined, openWindow("about", "Sobre", SIZE))
    const id = state.windows[0].id

    state = reducer(state, closeWindow(id))

    expect(state.windows).toHaveLength(0)
  })

  it("focar uma janela traz para frente e desminimiza", () => {
    let state = reducer(undefined, openWindow("about", "Sobre", SIZE))
    state = reducer(state, openWindow("settings", "Configurações", SIZE))
    const aboutId = state.windows[0].id
    state = reducer(state, toggleMinimize(aboutId))

    state = reducer(state, focusWindow(aboutId))

    const about = state.windows.find((win) => win.id === aboutId)!
    const settings = state.windows.find((win) => win.appId === "settings")!
    expect(about.minimized).toBe(false)
    expect(about.zIndex).toBeGreaterThan(settings.zIndex)
  })

  it("alterna minimizado e maximizado", () => {
    let state = reducer(undefined, openWindow("about", "Sobre", SIZE))
    const id = state.windows[0].id

    state = reducer(state, toggleMinimize(id))
    expect(state.windows[0].minimized).toBe(true)

    state = reducer(state, toggleMaximize(id))
    expect(state.windows[0].maximized).toBe(true)
  })

  it("move a janela para a posição informada", () => {
    let state = reducer(undefined, openWindow("about", "Sobre", SIZE))
    const id = state.windows[0].id

    state = reducer(state, moveWindow({ id, position: { x: 120, y: 64 } }))

    expect(state.windows[0].position).toEqual({ x: 120, y: 64 })
  })

  it("mantém a janela dentro da área útil ao mover", () => {
    let state = reducer(undefined, openWindow("about", "Sobre", SIZE))
    const id = state.windows[0].id

    state = reducer(state, moveWindow({ id, position: { x: 900, y: -20 }, workArea: { width: 800, height: 600 } }))

    expect(state.windows[0].position).toEqual({ x: 400, y: 0 })
  })

  it("redimensiona a janela respeitando tamanho mínimo e área útil", () => {
    let state = reducer(undefined, openWindow("about", "Sobre", SIZE))
    const id = state.windows[0].id

    state = reducer(
      state,
      resizeWindow({
        id,
        position: { x: -40, y: 500 },
        size: { width: 120, height: 900 },
        workArea: { width: 700, height: 600 },
      }),
    )

    expect(state.windows[0].position).toEqual({ x: 0, y: 0 })
    expect(state.windows[0].size).toEqual({ width: 300, height: 600 })
  })

  it("expõe o cálculo de geometria para o componente de janela", () => {
    expect(
      constrainWindowGeometry({ x: 640.4, y: 500.8 }, { width: 260, height: 180 }, { width: 800, height: 600 }),
    ).toEqual({
      position: { x: 500, y: 380 },
      size: { width: 300, height: 220 },
    })
  })
})
