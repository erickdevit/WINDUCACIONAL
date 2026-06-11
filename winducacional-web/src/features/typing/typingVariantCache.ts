const MAX_VARIANT_COUNTER = 1_000_000

type VariantMap = Record<string, number>
type StorageLike = Pick<Storage, "getItem" | "setItem">

export function variantStorageKey(username: string) {
  return `typingLessonVariants_${username}`
}

export function parseVariantMap(rawValue: string | null): VariantMap {
  if (!rawValue) return {}

  try {
    const parsed: unknown = JSON.parse(rawValue)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}

    return Object.entries(parsed).reduce<VariantMap>((map, [lessonId, value]) => {
      if (typeof value !== "number" && typeof value !== "string") return map
      if (typeof value === "string" && value.trim() === "") return map

      const counter = Number(value)
      if (!Number.isFinite(counter) || counter < 0) return map

      map[lessonId] = Math.min(Math.trunc(counter), MAX_VARIANT_COUNTER)
      return map
    }, {})
  } catch {
    return {}
  }
}

export function loadVariantMap(username: string, storage: StorageLike = localStorage): VariantMap {
  try {
    return parseVariantMap(storage.getItem(variantStorageKey(username)))
  } catch {
    return {}
  }
}

export function bumpVariant(username: string, lessonId: number, storage: StorageLike = localStorage) {
  const map = loadVariantMap(username, storage)
  const key = String(lessonId)
  map[key] = Math.min((map[key] ?? 0) + 1, MAX_VARIANT_COUNTER)

  try {
    storage.setItem(variantStorageKey(username), JSON.stringify(map))
  } catch {
    // Cache local é conveniência visual; falha de escrita não pode quebrar a lição.
  }
}
