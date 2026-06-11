import { useEffect, useRef, useState } from "react"
import { useAppDispatch, useAppSelector } from "@/app/hooks"
import { useGetFsTreeQuery } from "@/features/files/fileSystemApi"
import {
  goBack,
  goForward,
  goUp,
  navigateTo,
  selectCanGoBack,
  selectCanGoForward,
  selectCanGoUp,
  selectCurrentPath,
} from "@/features/files/filesSlice"
import { formatWindowsPath, getEntryIcon, listEntries, resolveSpecialPath, type FsEntry } from "@/features/files/treeUtils"
import { isFolder } from "@/features/files/types"
import { openWindow } from "@/features/windows/windowsSlice"
import { getApiErrorMessage } from "@/utils/errors"
import { SystemIcon } from "@/components/icons/SystemIcon"

const NAV_BUTTON_CLASS =
  "flex h-7 w-7 items-center justify-center rounded-md hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent"

// Tamanho padrão do Bloco de Notas (espelha o registro de apps; importar o
// registro aqui criaria dependência circular registry → ExplorerApp → registry).
const NOTEPAD_SIZE = { width: 480, height: 420 }
const NOTEPAD_TYPES = new Set(["txt"])

export default function ExplorerApp() {
  const dispatch = useAppDispatch()
  const currentPath = useAppSelector(selectCurrentPath)
  const canGoBack = useAppSelector(selectCanGoBack)
  const canGoForward = useAppSelector(selectCanGoForward)
  const canGoUp = useAppSelector(selectCanGoUp)
  const { data, isLoading, isError, error } = useGetFsTreeQuery()
  const [search, setSearch] = useState("")
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (hasInitialized.current || !data) return
    hasInitialized.current = true

    if (currentPath.length === 1 && currentPath[0] === "C:") {
      const home = resolveSpecialPath(data.tree, "%user%")
      if (home) dispatch(navigateTo(home))
    }
  }, [data, currentPath, dispatch])

  if (isLoading) return <p className="text-sm text-white/60">Carregando…</p>
  if (isError || !data) {
    return <p className="text-sm text-red-400">{getApiErrorMessage(error, "Não foi possível carregar os arquivos.")}</p>
  }

  const entries = listEntries(data.tree, currentPath)
  const term = search.trim().toLowerCase()
  const filtered = term ? entries.filter((entry) => entry.key.toLowerCase().includes(term)) : entries

  function handleOpenEntry(entry: FsEntry) {
    if (isFolder(entry.node)) {
      dispatch(navigateTo(entry.path))
      return
    }
    if (NOTEPAD_TYPES.has(entry.node.type ?? "")) {
      dispatch(openWindow("notepad", entry.key, NOTEPAD_SIZE, { filePath: entry.path }))
    }
  }

  return (
    <div className="flex h-full flex-col gap-2 text-sm">
      <div className="flex items-center gap-1">
        <button type="button" aria-label="Voltar" disabled={!canGoBack} onClick={() => dispatch(goBack())} className={NAV_BUTTON_CLASS}>
          ←
        </button>
        <button
          type="button"
          aria-label="Avançar"
          disabled={!canGoForward}
          onClick={() => dispatch(goForward())}
          className={NAV_BUTTON_CLASS}
        >
          →
        </button>
        <button type="button" aria-label="Subir" disabled={!canGoUp} onClick={() => dispatch(goUp())} className={NAV_BUTTON_CLASS}>
          ↑
        </button>
        <div className="flex-1 truncate rounded-md bg-black/30 px-2 py-1 text-xs text-white/70">{formatWindowsPath(currentPath)}</div>
      </div>

      <input
        type="search"
        placeholder="Pesquisar"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="rounded-md bg-black/30 px-2 py-1 text-xs text-white outline-none placeholder:text-white/40 focus:ring-1 focus:ring-accent"
      />

      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <p className="text-xs text-white/40">Esta pasta está vazia.</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2">
            {filtered.map((entry) => (
              <button
                key={entry.key}
                type="button"
                onDoubleClick={() => handleOpenEntry(entry)}
                className="flex flex-col items-center gap-1 rounded-md p-2 text-center hover:bg-white/10"
              >
                <SystemIcon name={getEntryIcon(entry.node)} className="h-8 w-8 text-white/80" />
                <span className="w-full truncate text-xs">{entry.key}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="text-xs text-white/40">
        {filtered.length} {filtered.length === 1 ? "item" : "itens"}
      </div>
    </div>
  )
}
