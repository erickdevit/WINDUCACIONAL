import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"

// Base RTK Query: todas as chamadas vão para /api (proxy do Vite em dev,
// mesmo domínio em produção) com cookies de sessão inclusos. A baseUrl é
// montada a partir de window.location.origin porque o construtor global
// `Request` (undici, usado pelo fetchBaseQuery) não aceita URLs relativas
// fora do navegador — origin + "/api" funciona em dev, produção e testes.
export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: `${window.location.origin}/api`,
    credentials: "include",
  }),
  tagTypes: [
    "User",
    "GestorSessions",
    "AttendanceSummary",
    "AttendanceMe",
    "BookletModules",
    "BookletStudentAccess",
    "FsTree",
    "TypingSettings",
    "TypingRanking",
    "ChatMessages",
    "Exams",
    "Exam",
    "ExamHistory",
    "Users",
    "Turmas",
    "PvpLobby",
    "PvpScores",
  ],
  endpoints: () => ({}),
})
