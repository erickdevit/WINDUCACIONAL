import { useEffect, useRef, useState, type FormEvent } from "react"
import { useGetMeQuery } from "@/features/auth/authApi"
import {
  useGetChatMembersQuery,
  useGetChatTurmasQuery,
  useGetGroupThreadQuery,
  useGetMessagesQuery,
  useOpenDmMutation,
  useSendMessageMutation,
} from "@/features/chat/chatApi"
import { useChatChannel } from "@/features/chat/useChatChannel"
import { getApiErrorMessage } from "@/utils/errors"

interface Conversation {
  threadId: string
  title: string
}

export default function ChatApp() {
  const { data: me } = useGetMeQuery()
  const user = me?.user
  const { data: turmasData, isLoading, isError, error } = useGetChatTurmasQuery()
  const [selectedTurmaId, setSelectedTurmaId] = useState<string | null>(null)
  const [conversation, setConversation] = useState<Conversation | null>(null)

  const turmas = turmasData?.turmas ?? []
  const turmaId = selectedTurmaId ?? turmas[0]?.id ?? null

  if (isLoading) return <p className="text-sm text-white/60">Carregando…</p>
  if (isError || !turmasData || !user) {
    return <p className="text-sm text-red-400">{getApiErrorMessage(error, "Não foi possível carregar o chat.")}</p>
  }
  if (turmas.length === 0) {
    return <p className="text-xs text-white/40">Você ainda não participa de nenhuma turma.</p>
  }

  return (
    <div className="flex h-full gap-3 text-sm">
      <aside className="flex w-44 shrink-0 flex-col gap-2 overflow-auto">
        {turmas.length > 1 && (
          <select
            aria-label="Turma"
            value={turmaId ?? ""}
            onChange={(event) => {
              setSelectedTurmaId(event.target.value)
              setConversation(null)
            }}
            className="rounded-md bg-black/30 px-2 py-1 text-xs text-white outline-none"
          >
            {turmas.map((turma) => (
              <option key={turma.id} value={turma.id}>
                {turma.nome}
              </option>
            ))}
          </select>
        )}
        {turmaId && (
          <TurmaSidebar
            turmaId={turmaId}
            turmaNome={turmas.find((turma) => turma.id === turmaId)?.nome ?? ""}
            activeThreadId={conversation?.threadId ?? null}
            onSelect={setConversation}
          />
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {conversation ? (
          <ChatThread key={conversation.threadId} conversation={conversation} currentUserId={user.id} />
        ) : (
          <p className="m-auto text-xs text-white/40">Escolha uma conversa ao lado.</p>
        )}
      </div>
    </div>
  )
}

function TurmaSidebar({
  turmaId,
  turmaNome,
  activeThreadId,
  onSelect,
}: {
  turmaId: string
  turmaNome: string
  activeThreadId: string | null
  onSelect: (conversation: Conversation) => void
}) {
  const { data: groupData } = useGetGroupThreadQuery(turmaId)
  const { data: membersData } = useGetChatMembersQuery(turmaId)
  const [openDm] = useOpenDmMutation()

  async function handleOpenDm(peerId: string, peerName: string) {
    const result = await openDm({ peerId }).unwrap()
    onSelect({ threadId: result.threadId, title: peerName })
  }

  const itemClass = (active: boolean) =>
    `w-full rounded-md px-2 py-1.5 text-left text-xs ${active ? "bg-accent text-white" : "hover:bg-white/10"}`

  return (
    <ul className="flex flex-col gap-1">
      {groupData && (
        <li>
          <button
            type="button"
            className={itemClass(activeThreadId === groupData.threadId)}
            onClick={() => onSelect({ threadId: groupData.threadId, title: `Grupo · ${turmaNome}` })}
          >
            👥 Grupo da turma
          </button>
        </li>
      )}
      {(membersData?.members ?? []).map((member) => (
        <li key={member.id}>
          <button
            type="button"
            className={itemClass(false)}
            onClick={() => void handleOpenDm(member.id, member.displayName)}
          >
            💬 {member.displayName}
          </button>
        </li>
      ))}
    </ul>
  )
}

function ChatThread({ conversation, currentUserId }: { conversation: Conversation; currentUserId: string }) {
  const { data, isLoading, isError, error } = useGetMessagesQuery(conversation.threadId)
  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation()
  const [draft, setDraft] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)
  useChatChannel(conversation.threadId)

  const messageCount = data?.messages.length ?? 0
  useEffect(() => {
    // jsdom (testes) não implementa scrollIntoView.
    bottomRef.current?.scrollIntoView?.({ block: "end" })
  }, [messageCount])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const body = draft.trim()
    if (!body || isSending) return
    await sendMessage({ threadId: conversation.threadId, body }).unwrap()
    setDraft("")
  }

  return (
    <>
      <div className="mb-2 border-b border-desktop-border pb-1 text-xs font-medium text-white/70">
        {conversation.title}
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <p className="text-xs text-white/60">Carregando…</p>
        ) : isError || !data ? (
          <p className="text-xs text-red-400">{getApiErrorMessage(error, "Não foi possível carregar as mensagens.")}</p>
        ) : data.messages.length === 0 ? (
          <p className="text-xs text-white/40">Nenhuma mensagem ainda. Diga oi!</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {data.messages.map((message) => {
              const mine = message.sender_id === currentUserId
              return (
                <li key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-md px-2 py-1 text-xs ${mine ? "bg-accent/80 text-white" : "bg-black/30"}`}
                  >
                    {!mine && <p className="mb-0.5 font-medium text-white/70">{message.sender_name}</p>}
                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="mt-2 flex gap-2">
        <input
          type="text"
          aria-label="Mensagem"
          placeholder="Digite uma mensagem"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={2000}
          className="min-w-0 flex-1 rounded-md bg-black/30 px-2 py-1.5 text-xs text-white outline-none placeholder:text-white/40 focus:ring-1 focus:ring-accent"
        />
        <button
          type="submit"
          disabled={isSending || !draft.trim()}
          className="shrink-0 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </>
  )
}
