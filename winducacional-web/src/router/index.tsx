import { createBrowserRouter, type RouteObject } from "react-router-dom"
import { AppGate, RequireAuth, RequireGuest } from "@/components/layout/RouteGuards"
import BootstrapPage from "@/pages/auth/BootstrapPage"
import LoginPage from "@/pages/auth/LoginPage"
import RegisterPage from "@/pages/auth/RegisterPage"
import AttendancePage from "@/pages/attendance/AttendancePage"
import DesktopPage from "@/pages/desktop/DesktopPage"

export const routes: RouteObject[] = [
  {
    element: <AppGate />,
    children: [
      { path: "/bootstrap", element: <BootstrapPage /> },
      {
        element: <RequireGuest />,
        children: [
          { path: "/login", element: <LoginPage /> },
          { path: "/cadastro", element: <RegisterPage /> },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          { path: "/", element: <DesktopPage /> },
          { path: "/frequencia", element: <AttendancePage /> },
        ],
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
