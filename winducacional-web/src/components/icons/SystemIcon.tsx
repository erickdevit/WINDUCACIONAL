import type { SVGProps } from "react"

export type IconName =
  | "about"
  | "book"
  | "calculator"
  | "calendar"
  | "chat"
  | "clipboard"
  | "document"
  | "file-image"
  | "file-pdf"
  | "folder"
  | "globe"
  | "home"
  | "image"
  | "keyboard"
  | "monitor"
  | "palette"
  | "school"
  | "settings"
  | "swords"
  | "users"

interface SystemIconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName
}

const commonProps = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: 1.8,
} as const

export function SystemIcon({ name, className = "h-4 w-4", ...props }: SystemIconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} {...commonProps} {...props}>
      {renderIcon(name)}
    </svg>
  )
}

function renderIcon(name: IconName) {
  switch (name) {
    case "about":
      return (
        <>
          <path d="M4 10l8-4 8 4-8 4-8-4z" />
          <path d="M8 12v4c0 1.2 1.8 2 4 2s4-.8 4-2v-4" />
        </>
      )
    case "book":
      return (
        <>
          <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H20v16H7.5A2.5 2.5 0 0 0 5 21z" />
          <path d="M5 5.5V21" />
          <path d="M9 7h7" />
        </>
      )
    case "calculator":
      return (
        <>
          <rect x="6" y="3" width="12" height="18" rx="2" />
          <path d="M9 7h6M9 11h.01M12 11h.01M15 11h.01M9 15h.01M12 15h.01M15 15h.01M9 18h6" />
        </>
      )
    case "calendar":
      return (
        <>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M8 3v4M16 3v4M4 10h16" />
        </>
      )
    case "chat":
      return (
        <>
          <path d="M5 6.5A3.5 3.5 0 0 1 8.5 3h7A3.5 3.5 0 0 1 19 6.5v4A3.5 3.5 0 0 1 15.5 14H12l-4 4v-4A3.5 3.5 0 0 1 5 10.5z" />
          <path d="M9 8h6M9 11h4" />
        </>
      )
    case "clipboard":
      return (
        <>
          <rect x="6" y="5" width="12" height="16" rx="2" />
          <path d="M9 5a3 3 0 0 1 6 0M9 9h6M9 13h6M9 17h3" />
        </>
      )
    case "document":
      return (
        <>
          <path d="M7 3h7l4 4v14H7z" />
          <path d="M14 3v5h4M9 12h6M9 16h6" />
        </>
      )
    case "file-image":
      return (
        <>
          <path d="M7 3h7l4 4v14H7z" />
          <path d="M14 3v5h4" />
          <circle cx="11" cy="12" r="1.2" />
          <path d="M9 18l3-3 2 2 1-1 2 2" />
        </>
      )
    case "file-pdf":
      return (
        <>
          <path d="M7 3h7l4 4v14H7z" />
          <path d="M14 3v5h4M9 14h6M9 17h4" />
        </>
      )
    case "folder":
      return <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z" />
    case "globe":
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2 2.2 3 5.2 3 9s-1 6.8-3 9M12 3c-2 2.2-3 5.2-3 9s1 6.8 3 9" />
        </>
      )
    case "home":
      return (
        <>
          <path d="M4 11l8-7 8 7" />
          <path d="M6.5 10v10h11V10" />
          <path d="M10 20v-5h4v5" />
        </>
      )
    case "image":
      return (
        <>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <circle cx="9" cy="10" r="1.4" />
          <path d="M6 17l4-4 3 3 2-2 3 3" />
        </>
      )
    case "keyboard":
      return (
        <>
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M6 10h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M7 14h10" />
        </>
      )
    case "monitor":
      return (
        <>
          <rect x="4" y="4" width="16" height="11" rx="2" />
          <path d="M9 20h6M12 15v5" />
        </>
      )
    case "palette":
      return (
        <>
          <path d="M12 4a8 8 0 0 0 0 16h1.5a1.8 1.8 0 0 0 1.2-3.1 1.8 1.8 0 0 1 1.2-3.1H18a2 2 0 0 0 2-2A8 8 0 0 0 12 4z" />
          <path d="M8 11h.01M10 8h.01M14 8h.01" />
        </>
      )
    case "school":
      return (
        <>
          <path d="M4 10l8-5 8 5-8 5-8-5z" />
          <path d="M7 13v5h10v-5M12 15v3" />
        </>
      )
    case "settings":
      return (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v3M12 18v3M4.2 7.5l2.6 1.5M17.2 15l2.6 1.5M4.2 16.5l2.6-1.5M17.2 9l2.6-1.5" />
        </>
      )
    case "swords":
      return (
        <>
          <path d="M5 19l6-6M13 11l6-6M15 5h4v4" />
          <path d="M19 19l-6-6M11 11L5 5M5 5v4h4" />
        </>
      )
    case "users":
      return (
        <>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
          <path d="M16 11a2.5 2.5 0 0 0 0-5M18 19a4.5 4.5 0 0 0-2.5-4" />
        </>
      )
  }
}
