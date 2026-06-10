const TIME_ZONE = "America/Sao_Paulo"

export function formatDateTimeBR(isoDateTime: string): string {
  return new Date(isoDateTime).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  })
}

export function groupSessionsByTurma<T extends { turmaId: string | null; turmaNome: string | null }>(
  sessions: T[],
): { turmaId: string | null; turmaNome: string; sessions: T[] }[] {
  const groups = new Map<string, { turmaId: string | null; turmaNome: string; sessions: T[] }>()

  for (const session of sessions) {
    const key = session.turmaId ?? "__sem_turma__"
    const group = groups.get(key)
    if (group) {
      group.sessions.push(session)
    } else {
      groups.set(key, {
        turmaId: session.turmaId,
        turmaNome: session.turmaNome ?? "Sem turma",
        sessions: [session],
      })
    }
  }

  return [...groups.values()]
}
