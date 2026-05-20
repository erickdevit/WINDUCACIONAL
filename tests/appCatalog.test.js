import { beforeEach, describe, expect, it, vi } from "vitest";

const createStorage = (overrides = {}) => {
  const store = new Map(Object.entries(overrides));

  return {
    getItem: vi.fn((key) => (store.has(key) ? store.get(key) : null)),
    setItem: vi.fn((key, value) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key) => {
      store.delete(key);
    }),
  };
};

describe("Catálogo de apps", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("deve registrar o ITB Ouro Moderno como app interno em iframe com ícone local", async () => {
    vi.stubGlobal("localStorage", createStorage());

    const { allApps } = await import("../src/utils");
    const app = allApps.find((item) => item.name === "ITB Ouro Moderno");

    expect(app).toMatchObject({
      name: "ITB Ouro Moderno",
      icon: "itbOuroModerno",
      action: "ITBOUROMODERNO",
      pwa: true,
      data: {
        type: "IFrame",
        url: "https://itbcurso.shyr.it/",
      },
    });
  });

  it("deve registrar o app Atalhos na área de trabalho", async () => {
    vi.stubGlobal("localStorage", createStorage());

    const { allApps, desktopApps } = await import("../src/utils");
    const app = allApps.find((item) => item.name === "Atalhos");

    expect(app).toMatchObject({
      name: "Atalhos",
      icon: "atalhos",
      action: "SHORTCUTSAPP",
      type: "app",
    });
    expect(desktopApps.map((item) => item.name)).toContain("Atalhos");
  });

  it("deve manter logos separadas para Digitação e Digitação Kids", async () => {
    vi.stubGlobal("localStorage", createStorage());

    const { allApps } = await import("../src/utils");

    expect(allApps.find((item) => item.name === "Digitação")).toMatchObject({
      icon: "typing",
    });
    expect(
      allApps.find((item) => item.name === "Digitação Kids")
    ).toMatchObject({
      icon: "typingKids",
    });
  });

  it("deve migrar o nome antigo e semear o atalho do ITB Ouro Moderno na área de trabalho", async () => {
    const localStorageMock = createStorage({
      desktop: JSON.stringify(["Usuário", "ITB Curso", "Loja"]),
    });
    vi.stubGlobal("localStorage", localStorageMock);

    const { desktopApps } = await import("../src/utils");

    expect(desktopApps.map((app) => app.name)).toEqual([
      "Usuário",
      "ITB Ouro Moderno",
      "Loja",
      "Atalhos",
      "Gestor",
      "Avaliação",
    ]);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "desktop",
      JSON.stringify(["Usuário", "ITB Ouro Moderno", "Loja"])
    );
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "desktop-rename-itb-ouro-moderno-v1",
      "true"
    );
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "desktop-seed-itb-ouro-moderno-v1",
      "true"
    );
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "desktop-seed-atalhos-v1",
      "true"
    );
  });
});
