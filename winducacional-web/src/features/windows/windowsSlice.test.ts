import { describe, expect, it } from "vitest"
import reducer, {
  closeWindow,
  focusWindow,
  moveWindow,
  openWindow,
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
})
