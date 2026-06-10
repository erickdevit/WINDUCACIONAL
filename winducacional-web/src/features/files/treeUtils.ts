import { getNodeChildren, isFolder, type FsNode, type FsTree } from "./types"

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

const FILE_ICONS: Record<string, string> = {
  txt: "📄",
  docx: "📝",
  doc: "📝",
  pdf: "📕",
  png: "🖼️",
  jpg: "🖼️",
  jpeg: "🖼️",
  webp: "🖼️",
  gif: "🖼️",
}

export function getEntryIcon(node: FsNode): string {
  if (isFolder(node)) return "📁"
  return FILE_ICONS[node.type ?? ""] ?? "📄"
}
