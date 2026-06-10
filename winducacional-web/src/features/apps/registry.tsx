import type { ComponentType } from "react"
import AboutApp from "@/pages/apps/AboutApp"
import AttendanceApp from "@/pages/apps/AttendanceApp"
import CalculatorApp from "@/pages/apps/CalculatorApp"
import ExplorerApp from "@/pages/apps/ExplorerApp"
import SettingsApp from "@/pages/apps/SettingsApp"
import type { UserRole } from "@/types/user"
import type { WindowSize } from "@/features/windows/windowsSlice"

export interface AppDefinition {
  id: string
  title: string
  icon: string
  defaultSize: WindowSize
  component: ComponentType
  // Quando ausente, o app fica visível para todos os perfis.
  roles?: UserRole[]
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
  {
    id: "explorer",
    title: "Explorador de Arquivos",
    icon: "📁",
    defaultSize: { width: 560, height: 420 },
    component: ExplorerApp,
  },
  {
    id: "attendance",
    title: "Frequência",
    icon: "📅",
    defaultSize: { width: 380, height: 420 },
    component: AttendanceApp,
    roles: ["aluno"],
  },
]

export const APPS_BY_ID: Record<string, AppDefinition> = Object.fromEntries(
  APPS.map((app) => [app.id, app]),
)
