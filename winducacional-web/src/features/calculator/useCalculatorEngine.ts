import { useCallback, useReducer } from "react"
import {
  applyUnary,
  backspace,
  calculateEquals,
  clearAll,
  clearEntry,
  INITIAL_CALCULATOR_STATE,
  inputDecimal,
  inputDigit,
  inputOperator,
  toggleSign,
  type CalculatorState,
  type Operator,
  type UnaryOperator,
} from "./calculatorEngine"

type CalculatorAction =
  | { type: "digit"; digit: string }
  | { type: "decimal" }
  | { type: "operator"; operator: Operator }
  | { type: "equals" }
  | { type: "unary"; op: UnaryOperator }
  | { type: "toggleSign" }
  | { type: "backspace" }
  | { type: "clearEntry" }
  | { type: "clearAll" }

function reducer(state: CalculatorState, action: CalculatorAction): CalculatorState {
  switch (action.type) {
    case "digit":
      return inputDigit(state, action.digit)
    case "decimal":
      return inputDecimal(state)
    case "operator":
      return inputOperator(state, action.operator)
    case "equals":
      return calculateEquals(state)
    case "unary":
      return applyUnary(state, action.op)
    case "toggleSign":
      return toggleSign(state)
    case "backspace":
      return backspace(state)
    case "clearEntry":
      return clearEntry(state)
    case "clearAll":
      return clearAll()
  }
}

export function useCalculatorEngine() {
  const [state, dispatch] = useReducer(reducer, INITIAL_CALCULATOR_STATE)

  return {
    state,
    inputDigit: useCallback((digit: string) => dispatch({ type: "digit", digit }), []),
    inputDecimal: useCallback(() => dispatch({ type: "decimal" }), []),
    inputOperator: useCallback((operator: Operator) => dispatch({ type: "operator", operator }), []),
    equals: useCallback(() => dispatch({ type: "equals" }), []),
    applyUnary: useCallback((op: UnaryOperator) => dispatch({ type: "unary", op }), []),
    toggleSign: useCallback(() => dispatch({ type: "toggleSign" }), []),
    backspace: useCallback(() => dispatch({ type: "backspace" }), []),
    clearEntry: useCallback(() => dispatch({ type: "clearEntry" }), []),
    clearAll: useCallback(() => dispatch({ type: "clearAll" }), []),
  }
}
