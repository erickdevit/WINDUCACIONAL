import type { InputHTMLAttributes } from "react"

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  id: string
}

export function TextField({ label, id, className = "", ...inputProps }: TextFieldProps) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1 block text-sm text-white/70">
        {label}
      </label>
      <input
        id={id}
        className={`w-full rounded-md border border-desktop-border bg-desktop-elevated px-3 py-2 text-white outline-none transition focus:border-accent ${className}`}
        {...inputProps}
      />
    </div>
  )
}
