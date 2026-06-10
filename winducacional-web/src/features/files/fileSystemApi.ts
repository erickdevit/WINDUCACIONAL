import { baseApi } from "@/api/baseApi"
import type { FsTree } from "./types"

export const fileSystemApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getFsTree: build.query<{ tree: FsTree }, void>({
      query: () => "/fs/tree",
    }),
  }),
})

export const { useGetFsTreeQuery } = fileSystemApi
