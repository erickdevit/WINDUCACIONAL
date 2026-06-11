import { getNodeChildren, isFolder, type FsNode, type FsTree } from "./types"
import type { IconName } from "@/components/icons/SystemIcon"

export interface FsEntry {
  key: string
  path: string[]
  node: FsNode
}

export function getNodeAtPath(tree: FsTree, path: string[]): FsNode | null {
  if (path.length === 0) return null

  const [drive, ...rest] = path
  let current: FsNode | undefined = tree[drive]
  if (!current) return null

  for (const segment of rest) {
    const children = getNodeChildren(current)
    current = children[segment]
    if (!current) return null
  }

  return current
}

export function listEntries(tree: FsTree, path: string[]): FsEntry[] {
  const node = getNodeAtPath(tree, path)
  if (!node) return []

  const children = getNodeChildren(node)
  const entries = Object.entries(children).map(([key, child]) => ({
    key,
    path: [...path, key],
    node: child,
  }))

  return entries.sort((a, b) => {
    const aFolder = isFolder(a.node)
    const bFolder = isFolder(b.node)
    if (aFolder !== bFolder) return aFolder ? -1 : 1
    return a.key.localeCompare(b.key, "pt-BR", { sensitivity: "base" })
  })
}

// Substitui o nó no caminho informado, recriando apenas os ancestrais
// (atualização imutável) para que o RTK Query detecte a mudança. Caminhos
// inexistentes retornam a árvore original intacta.
export function setNodeAtPath(tree: FsTree, path: string[], node: FsNode): FsTree {
  const [head, ...rest] = path
  const current = tree[head]
  if (!current) return tree

  if (rest.length === 0) {
    return { ...tree, [head]: node }
  }

  const children = getNodeChildren(current)
  const updatedChildren = setNodeAtPath(children, rest, node)
  if (updatedChildren === children) return tree

  return { ...tree, [head]: { ...current, data: updatedChildren } }
}

export function resolveSpecialPath(tree: FsTree, spid: string): string[] | null {
  function search(node: FsNode, path: string[]): string[] | null {
    if (node.info?.spid === spid) return path
    if (!isFolder(node)) return null

    const children = getNodeChildren(node)
    for (const [key, child] of Object.entries(children)) {
      const found = search(child, [...path, key])
      if (found) return found
    }

    return null
  }

  for (const [drive, node] of Object.entries(tree)) {
    const found = search(node, [drive])
    if (found) return found
  }

  return null
}

export function formatWindowsPath(path: string[]): string {
  if (path.length <= 1) return `${path[0] ?? ""}\\`
  return path.join("\\")
}

export function isImageFileType(type: string | null | undefined): boolean {
  return type === "png" || type === "jpg" || type === "jpeg" || type === "webp" || type === "gif"
}

const FILE_ICONS: Record<string, IconName> = {
  txt: "document",
  docx: "document",
  doc: "document",
  pdf: "file-pdf",
  png: "file-image",
  jpg: "file-image",
  jpeg: "file-image",
  webp: "file-image",
  gif: "file-image",
}

export function getEntryIcon(node: FsNode): IconName {
  if (isFolder(node)) return "folder"
  return FILE_ICONS[node.type ?? ""] ?? "document"
}
