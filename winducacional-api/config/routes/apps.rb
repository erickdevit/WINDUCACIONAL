# Rotas de frequência, chat e apostilas (contrato idêntico ao Express legado).
scope "/api", module: :api do
  # Frequência
  get "attendance/me", to: "attendance#me"
  get "attendance/summary", to: "attendance#summary"
  post "attendance/register", to: "attendance#register"

  # Chat (o SSE de eventos virou o ChatChannel no ActionCable)
  get "chat/turmas", to: "chat#turmas"
  get "chat/turmas/:turma_id/members", to: "chat#members"
  get "chat/turmas/:turma_id/group-thread", to: "chat#group_thread"
  post "chat/dm", to: "chat#dm"
  get "chat/threads/:thread_id/messages", to: "chat#messages"
  post "chat/threads/:thread_id/messages", to: "chat#create_message"
  get "chat/my-threads", to: "chat#my_threads"

  # Apostilas
  get "booklets/modules", to: "booklets#modules"
  put "booklets/modules/access", to: "booklets#update_access"
  get "booklets/student-access", to: "booklets#student_access"
  put "booklets/student-access", to: "booklets#update_student_access"
  get "booklets/modules/:module_id/files/:file_id/pdf", to: "booklets#pdf",
    constraints: { module_id: /[^\/]+/, file_id: /[^\/]+/ }
end
