import { useState, type FormEvent } from "react"
import {
  useGenerateImageMutation,
  useGetImagegenConfigQuery,
  type ImagegenAspect,
} from "@/features/imagegen/imagegenApi"
import { getApiErrorMessage } from "@/utils/errors"

const ASPECTS: ImagegenAspect[] = ["1:1", "16:9", "9:16", "4:3", "3:4"]

export default function ImagegenApp() {
  const { data: config, isLoading } = useGetImagegenConfigQuery()
  const [generate, { data, isLoading: isGenerating, error }] = useGenerateImageMutation()
  const [prompt, setPrompt] = useState("")
  const [aspect, setAspect] = useState<ImagegenAspect>("1:1")

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!prompt.trim() || isGenerating) return
    void generate({ prompt: prompt.trim(), aspect })
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

      <div className="flex flex-1 items-center justify-center overflow-auto rounded-md bg-black/30">
        {isGenerating ? (
          <p className="text-xs text-white/40">Gerando imagem…</p>
        ) : data?.image ? (
          <img src={data.image} alt={prompt || "Imagem gerada"} className="max-h-full max-w-full object-contain" />
        ) : (
          <p className="text-xs text-white/40">A imagem gerada aparecerá aqui.</p>
        )}
      </div>
    </div>
  )
}
