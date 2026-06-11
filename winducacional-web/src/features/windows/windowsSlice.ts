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

export interface WindowGeometry {
  position: WindowPosition
  size: WindowSize
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
  // Dados de abertura específicos do app, ex.: caminho do arquivo para o Bloco de Notas.
  payload?: unknown
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
export const MIN_WINDOW_SIZE: WindowSize = { width: 300, height: 220 }

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function constrainWindowGeometry(
  position: WindowPosition,
  size: WindowSize,
  workArea?: WindowSize,
): WindowGeometry {
  const maxWidth = workArea ? Math.max(MIN_WINDOW_SIZE.width, workArea.width) : Number.POSITIVE_INFINITY
  const maxHeight = workArea ? Math.max(MIN_WINDOW_SIZE.height, workArea.height) : Number.POSITIVE_INFINITY
  const width = clamp(Math.round(size.width), MIN_WINDOW_SIZE.width, maxWidth)
  const height = clamp(Math.round(size.height), MIN_WINDOW_SIZE.height, maxHeight)

  if (!workArea) {
    return {
      position: { x: Math.round(position.x), y: Math.max(0, Math.round(position.y)) },
      size: { width, height },
    }
  }

  return {
    position: {
      x: clamp(Math.round(position.x), 0, Math.max(0, workArea.width - width)),
      y: clamp(Math.round(position.y), 0, Math.max(0, workArea.height - height)),
    },
    size: { width, height },
  }
}

const windowsSlice = createSlice({
  name: "windows",
  initialState,
  reducers: {
    openWindow: {
      reducer(
        state,
        action: PayloadAction<{ id: string; appId: string; title: string; size: WindowSize; payload?: unknown }>,
      ) {
        const existing = state.windows.find((win) => win.appId === action.payload.appId)
        if (existing) {
          existing.minimized = false
          existing.zIndex = state.nextZIndex++
          existing.title = action.payload.title
          if (action.payload.payload !== undefined) existing.payload = action.payload.payload
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
          payload: action.payload.payload,
        })
      },
      prepare(appId: string, title: string, size: WindowSize, payload?: unknown) {
        return { payload: { id: nanoid(), appId, title, size, payload } }
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
    moveWindow(state, action: PayloadAction<{ id: string; position: WindowPosition; workArea?: WindowSize }>) {
      const win = state.windows.find((win) => win.id === action.payload.id)
      if (!win) return
      win.position = constrainWindowGeometry(action.payload.position, win.size, action.payload.workArea).position
    },
    resizeWindow(state, action: PayloadAction<{ id: string; position: WindowPosition; size: WindowSize; workArea?: WindowSize }>) {
      const win = state.windows.find((win) => win.id === action.payload.id)
      if (!win) return
      const geometry = constrainWindowGeometry(action.payload.position, action.payload.size, action.payload.workArea)
      win.position = geometry.position
      win.size = geometry.size
    },
  },
})

export const { openWindow, closeWindow, focusWindow, toggleMinimize, toggleMaximize, moveWindow, resizeWindow } =
  windowsSlice.actions

export const selectWindows = (state: RootState) => state.windows.windows

export default windowsSlice.reducer
