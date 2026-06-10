import type { SerializedError } from "@reduxjs/toolkit"
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query"

type ApiError = FetchBaseQueryError | SerializedError | undefined

// Extrai a mensagem em pt-BR enviada pela API Rails (formato { error: "..." }),
// com fallback para uso em formulários de autenticação.
export function getApiErrorMessage(error: ApiError, fallback: string): string {
  if (!error) return fallback

  if ("status" in error) {
    const data = error.data
    if (data && typeof data === "object" && "error" in data) {
      const message = (data as { error?: unknown }).error
      if (typeof message === "string" && message.length > 0) return message
    }
    return fallback
  }

  return error.message || fallback
}
