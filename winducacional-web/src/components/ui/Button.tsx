import type { ButtonHTMLAttributes } from "react"

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>

export function Button({ className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`w-full rounded-md bg-accent px-4 py-2 font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    />
  )
}
