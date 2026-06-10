import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import type { RootState } from "@/app/store"

// Payload do NotificationBroadcaster (winducacional-api).
export interface AppNotification {
  id: string
  createdAt: string
  title: string
  body: string
  type?: string
  source?: string
}

interface NotificationsState {
  items: AppNotification[]
}

const initialState: NotificationsState = { items: [] }

const MAX_NOTIFICATIONS = 5

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    pushNotification(state, action: PayloadAction<AppNotification>) {
      if (state.items.some((item) => item.id === action.payload.id)) return
      state.items.push(action.payload)
      if (state.items.length > MAX_NOTIFICATIONS) state.items.shift()
    },
    dismissNotification(state, action: PayloadAction<string>) {
      state.items = state.items.filter((item) => item.id !== action.payload)
    },
  },
})

export const { pushNotification, dismissNotification } = notificationsSlice.actions

export const selectNotifications = (state: RootState) => state.notifications.items

export default notificationsSlice.reducer
