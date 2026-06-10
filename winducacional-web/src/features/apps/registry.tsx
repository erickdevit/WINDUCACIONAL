import type { ComponentType } from "react"
import AboutApp from "@/pages/apps/AboutApp"
import AttendanceApp from "@/pages/apps/AttendanceApp"
import BookletsApp from "@/pages/apps/BookletsApp"
import CalculatorApp from "@/pages/apps/CalculatorApp"
import ChatApp from "@/pages/apps/ChatApp"
import ExamsApp from "@/pages/apps/ExamsApp"
import ExplorerApp from "@/pages/apps/ExplorerApp"
import GestorApp from "@/pages/apps/GestorApp"
import NotepadApp from "@/pages/apps/NotepadApp"
import SchoolAdminApp from "@/pages/apps/SchoolAdminApp"
import SettingsApp from "@/pages/apps/SettingsApp"
import TypingApp from "@/pages/apps/TypingApp"
import type { UserRole } from "@/types/user"
import type { WindowSize } from "@/features/windows/windowsSlice"

export interface AppComponentProps {
  // Dados de abertura específicos do app, ex.: caminho do arquivo para o Bloco de Notas.
  payload?: unknown
}

export interface AppDefinition {
  id: string
  title: string
  icon: string
  defaultSize: WindowSize
  component: ComponentType<AppComponentProps>
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
  {
    id: "gestor",
    title: "Gestor de Sessões",
    icon: "🖥️",
    defaultSize: { width: 420, height: 440 },
    component: GestorApp,
    roles: ["professor", "secretaria"],
  },
  {
    id: "booklets",
    title: "Apostilas",
    icon: "📚",
    defaultSize: { width: 420, height: 480 },
    component: BookletsApp,
  },
  {
    id: "notepad",
    title: "Bloco de Notas",
    icon: "📝",
    defaultSize: { width: 480, height: 420 },
    component: NotepadApp,
  },
  {
    id: "typing",
    title: "Digitação",
    icon: "⌨️",
    defaultSize: { width: 640, height: 520 },
    component: TypingApp,
  },
  {
    id: "chat",
    title: "Chat",
    icon: "💬",
    defaultSize: { width: 560, height: 460 },
    component: ChatApp,
  },
  {
    id: "exams",
    title: "Avaliações",
    icon: "📋",
    defaultSize: { width: 560, height: 500 },
    component: ExamsApp,
  },
  {
    id: "school-admin",
    title: "Gestão Escolar",
    icon: "🏫",
    defaultSize: { width: 560, height: 500 },
    component: SchoolAdminApp,
    roles: ["professor", "secretaria"],
  },
]

export const APPS_BY_ID: Record<string, AppDefinition> = Object.fromEntries(
  APPS.map((app) => [app.id, app]),
)
