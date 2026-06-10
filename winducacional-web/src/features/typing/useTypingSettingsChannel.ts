import { useEffect } from "react"
import { getCableConsumer } from "@/api/cable"
import { useAppDispatch } from "@/app/hooks"
import type { StudentType } from "@/types/user"
import { typingApi, type TypingSettings } from "./typingApi"

interface TypingSettingsChannelPayload {
  event: "typing-settings"
  settings: TypingSettings
}

// Assina o TypingSettingsChannel: quando o professor salva os limites,
// alunos com a lição aberta recebem os novos valores na hora.
export function useTypingSettingsChannel(studentType: StudentType, enabled: boolean) {
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (!enabled) return
    const consumer = getCableConsumer()
    if (!consumer) return

    const subscription = consumer.subscriptions.create(
      { channel: "TypingSettingsChannel", student_type: studentType },
      {
        received: (payload: TypingSettingsChannelPayload) => {
          if (payload.event !== "typing-settings" || !payload.settings) return
          dispatch(
            typingApi.util.upsertQueryData("getTypingSettings", studentType, {
              settings: payload.settings,
            }),
          )
        },
      },
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [studentType, enabled, dispatch])
}
