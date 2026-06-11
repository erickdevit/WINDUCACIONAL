import { useState, type FormEvent } from "react"
import {
  useGenerateImageMutation,
  useGetImagegenConfigQuery,
  type ImagegenAspect,
} from "@/features/imagegen/imagegenApi"
import { useLazyGetFsTreeQuery, useUpdateFsTreeMutation } from "@/features/files/fileSystemApi"
import {
  addFileToFolder,
  formatWindowsPath,
  resolveSpecialPath,
  sanitizeWindowsFileName,
} from "@/features/files/treeUtils"
import { getApiErrorMessage } from "@/utils/errors"

const ASPECTS: ImagegenAspect[] = ["1:1", "16:9", "9:16", "4:3", "3:4"]
const IMAGE_DATA_URL_PATTERN = /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i

function getImageExtension(dataUrl: string): string {
  const match = dataUrl.match(IMAGE_DATA_URL_PATTERN)
  if (!match) return "png"
  return match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase()
}

function buildGeneratedImageName(prompt: string, dataUrl: string): string {
  const baseName = sanitizeWindowsFileName(prompt, "imagem-gerada")
  return `${baseName}.${getImageExtension(dataUrl)}`
}

export default function ImagegenApp() {
  const { data: config, isLoading } = useGetImagegenConfigQuery()
  const [generate, { data, isLoading: isGenerating, error }] = useGenerateImageMutation()
  const [loadTree] = useLazyGetFsTreeQuery()
  const [updateTree, { isLoading: isSaving }] = useUpdateFsTreeMutation()
  const [prompt, setPrompt] = useState("")
  const [aspect, setAspect] = useState<ImagegenAspect>("1:1")
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!prompt.trim() || isGenerating) return
    setSaveMessage(null)
    setSaveError(null)
    void generate({ prompt: prompt.trim(), aspect })
  }

  async function handleSaveToDisk() {
    const image = data?.image
    if (!image || isSaving) return
    setSaveMessage(null)
    setSaveError(null)

    if (!IMAGE_DATA_URL_PATTERN.test(image)) {
      setSaveError("A imagem gerada não está em um formato válido para salvar.")
      return
    }

    try {
      const fsData = await loadTree(undefined, false).unwrap()
      const picturesPath = resolveSpecialPath(fsData.tree, "%pictures%")
      if (!picturesPath) {
        setSaveError("A pasta Imagens não foi encontrada no disco virtual.")
        return
      }

      const fileName = buildGeneratedImageName(prompt, image)
      const result = addFileToFolder(fsData.tree, picturesPath, fileName, {
        type: getImageExtension(image),
        data: image,
      })
      if (!result) {
        setSaveError("Não foi possível salvar a imagem na pasta Imagens.")
        return
      }

      await updateTree({ tree: result.tree }).unwrap()
      setSaveMessage(`Imagem salva em ${formatWindowsPath(result.path)}.`)
    } catch {
      setSaveError(getApiErrorMessage(undefined, "Não foi possível salvar a imagem no disco virtual."))
    }
  }

  if (isLoading) return <p className="text-sm text-white/60">Carregando…</p>
  if (config && !config.configured) {
    return <p className="text-sm text-white/60">O gerador de imagens não está configurado no servidor.</p>
  }

  return (
    <div className="flex h-full flex-col gap-3 text-sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <textarea
          aria-label="Descrição da imagem"
          placeholder="Descreva a imagem que você quer gerar…"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={2}
          className="resize-none rounded-md bg-black/30 px-2 py-1.5 text-xs text-white outline-none placeholder:text-white/40 focus:ring-1 focus:ring-accent"
        />
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {ASPECTS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setAspect(value)}
                className={`rounded-md px-2 py-1 text-xs ${aspect === value ? "bg-accent text-white" : "bg-white/10 hover:bg-white/20"}`}
              >
                {value}
              </button>
            ))}
          </div>
          <button
            type="submit"
            disabled={isGenerating || !prompt.trim()}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating ? "Gerando…" : "Gerar"}
          </button>
        </div>
      </form>

      {error && (
        <p className="text-xs text-red-400">{getApiErrorMessage(error, "Não foi possível gerar a imagem.")}</p>
      )}
      {saveError && <p className="text-xs text-red-400">{saveError}</p>}
      {saveMessage && <p className="text-xs text-emerald-400">{saveMessage}</p>}

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-md bg-black/30">
        {isGenerating ? (
          <p className="text-xs text-white/40">Gerando imagem…</p>
        ) : data?.image ? (
          <img src={data.image} alt={prompt || "Imagem gerada"} className="max-h-full max-w-full object-contain" />
        ) : (
          <p className="text-xs text-white/40">A imagem gerada aparecerá aqui.</p>
        )}
      </div>
      {data?.image && (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void handleSaveToDisk()}
            className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Salvando…" : "Salvar no disco"}
          </button>
        </div>
      )}
    </div>
  )
}
