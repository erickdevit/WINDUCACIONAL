import { useEffect } from "react"
import { getCableConsumer } from "@/api/cable"
import { useAppDispatch } from "@/app/hooks"
import { baseApi } from "@/api/baseApi"
import { pushNotification, type AppNotification } from "./notificationsSlice"

interface NotificationsChannelPayload {
  notification: AppNotification
}

// Assina o NotificationsChannel do usuário logado: exibe toasts e trata o
// force_logout disparado pelo Gestor de Sessões (invalida a sessão local).
export function useNotificationsChannel(enabled: boolean) {
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (!enabled) return
    const consumer = getCableConsumer()
    if (!consumer) return

    const subscription = consumer.subscriptions.create(
      { channel: "NotificationsChannel" },
      {
        received: (payload: NotificationsChannelPayload) => {
          const notification = payload.notification
          if (!notification) return

          dispatch(pushNotification(notification))

          if (notification.type === "force_logout") {
            // A sessão já foi removida no servidor; basta limpar o cache
            // para o roteador redirecionar à tela de login.
            dispatch(baseApi.util.resetApiState())
          }
        },
      },
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [enabled, dispatch])
}
