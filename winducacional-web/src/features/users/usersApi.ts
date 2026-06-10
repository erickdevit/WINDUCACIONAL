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

export interface CreateUserRequest {
  username: string
  displayName: string
  password: string
  role: "professor" | "secretaria" | "aluno"
  studentType?: "kids" | "normal"
  turmaId?: string | null
}

export interface UpdateUserRequest {
  id: string
  displayName?: string
  username?: string
  role?: "professor" | "secretaria" | "aluno"
  studentType?: "kids" | "normal"
  turmaId?: string | null
  active?: boolean
  password?: string
}

export interface CreateTurmaRequest {
  nome: string
  studentType?: "kids" | "normal"
  descricao?: string
}

export const usersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getUsers: build.query<{ users: User[] }, void>({
      query: () => "/users",
      providesTags: ["Users"],
    }),
    createUser: build.mutation<{ user: User }, CreateUserRequest>({
      query: (body) => ({ url: "/users", method: "POST", body }),
      invalidatesTags: ["Users"],
    }),
    updateUser: build.mutation<{ user: User }, UpdateUserRequest>({
      query: ({ id, ...body }) => ({ url: `/users/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Users"],
    }),
    getTurmas: build.query<{ turmas: Turma[] }, void>({
      query: () => "/turmas",
      providesTags: ["Turmas"],
    }),
    createTurma: build.mutation<{ turma: Turma }, CreateTurmaRequest>({
      query: (body) => ({ url: "/turmas", method: "POST", body }),
      invalidatesTags: ["Turmas"],
    }),
    updateTurma: build.mutation<{ turma: Turma }, { id: string; nome?: string; active?: boolean }>({
      query: ({ id, ...body }) => ({ url: `/turmas/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Turmas"],
    }),
    deleteTurma: build.mutation<void, string>({
      query: (id) => ({ url: `/turmas/${id}`, method: "DELETE" }),
      invalidatesTags: ["Turmas", "Users"],
    }),
  }),
})

export const {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useGetTurmasQuery,
  useCreateTurmaMutation,
  useUpdateTurmaMutation,
  useDeleteTurmaMutation,
} = usersApi
