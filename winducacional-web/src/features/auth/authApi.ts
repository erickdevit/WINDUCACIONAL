import { baseApi } from "@/api/baseApi"
import type { User } from "@/types/user"

interface UserResponse {
  user: User
}

interface LoginRequest {
  username: string
  password: string
}

interface RegisterRequest {
  username: string
  displayName: string
  password: string
  turmaCode: string
}

interface UpdateDisplayNameRequest {
  displayName: string
}

interface BootstrapStatusResponse {
  needsBootstrap: boolean
  requiresToken: boolean
}

interface BootstrapRequest {
  username: string
  displayName: string
  password: string
  token?: string
}

// Espelha winducacional-api/app/controllers/api/auth_controller.rb
export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMe: builder.query<UserResponse, void>({
      query: () => "auth/me",
      providesTags: ["User"],
    }),
    login: builder.mutation<UserResponse, LoginRequest>({
      query: (body) => ({ url: "auth/login", method: "POST", body }),
      invalidatesTags: ["User"],
    }),
    register: builder.mutation<UserResponse, RegisterRequest>({
      query: (body) => ({ url: "auth/register", method: "POST", body }),
      invalidatesTags: ["User"],
    }),
    logout: builder.mutation<void, void>({
      query: () => ({ url: "auth/logout", method: "POST" }),
      invalidatesTags: ["User"],
    }),
    updateDisplayName: builder.mutation<UserResponse, UpdateDisplayNameRequest>({
      query: (body) => ({ url: "auth/me/display-name", method: "PATCH", body }),
      invalidatesTags: ["User"],
    }),
    getBootstrapStatus: builder.query<BootstrapStatusResponse, void>({
      query: () => "bootstrap/status",
    }),
    bootstrap: builder.mutation<UserResponse, BootstrapRequest>({
      query: (body) => ({ url: "bootstrap", method: "POST", body }),
      invalidatesTags: ["User"],
    }),
  }),
})

export const {
  useGetMeQuery,
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useUpdateDisplayNameMutation,
  useGetBootstrapStatusQuery,
  useBootstrapMutation,
} = authApi
