import "@testing-library/jest-dom/vitest"

const localStorageMock = (() => {
  const store = new Map<string, string>()
  return {
    get length() {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => store.delete(key),
    setItem: (key: string, value: string) => store.set(key, String(value)),
  }
})()

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  configurable: true,
})

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  configurable: true,
})
