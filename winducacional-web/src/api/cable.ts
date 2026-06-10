import { createConsumer, type Consumer } from "@rails/actioncable"

// Consumer único do ActionCable, autenticado pelo mesmo cookie de sessão
// HTTP-only dos controllers (ApplicationCable::Connection).
let consumer: Consumer | null = null

export function getCableConsumer(): Consumer | null {
  // jsdom (testes) não tem WebSocket utilizável; os apps continuam
  // funcionando via REST e apenas perdem o tempo real.
  if (typeof WebSocket === "undefined") return null
  consumer ??= createConsumer(`${window.location.origin.replace(/^http/, "ws")}/cable`)
  return consumer
}
