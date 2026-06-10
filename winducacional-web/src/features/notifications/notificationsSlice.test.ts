import { describe, expect, it } from "vitest"
import reducer, { dismissNotification, pushNotification } from "./notificationsSlice"

function notification(id: string) {
  return { id, createdAt: "2026-06-10T12:00:00Z", title: `Título ${id}`, body: "Corpo" }
}

describe("notificationsSlice", () => {
  it("adiciona notificações ignorando ids duplicados", () => {
    let state = reducer(undefined, pushNotification(notification("n1")))
    state = reducer(state, pushNotification(notification("n1")))

    expect(state.items).toHaveLength(1)
  })

  it("mantém no máximo 5 notificações, descartando a mais antiga", () => {
    let state = reducer(undefined, pushNotification(notification("n1")))
    for (let i = 2; i <= 6; i++) {
      state = reducer(state, pushNotification(notification(`n${i}`)))
    }

    expect(state.items).toHaveLength(5)
    expect(state.items[0].id).toBe("n2")
    expect(state.items[4].id).toBe("n6")
  })

  it("dispensa notificação pelo id", () => {
    let state = reducer(undefined, pushNotification(notification("n1")))
    state = reducer(state, dismissNotification("n1"))

    expect(state.items).toHaveLength(0)
  })
})
