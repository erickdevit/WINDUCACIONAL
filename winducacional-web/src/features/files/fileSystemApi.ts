import { baseApi } from "@/api/baseApi"
import type { FsTree } from "./types"

export const fileSystemApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getFsTree: build.query<{ tree: FsTree }, void>({
      query: () => "/fs/tree",
      providesTags: ["FsTree"],
    }),
    updateFsTree: build.mutation<void, { tree: FsTree }>({
      query: (body) => ({ url: "/fs/tree", method: "PUT", body }),
      invalidatesTags: ["FsTree"],
    }),
  }),
})

export const { useGetFsTreeQuery, useUpdateFsTreeMutation } = fileSystemApi
