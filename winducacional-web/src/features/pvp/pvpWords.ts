// Gera a sequência de palavras do duelo a partir do seed enviado no
// match_started — ambos os jogadores produzem exatamente a mesma lista.

export const PVP_WORD_POOL = [
  "casa", "fada", "saca", "loja", "laço", "sala", "lado", "cada", "fala",
  "rato", "quero", "rabo", "raro", "pote", "tipo", "copia", "topo",
  "gato", "haja", "asas", "vaca", "zebra", "maxima", "banana", "navio",
  "tempo", "vento", "campo", "festa", "verde", "azul", "porta", "janela",
  "livro", "papel", "lápis", "mesa", "cadeira", "escola", "aluno", "prova",
] as const

// PRNG mulberry32: pequeno, determinístico e suficiente para embaralhar.
function mulberry32(seed: number) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function generatePvpWords(seed: number, count: number): string[] {
  const random = mulberry32(seed)
  const words: string[] = []
  for (let i = 0; i < count; i++) {
    words.push(PVP_WORD_POOL[Math.floor(random() * PVP_WORD_POOL.length)])
  }
  return words
}
