// Métricas das lições de digitação, portadas de typing.jsx (legado):
// PPM líquido (bruto menos erros não corrigidos por minuto) e precisão.
import { areTypingCharactersEquivalent } from "./typingInput"

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function countUncorrectedErrors(typedValue: string, referenceText: string): number {
  let errors = 0
  for (let i = 0; i < typedValue.length; i++) {
    if (!areTypingCharactersEquivalent(typedValue[i], referenceText[i])) errors++
  }
  return errors
}

export function calculateLiveWpm(typedValue: string, referenceText: string, elapsedMs: number): number {
  if (!typedValue || !referenceText || elapsedMs <= 0) return 0
  const timeMins = Math.max(0.01, elapsedMs / 60000)
  const uncorrectedErrors = countUncorrectedErrors(typedValue, referenceText)
  const grossWpm = typedValue.length / 5 / timeMins
  return Math.max(0, Math.round(grossWpm - uncorrectedErrors / timeMins))
}

export function calculateAccuracy(typedValue: string, referenceText: string): number {
  if (!typedValue) return 100
  const errors = countUncorrectedErrors(typedValue, referenceText)
  return Math.max(0, Math.round(((typedValue.length - errors) / typedValue.length) * 100))
}

export interface LessonEvaluation {
  wpm: number
  accuracy: number
  errors: number
  passed: boolean
}

export interface LessonThresholds {
  passMinWpm: number
  passMinAccuracy: number
  maxErrors: number
}

export function evaluateLesson(
  typedValue: string,
  referenceText: string,
  elapsedMs: number,
  thresholds: LessonThresholds,
): LessonEvaluation {
  const wpm = calculateLiveWpm(typedValue, referenceText, elapsedMs)
  const accuracy = calculateAccuracy(typedValue, referenceText)
  const errors = countUncorrectedErrors(typedValue, referenceText)

  return {
    wpm,
    accuracy,
    errors,
    passed:
      wpm >= thresholds.passMinWpm &&
      accuracy >= thresholds.passMinAccuracy &&
      errors <= thresholds.maxErrors,
  }
}

// Momentum (barra de ritmo) exibido durante a lição, portado de typing.jsx.
export interface MomentumParams {
  accuracyValue: number
  comboValue: number
  progressValue: number
  lessonLength: number
  liveWpm: number
  passMinWpm: number
  passMinAccuracy: number
}

export function calculateMomentum({
  accuracyValue,
  comboValue,
  progressValue,
  lessonLength,
  liveWpm,
  passMinWpm,
  passMinAccuracy,
}: MomentumParams): number {
  if (!lessonLength) return 0
  const speedRatio = clamp(liveWpm / passMinWpm, 0, 1.35)
  const accuracyRatio = clamp(accuracyValue / passMinAccuracy, 0, 1.1)
  const comboRatio = clamp(comboValue / 24, 0, 1)
  const progressRatio = clamp(progressValue / lessonLength, 0, 1)

  return Math.round(
    clamp(speedRatio * 34 + accuracyRatio * 34 + comboRatio * 20 + progressRatio * 12, 0, 100),
  )
}

// Rotação de variantes por lição: cada conclusão avança para o próximo texto.
export function getVariantIndex(savedIndex: number, variantCount: number): number {
  const limit = variantCount || 1
  return ((Math.trunc(savedIndex) % limit) + limit) % limit
}
