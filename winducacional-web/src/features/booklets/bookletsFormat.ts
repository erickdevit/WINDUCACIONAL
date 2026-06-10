const UNITS = ["KB", "MB", "GB"]

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`

  let value = bytes
  let unitIndex = -1
  do {
    value /= 1024
    unitIndex += 1
  } while (value >= 1024 && unitIndex < UNITS.length - 1)

  return `${value.toFixed(1)} ${UNITS[unitIndex]}`
}

export function getBookletFileUrl(url: string): string {
  return `${window.location.origin}${url}`
}
