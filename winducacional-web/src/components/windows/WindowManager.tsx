import { useAppSelector } from "@/app/hooks"
import { APPS_BY_ID } from "@/features/apps/registry"
import { selectWindows } from "@/features/windows/windowsSlice"
import { AppWindow } from "./AppWindow"

export function WindowManager() {
  const windows = useAppSelector(selectWindows)

  return (
    <>
      {windows
        .filter((win) => !win.minimized)
        .map((win) => {
          const app = APPS_BY_ID[win.appId]
          if (!app) return null

          const AppComponent = app.component
          return (
            <AppWindow key={win.id} window={win}>
              <AppComponent />
            </AppWindow>
          )
        })}
    </>
  )
}
