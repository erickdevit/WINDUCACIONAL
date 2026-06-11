import { baseApi } from "@/api/baseApi"
import type { User } from "@/types/user"

export interface PvpSyncState {
  wordsCompleted: number
  wpm: number
}

export interface PvpMatchResult {
  roomId: string
  winnerId: string
  loserId: string
  winnerScore: number
  loserScore: number
}

export type PvpScoreScope = "turma" | "global"

export interface PvpScoreRow {
  id: string
  created_at: string
  winner_id: string | null
  winner_name: string | null
  winner_score: number
  loser_id: string | null
  loser_name: string | null
  loser_score: number
}

export const pvpApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getPvpLobby: build.query<{ players: User[] }, void>({
      query: () => "/typing-pvp/lobby",
      providesTags: ["PvpLobby"],
    }),
    getPvpScores: build.query<{ matches: PvpScoreRow[] }, { scope: PvpScoreScope; turmaId?: string }>({
      query: ({ scope, turmaId }) => ({
        url: "/typing-pvp/scores",
        params: { scope, ...(turmaId ? { turmaId } : {}) },
      }),
      providesTags: ["PvpScores"],
    }),
    pvpChallenge: build.mutation<{ success: boolean }, { targetId: string }>({
      query: (body) => ({ url: "/typing-pvp/challenge", method: "POST", body }),
    }),
    pvpAccept: build.mutation<{ success: boolean; roomId: string }, { challengerId: string }>({
      query: (body) => ({ url: "/typing-pvp/accept", method: "POST", body }),
    }),
    pvpReject: build.mutation<{ success: boolean }, { challengerId: string }>({
      query: (body) => ({ url: "/typing-pvp/reject", method: "POST", body }),
    }),
    pvpRandom: build.mutation<{ success: boolean; status?: string; roomId?: string }, void>({
      query: () => ({ url: "/typing-pvp/random", method: "POST" }),
    }),
    pvpCancelRandom: build.mutation<{ success: boolean }, void>({
      query: () => ({ url: "/typing-pvp/cancel-random", method: "POST" }),
    }),
    pvpSync: build.mutation<{ success: boolean }, { state: PvpSyncState }>({
      query: (body) => ({ url: "/typing-pvp/sync", method: "POST", body }),
    }),
    pvpLeave: build.mutation<{ success: boolean }, void>({
      query: () => ({ url: "/typing-pvp/leave", method: "POST" }),
    }),
    pvpWin: build.mutation<{ success: boolean }, void>({
      query: () => ({ url: "/typing-pvp/win", method: "POST" }),
      invalidatesTags: ["PvpScores"],
    }),
  }),
})

export const {
  useGetPvpLobbyQuery,
  useGetPvpScoresQuery,
  usePvpChallengeMutation,
  usePvpAcceptMutation,
  usePvpRejectMutation,
  usePvpRandomMutation,
  usePvpCancelRandomMutation,
  usePvpSyncMutation,
  usePvpLeaveMutation,
  usePvpWinMutation,
} = pvpApi
