import { baseApi } from "@/api/baseApi"

export interface GestorSession {
  sessionId: string
  loginAt: string
  userId: string
  username: string
  displayName: string
  turmaId: string | null
  turmaNome: string | null
}

export interface GestorSessionsResponse {
  sessions: GestorSession[]
}

export type LogoutTarget =
  | { target: "all" }
  | { target: "turma"; turmaId: string }
  | { target: "user"; userId: string }

export const gestorApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getGestorSessions: build.query<GestorSessionsResponse, void>({
      query: () => "/gestor/sessions",
      providesTags: ["GestorSessions"],
    }),
    logoutGestorSessions: build.mutation<void, LogoutTarget>({
      query: (body) => ({ url: "/gestor/sessions/logout", method: "POST", body }),
      invalidatesTags: ["GestorSessions"],
    }),
  }),
})

export const { useGetGestorSessionsQuery, useLogoutGestorSessionsMutation } = gestorApi
