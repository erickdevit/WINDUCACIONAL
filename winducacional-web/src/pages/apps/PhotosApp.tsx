import type { AppComponentProps } from "@/features/apps/registry"
import { useGetFsTreeQuery } from "@/features/files/fileSystemApi"
import { formatWindowsPath, getNodeAtPath, isImageFileType } from "@/features/files/treeUtils"
import { getApiErrorMessage } from "@/utils/errors"

export interface PhotosPayload {
  filePath: string[]
}

const IMAGE_DATA_URL_PATTERN = /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i

function isPhotosPayload(payload: unknown): payload is PhotosPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    Array.isArray((payload as PhotosPayload).filePath) &&
    (payload as PhotosPayload).filePath.every((segment) => typeof segment === "string")
  )
}

function getFileName(filePath: string[]): string {
  return filePath[filePath.length - 1] ?? "imagem"
}

export default function PhotosApp({ payload }: AppComponentProps) {
  const filePath = isPhotosPayload(payload) ? payload.filePath : null
  const { data, isLoading, isError, error } = useGetFsTreeQuery(undefined, { skip: !filePath })

  if (!filePath) {
    return <p className="text-sm text-white/60">Abra uma imagem pelo Explorador de Arquivos.</p>
  }

  if (isLoading) return <p className="text-sm text-white/60">Carregando…</p>
  if (isError || !data) {
    return <p className="text-sm text-red-400">{getApiErrorMessage(error, "Não foi possível carregar a imagem.")}</p>
  }

  const node = getNodeAtPath(data.tree, filePath)
  if (!node || !isImageFileType(node.type) || typeof node.data !== "string") {
    return <p className="text-sm text-red-400">Imagem não encontrada: {formatWindowsPath(filePath)}</p>
  }
  if (!IMAGE_DATA_URL_PATTERN.test(node.data)) {
    return <p className="text-sm text-red-400">O arquivo não contém uma imagem válida para visualização.</p>
  }

  const fileName = getFileName(filePath)

  return (
    <div className="flex h-full flex-col gap-2 text-sm">
      <div className="truncate rounded-md bg-black/30 px-2 py-1 text-xs text-white/60">{formatWindowsPath(filePath)}</div>
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-md bg-black/40 p-3">
        <img src={node.data} alt={`Imagem ${fileName}`} className="max-h-full max-w-full object-contain" />
      </div>
    </div>
  )
}
