export interface FsNodeInfo {
  icon?: string
  spid?: string
  size?: string
  used?: string
}

export interface FsNode {
  type?: string | null
  name?: string
  info?: FsNodeInfo
  data?: Record<string, FsNode> | string
}

export type FsTree = Record<string, FsNode>

export function isFolder(node: FsNode): boolean {
  return node.type == null || node.type === "folder"
}

export function getNodeChildren(node: FsNode): Record<string, FsNode> {
  return isFolder(node) && node.data && typeof node.data === "object" ? (node.data as Record<string, FsNode>) : {}
}
