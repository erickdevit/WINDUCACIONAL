const TIME_ZONE = "America/Sao_Paulo"

export function formatDateBR(isoDate: string): string {
  const [year, month, day] = isoDate.split("-")
  return `${day}/${month}/${year}`
}

export function formatTimeBR(isoDateTime: string | null): string {
  if (!isoDateTime) return "—"
  return new Date(isoDateTime).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  })
}
