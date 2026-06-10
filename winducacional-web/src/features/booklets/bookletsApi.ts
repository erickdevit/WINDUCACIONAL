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
  }),
})

export const { useGetBookletModulesQuery, useUpdateBookletAccessMutation } = bookletsApi
