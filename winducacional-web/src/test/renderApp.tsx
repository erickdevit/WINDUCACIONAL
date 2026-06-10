import { render } from "@testing-library/react"
import { Provider } from "react-redux"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { createAppStore } from "@/app/store"
import { routes } from "@/router"

// Renderiza a árvore de rotas com store e histórico isolados por teste,
// evitando o cache do RTK Query e o histórico de navegação compartilhados
// pelas instâncias singleton de src/app/store.ts e src/router/index.tsx.
export function renderApp(initialPath = "/") {
  const store = createAppStore()
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] })

  return render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>,
  )
}
