import { useEffect } from "react"
import { getCableConsumer } from "@/api/cable"
import { useAppDispatch } from "@/app/hooks"
import { appendIncomingMessage, type ChatMessage } from "./chatApi"

// Assina o ChatChannel (ActionCable) da thread e injeta as mensagens
// recebidas no cache do RTK Query — substitui o SSE do legado.
export function useChatChannel(threadId: string | null) {
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (!threadId) return
    const consumer = getCableConsumer()
    if (!consumer) return

    const subscription = consumer.subscriptions.create(
      { channel: "ChatChannel", thread_id: threadId },
      {
        received: (message: ChatMessage) => {
          dispatch(appendIncomingMessage(threadId, message))
        },
      },
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [threadId, dispatch])
}
