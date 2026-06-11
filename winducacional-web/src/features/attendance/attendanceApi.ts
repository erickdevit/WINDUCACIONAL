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

export interface AttendanceSummaryStudent {
  id: string
  username: string
  displayName: string
  turmaId: string | null
  turmaNome: string
  presentDays: number
  absentDays: number
  attendanceRate: number
  lastLoginAt: string | null
  records: AttendanceRecord[]
}

export interface AttendanceSummaryDay {
  date: string
  expected: number
  present: number
  absent: number
  attendanceRate: number
}

export interface AttendanceSummaryResponse {
  range: {
    startDate: string
    endDate: string
    totalDays: number
  }
  totals: {
    students: number
    presences: number
    absences: number
    attendanceRate: number
  }
  students: AttendanceSummaryStudent[]
  daily: AttendanceSummaryDay[]
  records: AttendanceRecord[]
}

export interface AttendanceSummaryParams {
  startDate?: string
  endDate?: string
  turmaId?: string
}

export interface RegisterAttendanceRequest {
  date: string
  turmaId: string
  students: {
    id: string
    isPresent: boolean
  }[]
}

export const attendanceApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMyAttendance: build.query<AttendanceMeResponse, void>({
      query: () => "/attendance/me",
      providesTags: ["AttendanceMe"],
    }),
    getAttendanceSummary: build.query<AttendanceSummaryResponse, AttendanceSummaryParams | void>({
      query: (params) => ({
        url: "/attendance/summary",
        params: {
          ...(params?.startDate ? { startDate: params.startDate } : {}),
          ...(params?.endDate ? { endDate: params.endDate } : {}),
          ...(params?.turmaId ? { turmaId: params.turmaId } : {}),
        },
      }),
      providesTags: ["AttendanceSummary"],
    }),
    registerAttendance: build.mutation<void, RegisterAttendanceRequest>({
      query: (body) => ({ url: "/attendance/register", method: "POST", body }),
      invalidatesTags: ["AttendanceSummary", "AttendanceMe"],
    }),
  }),
})

export const { useGetMyAttendanceQuery, useGetAttendanceSummaryQuery, useRegisterAttendanceMutation } = attendanceApi
