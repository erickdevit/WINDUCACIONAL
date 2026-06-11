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

// Shape completo visto por professor/secretaria (as_public_json_full).
export interface ExamQuestionFull extends ExamQuestion {
  correctAnswer: string | null
  validationRules: unknown[]
}

export interface SubmitExamRequest {
  examId: string
  status: "in_progress" | "completed"
  answers: { questionId: string; answerText: string | null }[]
  practicalSnapshot?: unknown
}

export interface CreateExamRequest {
  title: string
  description?: string
  timeLimit?: number
}

export interface CreateQuestionRequest {
  examId: string
  type: "mcq" | "practical"
  text: string
  options?: string[]
  correctAnswer?: string
  points?: number
  orderIndex?: number
}

export interface AssignBatchRequest {
  mode: "all" | "balanced"
  assignments: { examId: string; userId: string }[]
}

// Resumo do lote retornado por POST /api/exams/assign-batch.
export interface ExamApplicationBatchSummary {
  id: string
  mode: string
  totalRequested: number
  totalCreated: number
  totalExisting: number
  totalSkipped: number
}

export const examsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getExams: build.query<{ exams: Exam[] }, void>({
      query: () => "/exams",
      providesTags: ["Exams"],
    }),
    getExam: build.query<{ exam: Exam; questions: ExamQuestion[] }, string>({
      query: (examId) => `/exams/${examId}`,
      providesTags: (_result, _error, examId) => [{ type: "Exam", id: examId }],
    }),
    submitExam: build.mutation<{ submission: ExamSubmission }, SubmitExamRequest>({
      query: ({ examId, ...body }) => ({ url: `/exams/${examId}/submit`, method: "POST", body }),
      invalidatesTags: ["Exams", "ExamHistory"],
    }),
    getStudentHistory: build.query<{ submissions: (ExamSubmission & { examTitle: string })[] }, void>({
      query: () => "/exams/student/history",
      providesTags: ["ExamHistory"],
    }),
    createExam: build.mutation<{ exam: Exam }, CreateExamRequest>({
      query: (body) => ({ url: "/exams", method: "POST", body }),
      invalidatesTags: ["Exams"],
    }),
    updateExam: build.mutation<{ exam: Exam }, { examId: string } & Partial<CreateExamRequest> & { isPublished?: boolean; active?: boolean }>({
      query: ({ examId, ...body }) => ({ url: `/exams/${examId}`, method: "PUT", body }),
      invalidatesTags: (_result, _error, { examId }) => ["Exams", { type: "Exam", id: examId }],
    }),
    publishExam: build.mutation<{ exam: Exam }, { examId: string; isPublished: boolean }>({
      query: ({ examId, isPublished }) => ({
        url: `/exams/${examId}/publish`,
        method: "PATCH",
        body: { isPublished },
      }),
      invalidatesTags: (_result, _error, { examId }) => ["Exams", { type: "Exam", id: examId }],
    }),
    deleteExam: build.mutation<void, string>({
      query: (examId) => ({ url: `/exams/${examId}`, method: "DELETE" }),
      invalidatesTags: ["Exams"],
    }),
    createQuestion: build.mutation<{ question: ExamQuestionFull }, CreateQuestionRequest>({
      query: ({ examId, ...body }) => ({ url: `/exams/${examId}/questions`, method: "POST", body }),
      invalidatesTags: (_result, _error, { examId }) => [{ type: "Exam", id: examId }],
    }),
    deleteQuestion: build.mutation<void, { examId: string; questionId: string }>({
      query: ({ examId, questionId }) => ({
        url: `/exams/${examId}/questions/${questionId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { examId }) => [{ type: "Exam", id: examId }],
    }),
    assignBatch: build.mutation<{ success: boolean; application: ExamApplicationBatchSummary }, AssignBatchRequest>({
      query: (body) => ({ url: "/exams/assign-batch", method: "POST", body }),
    }),
  }),
})

export const {
  useGetExamsQuery,
  useGetExamQuery,
  useSubmitExamMutation,
  useGetStudentHistoryQuery,
  useCreateExamMutation,
  useUpdateExamMutation,
  usePublishExamMutation,
  useDeleteExamMutation,
  useCreateQuestionMutation,
  useDeleteQuestionMutation,
  useAssignBatchMutation,
} = examsApi
