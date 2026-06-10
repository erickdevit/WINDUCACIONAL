import { baseApi } from "@/api/baseApi"

// Espelha Exam#as_public_json (winducacional-api).
export interface Exam {
  id: string
  turmaId: string | null
  title: string
  description: string | null
  containerInitialState: unknown
  timeLimit: number
  isPublished: boolean
  active: boolean
  createdAt: string
  updatedAt: string
  // Presente apenas na listagem do aluno.
  submissionStatus?: "pending" | "in_progress" | "completed"
}

// Espelha ExamQuestion#as_public_json — alunos não recebem correctAnswer.
export interface ExamQuestion {
  id: string
  examId: string
  type: "mcq" | "practical"
  text: string
  options: string[] | null
  points: number
  timeLimit: number
  orderIndex: number
}

export interface ExamSubmission {
  id: string
  examId: string
  userId: string
  status: "in_progress" | "completed"
  scoreMcq: number
  scorePractical: number
  totalScore: number
  startedAt: string | null
  completedAt: string | null
  username: string | null
  displayName: string | null
}

export interface SubmitExamRequest {
  examId: string
  status: "in_progress" | "completed"
  answers: { questionId: string; answerText: string | null }[]
  practicalSnapshot?: unknown
}

export const examsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getExams: build.query<{ exams: Exam[] }, void>({
      query: () => "/exams",
      providesTags: ["Exams"],
    }),
    getExam: build.query<{ exam: Exam; questions: ExamQuestion[] }, string>({
      query: (examId) => `/exams/${examId}`,
    }),
    submitExam: build.mutation<{ submission: ExamSubmission }, SubmitExamRequest>({
      query: ({ examId, ...body }) => ({ url: `/exams/${examId}/submit`, method: "POST", body }),
      invalidatesTags: ["Exams", "ExamHistory"],
    }),
    getStudentHistory: build.query<{ submissions: (ExamSubmission & { examTitle: string })[] }, void>({
      query: () => "/exams/student/history",
      providesTags: ["ExamHistory"],
    }),
  }),
})

export const {
  useGetExamsQuery,
  useGetExamQuery,
  useSubmitExamMutation,
  useGetStudentHistoryQuery,
} = examsApi
