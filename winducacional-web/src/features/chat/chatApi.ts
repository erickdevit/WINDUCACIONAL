import { baseApi } from "@/api/baseApi"

export interface ChatTurma {
  id: string
  nome: string
}

export interface ChatMember {
  id: string
  username: string
  displayName: string
  role: string
}

export interface ChatAttachment {
  name: string
  content: string
  type: string
}

// Payload snake_case idêntico ao Chat::ThreadService.public_message (Rails)
// e ao SSE do Node legado.
export interface ChatMessage {
  id: string
  thread_id: string
  sender_id: string
  body: string
  attachment: ChatAttachment | null
  created_at: string
  sender_name: string
  sender_username: string
  sender_role: string
}

export interface SendMessageRequest {
  threadId: string
  body: string
  attachment?: ChatAttachment
}

export const chatApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getChatTurmas: build.query<{ turmas: ChatTurma[] }, void>({
      query: () => "/chat/turmas",
    }),
    getChatMembers: build.query<{ members: ChatMember[] }, string>({
      query: (turmaId) => `/chat/turmas/${turmaId}/members`,
    }),
    getGroupThread: build.query<{ threadId: string }, string>({
      query: (turmaId) => `/chat/turmas/${turmaId}/group-thread`,
    }),
    openDm: build.mutation<{ threadId: string }, { peerId: string }>({
      query: (body) => ({ url: "/chat/dm", method: "POST", body }),
    }),
    getMessages: build.query<{ messages: ChatMessage[] }, string>({
      query: (threadId) => `/chat/threads/${threadId}/messages`,
      providesTags: (_result, _error, threadId) => [{ type: "ChatMessages", id: threadId }],
    }),
    sendMessage: build.mutation<{ message: ChatMessage }, SendMessageRequest>({
      query: ({ threadId, ...body }) => ({
        url: `/chat/threads/${threadId}/messages`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { threadId }) => [{ type: "ChatMessages", id: threadId }],
    }),
  }),
})

// Insere uma mensagem recebida pelo ChatChannel no cache da thread.
export function appendIncomingMessage(threadId: string, message: ChatMessage) {
  return chatApi.util.updateQueryData("getMessages", threadId, (draft) => {
    if (draft.messages.some((item) => item.id === message.id)) return
    draft.messages.push(message)
  })
}

export const {
  useGetChatTurmasQuery,
  useGetChatMembersQuery,
  useGetGroupThreadQuery,
  useOpenDmMutation,
  useGetMessagesQuery,
  useSendMessageMutation,
} = chatApi
