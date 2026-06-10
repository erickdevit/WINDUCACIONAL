import { baseApi } from "@/api/baseApi"

export interface AttendanceRecord {
  id: string
  userId: string
  attendanceDate: string
  firstLoginAt: string | null
  lastLoginAt: string | null
  loginCount: number
  username: string
  displayName: string
  turmaId: string | null
  turmaNome: string
  classType: string | null
}

export interface AttendanceMeResponse {
  today: string
  todayRecord: AttendanceRecord | null
  records: AttendanceRecord[]
}

export const attendanceApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMyAttendance: build.query<AttendanceMeResponse, void>({
      query: () => "/attendance/me",
    }),
  }),
})

export const { useGetMyAttendanceQuery } = attendanceApi
