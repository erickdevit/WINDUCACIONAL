import { useState } from "react"
import type { AppComponentProps } from "@/features/apps/registry"
import { useGetFsTreeQuery, useUpdateFsTreeMutation } from "@/features/files/fileSystemApi"
import { formatWindowsPath, getNodeAtPath, setNodeAtPath } from "@/features/files/treeUtils"
import { getApiErrorMessage } from "@/utils/errors"

export interface NotepadPayload {
  filePath: string[]
}

function isNotepadPayload(payload: unknown): payload is NotepadPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    Array.isArray((payload as NotepadPayload).filePath) &&
    (payload as NotepadPayload).filePath.every((segment) => typeof segment === "string")
  )
}

export default function NotepadApp({ payload }: AppComponentProps) {
  const filePath = isNotepadPayload(payload) ? payload.filePath : null
  const { data, isLoading, isError, error } = useGetFsTreeQuery(undefined, { skip: !filePath })
  const [updateTree, { isLoading: isSaving, isError: isSaveError, isSuccess: isSaved }] = useUpdateFsTreeMutation()
  const [text, setText] = useState("")
  const [loadedPathKey, setLoadedPathKey] = useState<string | null>(null)

  const node = filePath && data ? getNodeAtPath(data.tree, filePath) : null
  const fileContent = node && typeof node.data === "string" ? node.data : ""

  // Carrega o conteúdo do arquivo uma única vez por caminho aberto, sem
  // sobrescrever o que o usuário digitou em refetches da árvore. Ajuste de
  // estado durante o render, conforme react.dev/learn/you-might-not-need-an-effect.
  const pathKey = filePath ? filePath.join("\\") : null
  if (pathKey && node && pathKey !== loadedPathKey) {
    setText(fileContent)
    setLoadedPathKey(pathKey)
  }

  if (!filePath) {
    return (
      <div className="flex h-full flex-col gap-2">
        <p className="text-xs text-white/40">Rascunho local — abra um arquivo .txt pelo Explorador para editar e salvar.</p>
        <textarea
          aria-label="Conteúdo do rascunho"
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="flex-1 resize-none rounded-md bg-black/30 p-2 font-mono text-sm text-white outline-none focus:ring-1 focus:ring-accent"
        />
      </div>
    )
  }

  if (isLoading) return <p className="text-sm text-white/60">Carregando…</p>
  if (isError || !data) {
    return <p className="text-sm text-red-400">{getApiErrorMessage(error, "Não foi possível carregar o arquivo.")}</p>
  }
  if (!node || typeof node.data !== "string") {
    return <p className="text-sm text-red-400">Arquivo não encontrado: {formatWindowsPath(filePath)}</p>
  }

  function handleSave() {
    if (!data || !filePath || !node) return
    const tree = setNodeAtPath(data.tree, filePath, { ...node, data: text })
    void updateTree({ tree })
  }

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs text-white/50">{formatWindowsPath(filePath)}</span>
        <div className="flex shrink-0 items-center gap-2">
          {isSaved && <span className="text-xs text-emerald-400">Salvo</span>}
          {isSaveError && <span className="text-xs text-red-400">Erro ao salvar</span>}
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
      <textarea
        aria-label="Conteúdo do arquivo"
        value={text}
        onChange={(event) => setText(event.target.value)}
        className="flex-1 resize-none rounded-md bg-black/30 p-2 font-mono text-sm text-white outline-none focus:ring-1 focus:ring-accent"
      />
    </div>
  )
}
