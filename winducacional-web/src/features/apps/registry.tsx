import type { ComponentType } from "react"
import AboutApp from "@/pages/apps/AboutApp"
import CalculatorApp from "@/pages/apps/CalculatorApp"
import SettingsApp from "@/pages/apps/SettingsApp"
import type { WindowSize } from "@/features/windows/windowsSlice"

export interface AppDefinition {
  id: string
  title: string
  icon: string
  defaultSize: WindowSize
  component: ComponentType
}

// Registro de apps disponíveis no menu Iniciar. Cada item vira uma janela
// gerenciada por windowsSlice quando aberto.
export const APPS: AppDefinition[] = [
  {
    id: "about",
    title: "Sobre",
    icon: "🧑‍🎓",
    defaultSize: { width: 360, height: 280 },
    component: AboutApp,
  },
  {
    id: "settings",
    title: "Configurações",
    icon: "⚙️",
    defaultSize: { width: 380, height: 320 },
    component: SettingsApp,
  },
  {
    id: "calculator",
    title: "Calculadora",
    icon: "🧮",
    defaultSize: { width: 320, height: 560 },
    component: CalculatorApp,
  },
]

export const APPS_BY_ID: Record<string, AppDefinition> = Object.fromEntries(
  APPS.map((app) => [app.id, app]),
)
