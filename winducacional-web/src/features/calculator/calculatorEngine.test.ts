import { describe, expect, it } from "vitest"
import {
  applyUnary,
  backspace,
  calculateEquals,
  clearAll,
  clearEntry,
  DIVISION_BY_ZERO_MESSAGE,
  INITIAL_CALCULATOR_STATE,
  inputDecimal,
  inputDigit,
  inputOperator,
  INVALID_INPUT_MESSAGE,
  toggleSign,
  type CalculatorState,
} from "./calculatorEngine"

function digits(state: CalculatorState, value: string): CalculatorState {
  return [...value].reduce((acc, digit) => inputDigit(acc, digit), state)
}

describe("calculatorEngine", () => {
  it("monta números de múltiplos dígitos", () => {
    const state = digits(INITIAL_CALCULATOR_STATE, "123")

    expect(state.display).toBe("123")
  })

  it("substitui o zero inicial ao digitar o primeiro dígito", () => {
    const state = inputDigit(INITIAL_CALCULATOR_STATE, "5")

    expect(state.display).toBe("5")
  })

  it("adiciona ponto decimal e impede duplicidade", () => {
    let state = digits(INITIAL_CALCULATOR_STATE, "12")
    state = inputDecimal(state)
    state = digits(state, "5")
    state = inputDecimal(state)

    expect(state.display).toBe("12.5")
  })

  it("inicia com '0.' ao pressionar ponto decimal em estado limpo", () => {
    const state = inputDecimal(INITIAL_CALCULATOR_STATE)

    expect(state.display).toBe("0.")
  })

  it("calcula uma soma simples com igual", () => {
    let state = digits(INITIAL_CALCULATOR_STATE, "5")
    state = inputOperator(state, "+")
    state = digits(state, "3")
    state = calculateEquals(state)

    expect(state.display).toBe("8")
    expect(state.history[0]).toMatchObject({ expression: "5 + 3 =", result: "8" })
  })

  it("encadeia operadores aplicando o cálculo pendente", () => {
    let state = digits(INITIAL_CALCULATOR_STATE, "5")
    state = inputOperator(state, "+")
    state = digits(state, "3")
    state = inputOperator(state, "+")

    expect(state.display).toBe("8")
    expect(state.previousValue).toBe(8)
    expect(state.operator).toBe("+")
  })

  it("trocar o operador antes de digitar o segundo número apenas atualiza o operador", () => {
    let state = digits(INITIAL_CALCULATOR_STATE, "5")
    state = inputOperator(state, "+")
    state = inputOperator(state, "×")

    expect(state.display).toBe("5")
    expect(state.previousValue).toBe(5)
    expect(state.operator).toBe("×")
  })

  it("igual sem operador pendente não altera o estado", () => {
    const state = digits(INITIAL_CALCULATOR_STATE, "7")

    expect(calculateEquals(state)).toEqual(state)
  })

  it("divisão por zero via igual mostra mensagem de erro", () => {
    let state = digits(INITIAL_CALCULATOR_STATE, "8")
    state = inputOperator(state, "÷")
    state = inputDigit(state, "0")
    state = calculateEquals(state)

    expect(state.display).toBe(DIVISION_BY_ZERO_MESSAGE)
    expect(state.error).toBe(DIVISION_BY_ZERO_MESSAGE)
  })

  it("digitar após um erro reinicia a calculadora", () => {
    let state = digits(INITIAL_CALCULATOR_STATE, "8")
    state = inputOperator(state, "÷")
    state = inputDigit(state, "0")
    state = calculateEquals(state)
    state = inputDigit(state, "5")

    expect(state).toEqual(inputDigit(INITIAL_CALCULATOR_STATE, "5"))
  })

  it("apaga o último dígito com backspace", () => {
    let state = digits(INITIAL_CALCULATOR_STATE, "123")
    state = backspace(state)

    expect(state.display).toBe("12")
  })

  it("backspace no último dígito volta para zero e habilita sobrescrita", () => {
    let state = inputDigit(INITIAL_CALCULATOR_STATE, "5")
    state = backspace(state)

    expect(state.display).toBe("0")
    expect(state.overwrite).toBe(true)
  })

  it("CE limpa apenas a entrada atual", () => {
    let state = digits(INITIAL_CALCULATOR_STATE, "5")
    state = inputOperator(state, "+")
    state = digits(state, "3")
    state = clearEntry(state)

    expect(state.display).toBe("0")
    expect(state.previousValue).toBe(5)
    expect(state.operator).toBe("+")
  })

  it("C reinicia todo o estado", () => {
    const state = clearAll()

    expect(state).toEqual(INITIAL_CALCULATOR_STATE)
  })

  it("alterna o sinal do número exibido", () => {
    let state = digits(INITIAL_CALCULATOR_STATE, "5")
    state = toggleSign(state)

    expect(state.display).toBe("-5")

    state = toggleSign(state)
    expect(state.display).toBe("5")
  })

  it("não altera o sinal de zero", () => {
    const state = toggleSign(INITIAL_CALCULATOR_STATE)

    expect(state.display).toBe("0")
  })

  it("eleva ao quadrado", () => {
    const state = applyUnary(digits(INITIAL_CALCULATOR_STATE, "9"), "square")

    expect(state.display).toBe("81")
  })

  it("calcula raiz quadrada", () => {
    const state = applyUnary(digits(INITIAL_CALCULATOR_STATE, "81"), "sqrt")

    expect(state.display).toBe("9")
  })

  it("raiz quadrada de número negativo retorna entrada inválida", () => {
    let state = digits(INITIAL_CALCULATOR_STATE, "9")
    state = toggleSign(state)
    state = applyUnary(state, "sqrt")

    expect(state.display).toBe(INVALID_INPUT_MESSAGE)
    expect(state.error).toBe(INVALID_INPUT_MESSAGE)
  })

  it("calcula o inverso (1/x)", () => {
    const state = applyUnary(digits(INITIAL_CALCULATOR_STATE, "4"), "reciprocal")

    expect(state.display).toBe("0.25")
  })

  it("inverso de zero mostra divisão por zero", () => {
    const state = applyUnary(INITIAL_CALCULATOR_STATE, "reciprocal")

    expect(state.display).toBe(DIVISION_BY_ZERO_MESSAGE)
    expect(state.error).toBe(DIVISION_BY_ZERO_MESSAGE)
  })

  it("calcula porcentagem em relação ao valor anterior", () => {
    let state = digits(INITIAL_CALCULATOR_STATE, "200")
    state = inputOperator(state, "+")
    state = digits(state, "10")
    state = applyUnary(state, "percent")

    expect(state.display).toBe("20")
  })
})
