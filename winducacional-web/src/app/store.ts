import { configureStore } from "@reduxjs/toolkit"
import { baseApi } from "@/api/baseApi"
import windowsReducer from "@/features/windows/windowsSlice"

export function createAppStore() {
  return configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      windows: windowsReducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
  })
}

export const store = createAppStore()

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
