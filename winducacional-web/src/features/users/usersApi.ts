import { baseApi } from "@/api/baseApi"
import type { User } from "@/types/user"

// Espelha Turma#as_public_json (winducacional-api).
export interface Turma {
  id: string
  nome: string
  code: string
  studentType: "kids" | "normal"
  scheduleDays: string[]
  scheduleStartTime: string
  scheduleEndTime: string
  descricao: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export const usersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getUsers: build.query<{ users: User[] }, void>({
      query: () => "/users",
      providesTags: ["Users"],
    }),
    getTurmas: build.query<{ turmas: Turma[] }, void>({
      query: () => "/turmas",
      providesTags: ["Turmas"],
    }),
  }),
})

export const { useGetUsersQuery, useGetTurmasQuery } = usersApi
