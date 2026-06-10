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

export const pvpApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getPvpLobby: build.query<{ players: User[] }, void>({
      query: () => "/typing-pvp/lobby",
      providesTags: ["PvpLobby"],
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
    pvpWin: build.mutation<{ success: boolean }, { winnerScore: number; loserScore: number }>({
      query: (body) => ({ url: "/typing-pvp/win", method: "POST", body }),
    }),
  }),
})

export const {
  useGetPvpLobbyQuery,
  usePvpChallengeMutation,
  usePvpAcceptMutation,
  usePvpRejectMutation,
  usePvpRandomMutation,
  usePvpCancelRandomMutation,
  usePvpSyncMutation,
  usePvpLeaveMutation,
  usePvpWinMutation,
} = pvpApi
