import { useEffect, useRef, useState } from "react"
import { useAppDispatch, useAppSelector } from "@/app/hooks"
import { useGetFsTreeQuery, useUpdateFsTreeMutation } from "@/features/files/fileSystemApi"
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
import {
  addFileToFolder,
  formatWindowsPath,
  getEntryIcon,
  isImageFileType,
  listEntries,
  removeNodeAtPath,
  renameNodeAtPath,
  resolveSpecialPath,
  sanitizeWindowsFileName,
  type FsEntry,
} from "@/features/files/treeUtils"
import { isFolder } from "@/features/files/types"
import type { FsTree } from "@/features/files/types"
import { openWindow } from "@/features/windows/windowsSlice"
import { getApiErrorMessage } from "@/utils/errors"
import { SystemIcon } from "@/components/icons/SystemIcon"

const NAV_BUTTON_CLASS =
  "flex h-7 w-7 items-center justify-center rounded-md hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent"

// Tamanho padrão do Bloco de Notas (espelha o registro de apps; importar o
// registro aqui criaria dependência circular registry → ExplorerApp → registry).
const NOTEPAD_SIZE = { width: 480, height: 420 }
const NOTEPAD_TYPES = new Set(["txt"])
const PHOTOS_SIZE = { width: 640, height: 480 }
const PATH_SEPARATOR = "\u0000"

function pathKey(path: string[]): string {
  return path.join(PATH_SEPARATOR)
}

function buildTextFileName(name: string): string {
  const sanitized = sanitizeWindowsFileName(name, "novo arquivo")
  return sanitized.toLocaleLowerCase("pt-BR").endsWith(".txt") ? sanitized : `${sanitized}.txt`
}

export default function ExplorerApp() {
  const dispatch = useAppDispatch()
  const currentPath = useAppSelector(selectCurrentPath)
  const canGoBack = useAppSelector(selectCanGoBack)
  const canGoForward = useAppSelector(selectCanGoForward)
  const canGoUp = useAppSelector(selectCanGoUp)
  const { data, isLoading, isError, error } = useGetFsTreeQuery()
  const [updateTree, { isLoading: isSaving }] = useUpdateFsTreeMutation()
  const [search, setSearch] = useState("")
  const [nameInput, setNameInput] = useState("")
  const [selectedPath, setSelectedPath] = useState<string[] | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
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

  const tree = data.tree
  const entries = listEntries(tree, currentPath)
  const term = search.trim().toLowerCase()
  const filtered = term ? entries.filter((entry) => entry.key.toLowerCase().includes(term)) : entries
  const selectedEntry = selectedPath ? entries.find((entry) => pathKey(entry.path) === pathKey(selectedPath)) ?? null : null

  async function persistTree(tree: FsTree, successMessage: string) {
    setActionError(null)
    setActionMessage(null)
    try {
      await updateTree({ tree }).unwrap()
      setActionMessage(successMessage)
    } catch {
      setActionError(getApiErrorMessage(undefined, "Não foi possível atualizar o disco virtual."))
    }
  }

  async function handleCreateFolder() {
    const result = addFileToFolder(tree, currentPath, sanitizeWindowsFileName(nameInput, "Nova pasta"), {
      type: "folder",
      data: {},
    })
    if (!result) {
      setActionError("Não foi possível criar a pasta neste local.")
      return
    }
    setNameInput("")
    setSelectedPath(result.path)
    await persistTree(result.tree, `Pasta criada: ${result.fileName}.`)
  }

  async function handleCreateTextFile() {
    const result = addFileToFolder(tree, currentPath, buildTextFileName(nameInput), { type: "txt", data: "" })
    if (!result) {
      setActionError("Não foi possível criar o arquivo neste local.")
      return
    }
    setNameInput("")
    setSelectedPath(result.path)
    await persistTree(result.tree, `Arquivo criado: ${result.fileName}.`)
  }

  async function handleRenameSelected() {
    if (!selectedEntry) return
    const nextName = nameInput.trim() || selectedEntry.key
    const result = renameNodeAtPath(tree, selectedEntry.path, nextName)
    if (!result) {
      setActionError("Não foi possível renomear o item selecionado.")
      return
    }
    setNameInput("")
    setSelectedPath(result.path)
    if (result.tree === tree) {
      setActionMessage(`Nome mantido: ${result.name}.`)
      return
    }
    await persistTree(result.tree, `Item renomeado para ${result.name}.`)
  }

  async function handleDeleteSelected() {
    if (!selectedEntry) return
    const nextTree = removeNodeAtPath(tree, selectedEntry.path)
    if (!nextTree) {
      setActionError("Não foi possível excluir o item selecionado.")
      return
    }
    const deletedName = selectedEntry.key
    setSelectedPath(null)
    await persistTree(nextTree, `Item excluído: ${deletedName}.`)
  }

  function handleOpenEntry(entry: FsEntry) {
    if (isFolder(entry.node)) {
      dispatch(navigateTo(entry.path))
      return
    }
    if (NOTEPAD_TYPES.has(entry.node.type ?? "")) {
      dispatch(openWindow("notepad", entry.key, NOTEPAD_SIZE, { filePath: entry.path }))
      return
    }
    if (isImageFileType(entry.node.type)) {
      dispatch(openWindow("photos", entry.key, PHOTOS_SIZE, { filePath: entry.path }))
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

      <div className="flex flex-wrap items-center gap-1 rounded-md bg-black/20 p-2">
        <input
          type="text"
          aria-label="Nome do item"
          placeholder={selectedEntry ? selectedEntry.key : "Nome"}
          value={nameInput}
          onChange={(event) => setNameInput(event.target.value)}
          className="min-w-[140px] flex-1 rounded-md bg-black/30 px-2 py-1 text-xs text-white outline-none placeholder:text-white/40 focus:ring-1 focus:ring-accent"
        />
        <button
          type="button"
          disabled={isSaving}
          onClick={() => void handleCreateFolder()}
          className="rounded-md bg-white/10 px-2 py-1 text-xs hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Nova pasta
        </button>
        <button
          type="button"
          disabled={isSaving}
          onClick={() => void handleCreateTextFile()}
          className="rounded-md bg-white/10 px-2 py-1 text-xs hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Novo texto
        </button>
        <button
          type="button"
          disabled={isSaving || !selectedEntry}
          onClick={() => void handleRenameSelected()}
          className="rounded-md bg-white/10 px-2 py-1 text-xs hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Renomear
        </button>
        <button
          type="button"
          disabled={isSaving || !selectedEntry}
          onClick={() => void handleDeleteSelected()}
          className="rounded-md bg-red-600/70 px-2 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Excluir
        </button>
      </div>
      {actionError && <p className="text-xs text-red-400">{actionError}</p>}
      {actionMessage && <p className="text-xs text-emerald-400">{actionMessage}</p>}

      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <p className="text-xs text-white/40">Esta pasta está vazia.</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2">
            {filtered.map((entry) => (
              <button
                key={entry.key}
                type="button"
                aria-pressed={selectedPath ? pathKey(selectedPath) === pathKey(entry.path) : false}
                onClick={() => {
                  setSelectedPath(entry.path)
                  setNameInput(entry.key)
                }}
                onDoubleClick={() => handleOpenEntry(entry)}
                className={`flex flex-col items-center gap-1 rounded-md p-2 text-center hover:bg-white/10 ${
                  selectedPath && pathKey(selectedPath) === pathKey(entry.path) ? "bg-accent/40 ring-1 ring-accent" : ""
                }`}
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
