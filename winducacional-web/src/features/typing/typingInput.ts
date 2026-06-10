// Porta de src/containers/applications/apps/typingInput.js (legado): trata
// teclas mortas (acentos) de teclados ABNT/US-Intl para que ã, é, ô etc.
// sejam compostos corretamente durante as lições de digitação.

const DEAD_KEY_MARKS: Record<string, string> = {
  "~": "̃",
  "̃": "̃",
  "˜": "̃", // Small Tilde
  "^": "̂",
  "̂": "̂",
  "ˆ": "̂", // Modifier Letter Circumflex
  "´": "́",
  "́": "́",
  "ˊ": "́", // Modifier Letter Acute Accent
  "`": "̀",
  "̀": "̀",
  "ˋ": "̀", // Modifier Letter Grave Accent
  "¨": "̈",
  "̈": "̈",
  "'": "́", // US-Intl Acute
  '"': "̈", // US-Intl Umlaut
}

export const UNKNOWN_DEAD_KEY_MARK = "__dead_key__"

const DEAD_KEY_CODE_MARKS: Record<string, { default: string; shift: string }> = {
  Backquote: { default: "`", shift: "~" },
  BracketLeft: { default: "´", shift: "`" },
  BracketRight: { default: "~", shift: "^" },
  Equal: { default: "´", shift: "`" },
  IntlBackslash: { default: "`", shift: "~" },
  Quote: { default: "´", shift: "¨" },
  Semicolon: { default: "´", shift: "¨" },
}

export function isDeadKeyMark(char: string): boolean {
  return Object.prototype.hasOwnProperty.call(DEAD_KEY_MARKS, char)
}

export function normalizeTypingCharacter(char = ""): string {
  return String(char).normalize("NFC")
}

export function hasTypingDiacritic(char = ""): boolean {
  return /[̀-ͯ]/.test(String(char).normalize("NFD"))
}

export function areTypingCharactersEquivalent(typedChar = "", expectedChar = ""): boolean {
  return normalizeTypingCharacter(typedChar) === normalizeTypingCharacter(expectedChar)
}

function composeWithKnownMark(mark: string, char: string): string {
  const combined = `${char}${DEAD_KEY_MARKS[mark] || ""}`.normalize("NFC")
  return combined.length === 1 ? combined : ""
}

function findMarkForExpectedChar(char: string, expectedChar: string): string {
  if (!expectedChar || char === expectedChar) return ""

  return (
    Object.keys(DEAD_KEY_MARKS).find((mark) => composeWithKnownMark(mark, char) === expectedChar) ||
    ""
  )
}

function isExpectedLiteralDeadKeyMark(char: string, expectedChar: string | undefined): boolean {
  return isDeadKeyMark(char) && expectedChar === char
}

interface ComposeOptions {
  allowExpectedFallback?: boolean
}

export function composeDeadKeyMark(
  mark: string,
  char: string,
  expectedChar = "",
  options: ComposeOptions = {},
): string {
  if (expectedChar && areTypingCharactersEquivalent(char, expectedChar) && hasTypingDiacritic(char)) {
    return normalizeTypingCharacter(char)
  }

  if (isDeadKeyMark(mark)) {
    const combined = composeWithKnownMark(mark, char)
    if (
      options.allowExpectedFallback &&
      expectedChar &&
      combined &&
      !areTypingCharactersEquivalent(combined, expectedChar) &&
      hasTypingDiacritic(expectedChar)
    ) {
      const expectedMark = findMarkForExpectedChar(char, expectedChar)
      const expectedCombined = expectedMark ? composeWithKnownMark(expectedMark, char) : ""
      if (expectedCombined) return expectedCombined
    }
    return combined || `${mark}${char}`
  }

  const expectedMark = findMarkForExpectedChar(char, expectedChar)
  if (!expectedMark) return `${mark}${char}`

  const combined = composeWithKnownMark(expectedMark, char)
  return combined || `${mark}${char}`
}

export interface DeadKeyEventLike {
  key?: string
  code?: string
  data?: string
  shiftKey?: boolean
  nativeEvent?: DeadKeyEventLike
}

export function resolveDeadKeyMarkFromEvent(event: DeadKeyEventLike | null | undefined): string {
  const source = event?.nativeEvent || event || {}
  const key = source.key || ""
  const data = source.data || ""

  if (isDeadKeyMark(data)) return data
  if (isDeadKeyMark(key)) return key

  if (key !== "Dead") return ""

  const mappedCode = source.code ? DEAD_KEY_CODE_MARKS[source.code] : undefined
  if (!mappedCode) return UNKNOWN_DEAD_KEY_MARK

  return source.shiftKey ? mappedCode.shift : mappedCode.default
}

export interface NormalizeInputParams {
  nextValue: string
  previousValue: string
  pendingMark?: string
  referenceText?: string
}

export interface NormalizeInputResult {
  value: string
  pendingMark: string
  ignored: boolean
}

export function normalizeTypingInputValue({
  nextValue,
  previousValue,
  pendingMark = "",
  referenceText = "",
}: NormalizeInputParams): NormalizeInputResult {
  if (nextValue.length < previousValue.length) {
    return { value: nextValue, pendingMark: "", ignored: false }
  }

  const addedChars = nextValue.slice(previousValue.length)
  if (!addedChars) {
    return { value: nextValue, pendingMark, ignored: false }
  }

  let value = previousValue
  let nextPendingMark = pendingMark

  for (const char of addedChars) {
    if (nextPendingMark) {
      if (char === nextPendingMark && isExpectedLiteralDeadKeyMark(char, referenceText[value.length])) {
        value += char
        nextPendingMark = ""
        continue
      }
      if (char === nextPendingMark) continue
      if (isDeadKeyMark(char)) {
        nextPendingMark = char
        continue
      }
      value += composeDeadKeyMark(nextPendingMark, char, referenceText[value.length])
      nextPendingMark = ""
      continue
    }

    if (isDeadKeyMark(char)) {
      if (isExpectedLiteralDeadKeyMark(char, referenceText[value.length])) {
        value += char
        continue
      }
      if (value.length > previousValue.length) {
        const baseChar = value.slice(-1)
        value = `${value.slice(0, -1)}${composeDeadKeyMark(char, baseChar, referenceText[value.length - 1])}`
        continue
      }
      nextPendingMark = char
      continue
    }

    value += char
  }

  return {
    value,
    pendingMark: nextPendingMark,
    ignored: value === previousValue && Boolean(nextPendingMark),
  }
}
