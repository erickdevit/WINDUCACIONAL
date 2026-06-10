# Rotas do domínio exams (preenchidas pela portagem do servidor Node).
# Rotas específicas precisam vir antes de "exams/:id" para não serem
# capturadas pelo coringa de id.
scope "/api", module: :api do
  get "exams", to: "exams#index"
  get "exams/analytics", to: "exams#analytics"
  get "exams/applications", to: "exam_applications#index"
  delete "exams/applications/:id", to: "exam_applications#destroy"
  get "exams/student/history", to: "exam_submissions#history"
  post "exams", to: "exams#create"
  post "exams/assign-batch", to: "exam_applications#assign_batch"
  get "exams/:id", to: "exams#show"
  put "exams/:id", to: "exams#update"
  patch "exams/:id/publish", to: "exams#publish"
  delete "exams/:id", to: "exams#destroy"
  post "exams/:id/questions", to: "exams#create_question"
  patch "exams/:id/questions/:questionId", to: "exams#update_question"
  delete "exams/:id/questions/:questionId", to: "exams#destroy_question"
  post "exams/:id/submit", to: "exam_submissions#submit"
  get "exams/:id/submissions", to: "exam_submissions#index"
  get "exams/:examId/submissions/:submissionId", to: "exam_submissions#show"
end
