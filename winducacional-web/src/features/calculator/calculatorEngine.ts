export type Operator = "+" | "−" | "×" | "÷"
export type UnaryOperator = "square" | "sqrt" | "reciprocal" | "percent"

export interface HistoryEntry {
  id: string
  expression: string
  result: string
}

export interface CalculatorState {
  display: string
  previousValue: number | null
  operator: Operator | null
  overwrite: boolean
  history: HistoryEntry[]
  error: string | null
}

export const DIVISION_BY_ZERO_MESSAGE = "Não é possível dividir por zero"
export const INVALID_INPUT_MESSAGE = "Entrada inválida"

const MAX_DISPLAY_DIGITS = 16
const MAX_SIGNIFICANT_DIGITS = 15
const MAX_HISTORY = 20

export const INITIAL_CALCULATOR_STATE: CalculatorState = {
  display: "0",
  previousValue: null,
  operator: null,
  overwrite: true,
  history: [],
  error: null,
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "Erro"
  if (value === 0) return "0"

  const rounded = Number(value.toPrecision(MAX_SIGNIFICANT_DIGITS))
  let text = rounded.toString()

  if (!text.includes("e")) {
    const digitsOnly = text.replace(/[-.]/g, "")
    if (digitsOnly.length > MAX_DISPLAY_DIGITS) {
      text = rounded.toExponential(9)
    }
  }

  return text
}

function operate(a: number, b: number, operator: Operator): number | "div-by-zero" {
  switch (operator) {
    case "+":
      return a + b
    case "−":
      return a - b
    case "×":
      return a * b
    case "÷":
      if (b === 0) return "div-by-zero"
      return a / b
  }
}

function withDivisionByZero(state: CalculatorState): CalculatorState {
  return {
    ...state,
    display: DIVISION_BY_ZERO_MESSAGE,
    error: DIVISION_BY_ZERO_MESSAGE,
    previousValue: null,
    operator: null,
    overwrite: true,
  }
}

export function inputDigit(state: CalculatorState, digit: string): CalculatorState {
  if (state.error) return inputDigit(clearAll(), digit)

  if (state.overwrite) {
    return { ...state, display: digit, overwrite: false }
  }

  if (state.display === "0") {
    return { ...state, display: digit }
  }

  const digitsOnly = state.display.replace(/[-.]/g, "")
  if (digitsOnly.length >= MAX_DISPLAY_DIGITS) return state

  return { ...state, display: state.display + digit }
}

export function inputDecimal(state: CalculatorState): CalculatorState {
  if (state.error) return inputDecimal(clearAll())

  if (state.overwrite) {
    return { ...state, display: "0.", overwrite: false }
  }

  if (state.display.includes(".")) return state

  return { ...state, display: state.display + "." }
}

export function toggleSign(state: CalculatorState): CalculatorState {
  if (state.error) return state
  if (state.display === "0") return state

  return {
    ...state,
    display: state.display.startsWith("-") ? state.display.slice(1) : `-${state.display}`,
  }
}

export function backspace(state: CalculatorState): CalculatorState {
  if (state.error) return clearAll()
  if (state.overwrite) return state

  const next = state.display.slice(0, -1)
  if (next === "" || next === "-") {
    return { ...state, display: "0", overwrite: true }
  }

  return { ...state, display: next }
}

export function clearEntry(state: CalculatorState): CalculatorState {
  return { ...state, display: "0", overwrite: true, error: null }
}

export function clearAll(): CalculatorState {
  return INITIAL_CALCULATOR_STATE
}

export function inputOperator(state: CalculatorState, operator: Operator): CalculatorState {
  if (state.error) return state

  const current = Number.parseFloat(state.display)

  if (state.operator !== null && state.previousValue !== null && !state.overwrite) {
    const result = operate(state.previousValue, current, state.operator)
    if (result === "div-by-zero") return withDivisionByZero(state)
    return { ...state, display: formatNumber(result), previousValue: result, operator, overwrite: true }
  }

  return { ...state, previousValue: current, operator, overwrite: true }
}

export function calculateEquals(state: CalculatorState): CalculatorState {
  if (state.error) return state
  if (state.operator === null || state.previousValue === null) return state

  const current = Number.parseFloat(state.display)
  const result = operate(state.previousValue, current, state.operator)
  if (result === "div-by-zero") return withDivisionByZero(state)

  const expression = `${formatNumber(state.previousValue)} ${state.operator} ${formatNumber(current)} =`
  const resultText = formatNumber(result)

  return {
    ...state,
    display: resultText,
    previousValue: null,
    operator: null,
    overwrite: true,
    history: [{ id: crypto.randomUUID(), expression, result: resultText }, ...state.history].slice(0, MAX_HISTORY),
  }
}

export function applyUnary(state: CalculatorState, op: UnaryOperator): CalculatorState {
  if (state.error) return state

  const current = Number.parseFloat(state.display)

  switch (op) {
    case "square":
      return { ...state, display: formatNumber(current ** 2), overwrite: true }
    case "sqrt":
      if (current < 0) {
        return { ...state, display: INVALID_INPUT_MESSAGE, error: INVALID_INPUT_MESSAGE, overwrite: true }
      }
      return { ...state, display: formatNumber(Math.sqrt(current)), overwrite: true }
    case "reciprocal":
      if (current === 0) return withDivisionByZero(state)
      return { ...state, display: formatNumber(1 / current), overwrite: true }
    case "percent": {
      const value = state.previousValue !== null ? (state.previousValue * current) / 100 : current / 100
      return { ...state, display: formatNumber(value), overwrite: true }
    }
  }
}
