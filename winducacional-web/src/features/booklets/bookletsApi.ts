import { baseApi } from "@/api/baseApi"

export interface BookletFile {
  id: string
  title: string
  fileName: string
  order: number
  size: number
  url: string
}

export interface BookletModule {
  id: string
  title: string
  folderName: string
  order: number
  totalFiles: number
  files: BookletFile[]
  globalEnabled: boolean
  studentEnabled: boolean
  enabled: boolean
}

export interface BookletsModulesResponse {
  modules: BookletModule[]
}

export interface BookletStudentAccess {
  id: string
  username: string
  displayName: string
  turmaId: string | null
  turmaNome: string
  moduleIds: string[]
}

export interface BookletStudentAccessResponse {
  students: BookletStudentAccess[]
}

export interface UpdateBookletStudentAccessRequest {
  turmaId?: string
  userIds: string[]
  moduleIds: string[]
}

export const bookletsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getBookletModules: build.query<BookletsModulesResponse, void>({
      query: () => "/booklets/modules",
      providesTags: ["BookletModules"],
    }),
    updateBookletAccess: build.mutation<BookletsModulesResponse, { enabledModuleIds: string[] }>({
      query: (body) => ({ url: "/booklets/modules/access", method: "PUT", body }),
      invalidatesTags: ["BookletModules"],
    }),
    getBookletStudentAccess: build.query<BookletStudentAccessResponse, { turmaId?: string } | void>({
      query: (params) => ({
        url: "/booklets/student-access",
        params: params?.turmaId ? { turmaId: params.turmaId } : undefined,
      }),
      providesTags: ["BookletStudentAccess"],
    }),
    updateBookletStudentAccess: build.mutation<BookletStudentAccessResponse, UpdateBookletStudentAccessRequest>({
      query: (body) => ({ url: "/booklets/student-access", method: "PUT", body }),
      invalidatesTags: ["BookletStudentAccess", "BookletModules"],
    }),
  }),
})

export const {
  useGetBookletModulesQuery,
  useUpdateBookletAccessMutation,
  useGetBookletStudentAccessQuery,
  useUpdateBookletStudentAccessMutation,
} = bookletsApi
