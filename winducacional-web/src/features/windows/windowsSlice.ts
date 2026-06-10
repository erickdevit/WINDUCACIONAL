import { createSlice, nanoid, type PayloadAction } from "@reduxjs/toolkit"
import type { RootState } from "@/app/store"

export interface WindowPosition {
  x: number
  y: number
}

export interface WindowSize {
  width: number
  height: number
}

export interface AppWindowState {
  id: string
  appId: string
  title: string
  position: WindowPosition
  size: WindowSize
  zIndex: number
  minimized: boolean
  maximized: boolean
}

interface WindowsState {
  windows: AppWindowState[]
  nextZIndex: number
}

const initialState: WindowsState = {
  windows: [],
  nextZIndex: 1,
}

// Deslocamento em cascata para janelas novas não abrirem todas no mesmo lugar.
const CASCADE_STEP = 24
const CASCADE_LIMIT = 8
const INITIAL_POSITION: WindowPosition = { x: 80, y: 48 }

const windowsSlice = createSlice({
  name: "windows",
  initialState,
  reducers: {
    openWindow: {
      reducer(
        state,
        action: PayloadAction<{ id: string; appId: string; title: string; size: WindowSize }>,
      ) {
        const existing = state.windows.find((win) => win.appId === action.payload.appId)
        if (existing) {
          existing.minimized = false
          existing.zIndex = state.nextZIndex++
          return
        }

        const offset = (state.windows.length % CASCADE_LIMIT) * CASCADE_STEP
        state.windows.push({
          id: action.payload.id,
          appId: action.payload.appId,
          title: action.payload.title,
          position: { x: INITIAL_POSITION.x + offset, y: INITIAL_POSITION.y + offset },
          size: action.payload.size,
          zIndex: state.nextZIndex++,
          minimized: false,
          maximized: false,
        })
      },
      prepare(appId: string, title: string, size: WindowSize) {
        return { payload: { id: nanoid(), appId, title, size } }
      },
    },
    closeWindow(state, action: PayloadAction<string>) {
      state.windows = state.windows.filter((win) => win.id !== action.payload)
    },
    focusWindow(state, action: PayloadAction<string>) {
      const win = state.windows.find((win) => win.id === action.payload)
      if (!win) return
      win.zIndex = state.nextZIndex++
      win.minimized = false
    },
    toggleMinimize(state, action: PayloadAction<string>) {
      const win = state.windows.find((win) => win.id === action.payload)
      if (win) win.minimized = !win.minimized
    },
    toggleMaximize(state, action: PayloadAction<string>) {
      const win = state.windows.find((win) => win.id === action.payload)
      if (win) win.maximized = !win.maximized
    },
    moveWindow(state, action: PayloadAction<{ id: string; position: WindowPosition }>) {
      const win = state.windows.find((win) => win.id === action.payload.id)
      if (win) win.position = action.payload.position
    },
  },
})

export const { openWindow, closeWindow, focusWindow, toggleMinimize, toggleMaximize, moveWindow } =
  windowsSlice.actions

export const selectWindows = (state: RootState) => state.windows.windows

export default windowsSlice.reducer
