import { baseApi } from "@/api/baseApi"

export type ImagegenAspect = "1:1" | "16:9" | "9:16" | "4:3" | "3:4"

export interface ImagegenConfig {
  provider: string
  label: string
  configured: boolean
}

export const imagegenApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getImagegenConfig: build.query<ImagegenConfig, void>({
      query: () => "/imagegen/config",
    }),
    generateImage: build.mutation<{ image: string }, { prompt: string; aspect: ImagegenAspect }>({
      query: (body) => ({ url: "/imagegen/generate", method: "POST", body }),
    }),
  }),
})

export const { useGetImagegenConfigQuery, useGenerateImageMutation } = imagegenApi
