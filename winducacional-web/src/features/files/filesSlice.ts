import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import type { RootState } from "@/app/store"

interface FilesState {
  history: string[][]
  historyIndex: number
}

const initialState: FilesState = {
  history: [["C:"]],
  historyIndex: 0,
}

const filesSlice = createSlice({
  name: "files",
  initialState,
  reducers: {
    navigateTo(state, action: PayloadAction<string[]>) {
      const current = state.history[state.historyIndex]
      if (pathsEqual(current, action.payload)) return

      state.history = [...state.history.slice(0, state.historyIndex + 1), action.payload]
      state.historyIndex = state.history.length - 1
    },
    goBack(state) {
      if (state.historyIndex > 0) state.historyIndex -= 1
    },
    goForward(state) {
      if (state.historyIndex < state.history.length - 1) state.historyIndex += 1
    },
    goUp(state) {
      const current = state.history[state.historyIndex]
      if (current.length <= 1) return

      const parent = current.slice(0, -1)
      state.history = [...state.history.slice(0, state.historyIndex + 1), parent]
      state.historyIndex = state.history.length - 1
    },
  },
})

function pathsEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((segment, index) => segment === b[index])
}

export const { navigateTo, goBack, goForward, goUp } = filesSlice.actions

export const selectCurrentPath = (state: RootState) => state.files.history[state.files.historyIndex]
export const selectCanGoBack = (state: RootState) => state.files.historyIndex > 0
export const selectCanGoForward = (state: RootState) => state.files.historyIndex < state.files.history.length - 1
export const selectCanGoUp = (state: RootState) => state.files.history[state.files.historyIndex].length > 1

export default filesSlice.reducer
