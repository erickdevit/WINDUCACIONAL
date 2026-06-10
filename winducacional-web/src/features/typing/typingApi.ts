import { baseApi } from "@/api/baseApi"
import type { StudentType } from "@/types/user"

// Espelha TypingSetting#as_public_json (winducacional-api).
export interface TypingSettings {
  studentType: StudentType
  passMinWpm: number
  passMinAccuracy: number
  maxErrors: number
  updatedAt: string | null
}

// Linhas da view SQL typing_ranking (chaves snake_case como no Node).
export interface TypingRankingRow {
  name: string
  lessons_completed: number
  points: number
  best_wpm: number
  best_accuracy: number
  best_time: number
}

export interface SaveScoreRequest {
  lessonId: number
  wpm: number
  accuracy: number
  timeMs: number
}

export const typingApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getTypingSettings: build.query<{ settings: TypingSettings }, StudentType>({
      query: (studentType) => `/typing/settings/${studentType}`,
      providesTags: ["TypingSettings"],
    }),
    updateTypingSettings: build.mutation<
      { settings: TypingSettings },
      { studentType: StudentType; passMinWpm: number; passMinAccuracy: number; maxErrors: number }
    >({
      query: ({ studentType, ...body }) => ({
        url: `/typing/settings/${studentType}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["TypingSettings"],
    }),
    saveTypingScore: build.mutation<{ ok: boolean }, SaveScoreRequest>({
      query: (body) => ({ url: "/typing/score", method: "POST", body }),
      invalidatesTags: ["TypingRanking"],
    }),
    getTypingRankingGlobal: build.query<{ ranking: TypingRankingRow[] }, void>({
      query: () => "/typing/ranking/global",
      providesTags: ["TypingRanking"],
    }),
    getTypingRankingTurma: build.query<{ ranking: TypingRankingRow[] }, void>({
      query: () => "/typing/ranking/turma",
      providesTags: ["TypingRanking"],
    }),
  }),
})

export const {
  useGetTypingSettingsQuery,
  useUpdateTypingSettingsMutation,
  useSaveTypingScoreMutation,
  useGetTypingRankingGlobalQuery,
  useGetTypingRankingTurmaQuery,
} = typingApi
