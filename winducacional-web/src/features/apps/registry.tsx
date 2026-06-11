import type { ComponentType } from "react"
import AboutApp from "@/pages/apps/AboutApp"
import AttendanceApp from "@/pages/apps/AttendanceApp"
import BookletsApp from "@/pages/apps/BookletsApp"
import CalculatorApp from "@/pages/apps/CalculatorApp"
import ChatApp from "@/pages/apps/ChatApp"
import EdgeApp from "@/pages/apps/EdgeApp"
import ExamsApp from "@/pages/apps/ExamsApp"
import ExplorerApp from "@/pages/apps/ExplorerApp"
import ImagegenApp from "@/pages/apps/ImagegenApp"
import GestorApp from "@/pages/apps/GestorApp"
import NotepadApp from "@/pages/apps/NotepadApp"
import PvpApp from "@/pages/apps/PvpApp"
import SchoolAdminApp from "@/pages/apps/SchoolAdminApp"
import SettingsApp from "@/pages/apps/SettingsApp"
import TypingApp from "@/pages/apps/TypingApp"
import type { UserRole } from "@/types/user"
import type { WindowSize } from "@/features/windows/windowsSlice"
import type { IconName } from "@/components/icons/SystemIcon"

export interface AppComponentProps {
  // Dados de abertura específicos do app, ex.: caminho do arquivo para o Bloco de Notas.
  payload?: unknown
}

export interface AppDefinition {
  id: string
  title: string
  icon: IconName
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
    icon: "about",
    defaultSize: { width: 360, height: 280 },
    component: AboutApp,
  },
  {
    id: "settings",
    title: "Configurações",
    icon: "settings",
    defaultSize: { width: 380, height: 320 },
    component: SettingsApp,
  },
  {
    id: "calculator",
    title: "Calculadora",
    icon: "calculator",
    defaultSize: { width: 320, height: 560 },
    component: CalculatorApp,
  },
  {
    id: "explorer",
    title: "Explorador de Arquivos",
    icon: "folder",
    defaultSize: { width: 560, height: 420 },
    component: ExplorerApp,
  },
  {
    id: "attendance",
    title: "Frequência",
    icon: "calendar",
    defaultSize: { width: 720, height: 560 },
    component: AttendanceApp,
    roles: ["aluno", "professor", "secretaria"],
  },
  {
    id: "gestor",
    title: "Gestor de Sessões",
    icon: "monitor",
    defaultSize: { width: 420, height: 440 },
    component: GestorApp,
    roles: ["professor", "secretaria"],
  },
  {
    id: "booklets",
    title: "Apostilas",
    icon: "book",
    defaultSize: { width: 420, height: 480 },
    component: BookletsApp,
  },
  {
    id: "notepad",
    title: "Bloco de Notas",
    icon: "document",
    defaultSize: { width: 480, height: 420 },
    component: NotepadApp,
  },
  {
    id: "typing",
    title: "Digitação",
    icon: "keyboard",
    defaultSize: { width: 640, height: 520 },
    component: TypingApp,
  },
  {
    id: "chat",
    title: "Chat",
    icon: "chat",
    defaultSize: { width: 560, height: 460 },
    component: ChatApp,
  },
  {
    id: "exams",
    title: "Avaliações",
    icon: "clipboard",
    defaultSize: { width: 560, height: 500 },
    component: ExamsApp,
  },
  {
    id: "school-admin",
    title: "Gestão Escolar",
    icon: "school",
    defaultSize: { width: 560, height: 500 },
    component: SchoolAdminApp,
    roles: ["professor", "secretaria"],
  },
  {
    id: "typing-pvp",
    title: "Duelo de Digitação",
    icon: "swords",
    defaultSize: { width: 480, height: 460 },
    component: PvpApp,
    roles: ["aluno"],
  },
  {
    id: "edge",
    title: "Navegador",
    icon: "globe",
    defaultSize: { width: 720, height: 520 },
    component: EdgeApp,
  },
  {
    id: "imagegen",
    title: "Gerador de Imagens",
    icon: "palette",
    defaultSize: { width: 520, height: 520 },
    component: ImagegenApp,
  },
]

export const APPS_BY_ID: Record<string, AppDefinition> = Object.fromEntries(
  APPS.map((app) => [app.id, app]),
)
