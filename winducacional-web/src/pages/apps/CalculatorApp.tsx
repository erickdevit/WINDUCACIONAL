import { memo } from "react"
import { formatNumber } from "@/features/calculator/calculatorEngine"
import { useCalculatorEngine } from "@/features/calculator/useCalculatorEngine"

type ButtonVariant = "digit" | "operator" | "function" | "equals"

interface CalculatorButtonProps {
  label: string
  variant: ButtonVariant
  ariaLabel?: string
  onClick: () => void
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  digit: "bg-white/5 hover:bg-white/10",
  operator: "bg-white/10 text-accent hover:bg-white/20",
  function: "bg-white/5 text-sm text-white/70 hover:bg-white/10",
  equals: "bg-accent text-white hover:bg-accent-hover",
}

const CalculatorButton = memo(function CalculatorButton({ label, variant, ariaLabel, onClick }: CalculatorButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel ?? label}
      onClick={onClick}
      className={`flex h-12 items-center justify-center rounded-md text-lg font-medium transition ${VARIANT_CLASSES[variant]}`}
    >
      {label}
    </button>
  )
})

export default function CalculatorApp() {
  const calc = useCalculatorEngine()
  const { state } = calc

  const expression =
    state.previousValue !== null && state.operator !== null
      ? `${formatNumber(state.previousValue)} ${state.operator}`
      : ""

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-col items-end justify-end rounded-md bg-black/30 px-3 py-2">
        <span className="h-5 text-xs text-white/50">{expression}</span>
        <span role="status" aria-label="Visor" className="truncate text-3xl font-light tabular-nums">
          {state.display}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <CalculatorButton label="%" variant="function" ariaLabel="Porcentagem" onClick={() => calc.applyUnary("percent")} />
        <CalculatorButton label="CE" variant="function" ariaLabel="Limpar entrada" onClick={calc.clearEntry} />
        <CalculatorButton label="C" variant="function" ariaLabel="Limpar tudo" onClick={calc.clearAll} />
        <CalculatorButton label="⌫" variant="function" ariaLabel="Apagar" onClick={calc.backspace} />

        <CalculatorButton label="1/x" variant="function" ariaLabel="Inverso" onClick={() => calc.applyUnary("reciprocal")} />
        <CalculatorButton label="x²" variant="function" ariaLabel="Quadrado" onClick={() => calc.applyUnary("square")} />
        <CalculatorButton label="²√x" variant="function" ariaLabel="Raiz quadrada" onClick={() => calc.applyUnary("sqrt")} />
        <CalculatorButton label="÷" variant="operator" ariaLabel="Dividir" onClick={() => calc.inputOperator("÷")} />

        <CalculatorButton label="7" variant="digit" onClick={() => calc.inputDigit("7")} />
        <CalculatorButton label="8" variant="digit" onClick={() => calc.inputDigit("8")} />
        <CalculatorButton label="9" variant="digit" onClick={() => calc.inputDigit("9")} />
        <CalculatorButton label="×" variant="operator" ariaLabel="Multiplicar" onClick={() => calc.inputOperator("×")} />

        <CalculatorButton label="4" variant="digit" onClick={() => calc.inputDigit("4")} />
        <CalculatorButton label="5" variant="digit" onClick={() => calc.inputDigit("5")} />
        <CalculatorButton label="6" variant="digit" onClick={() => calc.inputDigit("6")} />
        <CalculatorButton label="−" variant="operator" ariaLabel="Subtrair" onClick={() => calc.inputOperator("−")} />

        <CalculatorButton label="1" variant="digit" onClick={() => calc.inputDigit("1")} />
        <CalculatorButton label="2" variant="digit" onClick={() => calc.inputDigit("2")} />
        <CalculatorButton label="3" variant="digit" onClick={() => calc.inputDigit("3")} />
        <CalculatorButton label="+" variant="operator" ariaLabel="Somar" onClick={() => calc.inputOperator("+")} />

        <CalculatorButton label="±" variant="function" ariaLabel="Alternar sinal" onClick={calc.toggleSign} />
        <CalculatorButton label="0" variant="digit" onClick={() => calc.inputDigit("0")} />
        <CalculatorButton label="." variant="digit" ariaLabel="Ponto decimal" onClick={calc.inputDecimal} />
        <CalculatorButton label="=" variant="equals" ariaLabel="Igual" onClick={calc.equals} />
      </div>

      <div className="flex-1 overflow-auto rounded-md bg-black/20 p-2">
        <p className="mb-1 text-xs font-semibold text-white/60">Histórico</p>
        {state.history.length === 0 ? (
          <p className="text-xs text-white/40">Sem histórico ainda.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-right text-sm">
            {state.history.map((entry) => (
              <li key={entry.id} className="border-b border-white/5 pb-1 text-white/70">
                <div className="text-xs text-white/40">{entry.expression}</div>
                <div>{entry.result}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
