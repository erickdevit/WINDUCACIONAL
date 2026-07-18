import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";

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

  it("deve registrar o ITB Ouro Moderno como app interno com URL dinâmica", async () => {
    vi.stubGlobal("localStorage", createStorage());

    const { allApps } = await import("../src/utils");
    const app = allApps.find((item) => item.name === "ITB Ouro Moderno");

    expect(app).toMatchObject({
      name: "ITB Ouro Moderno",
      icon: "itbOuroModerno",
      action: "ITBOUROMODERNO",
      type: "app",
    });
    expect(app.pwa).toBeUndefined();
  });

  it("deve registrar o app Lições na área de trabalho", async () => {
    vi.stubGlobal("localStorage", createStorage());

    const { allApps, desktopApps } = await import("../src/utils");
    const app = allApps.find((item) => item.name === "Lições");

    expect(app).toMatchObject({
      name: "Lições",
      icon: "lessons",
      action: "LESSONSAPP",
      type: "app",
    });
    expect(desktopApps.map((item) => item.name)).toContain("Lições");
  });

  it("deve registrar Montagem de PC para todos os alunos", async () => {
    vi.stubGlobal("localStorage", createStorage());

    const { allApps, desktopApps } = await import("../src/utils");
    const app = allApps.find((item) => item.name === "Montagem de PC");

    expect(app).toMatchObject({
      name: "Montagem de PC",
      icon: "pcBuilder",
      action: "PCBUILDERAPP",
      type: "app",
    });
    expect(app.studentAccess).toBeUndefined();
    expect(desktopApps.map((item) => item.name)).toContain("Montagem de PC");
  });

  it("deve usar o ícone SVG local de lições", () => {
    const iconSource = fs.readFileSync(
      new URL("../src/utils/general.jsx", import.meta.url),
      "utf8"
    );

    expect(iconSource).toContain('props.src === "lessons"');
    expect(iconSource).toContain("img/icon/lessons.svg");
  });

  it("deve reutilizar o ícone local de computador para Montagem de PC", () => {
    const iconSource = fs.readFileSync(
      new URL("../src/utils/general.jsx", import.meta.url),
      "utf8"
    );

    expect(iconSource).toContain('props.src === "pcBuilder"');
    expect(iconSource).toContain("img/icon/win/thispc.png");
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

  it("deve registrar o app Frequência na área de trabalho", async () => {
    vi.stubGlobal("localStorage", createStorage());

    const { allApps, desktopApps } = await import("../src/utils");
    const app = allApps.find((item) => item.name === "Frequência");

    expect(app).toMatchObject({
      name: "Frequência",
      icon: "attendance",
      action: "ATTENDANCEAPP",
      type: "app",
    });
    expect(desktopApps.map((item) => item.name)).toContain("Frequência");
  });

  it("deve registrar o app Apostilas na área de trabalho", async () => {
    vi.stubGlobal("localStorage", createStorage());

    const { allApps, desktopApps } = await import("../src/utils");
    const app = allApps.find((item) => item.name === "Apostilas");

    expect(app).toMatchObject({
      name: "Apostilas",
      icon: "booklets",
      action: "BOOKLETSAPP",
      type: "app",
    });
    expect(desktopApps.map((item) => item.name)).toContain("Apostilas");
  });

  it("deve registrar o app Fotos como visualizador interno do sistema", async () => {
    vi.stubGlobal("localStorage", createStorage());

    const { allApps } = await import("../src/utils");
    const app = allApps.find((item) => item.name === "Fotos");

    expect(app).toMatchObject({
      name: "Fotos",
      icon: "photos",
      action: "PHOTOS",
      type: "app",
    });
  });

  it("deve usar o ícone SVG local de frequência", () => {
    const iconSource = fs.readFileSync(
      new URL("../src/utils/general.jsx", import.meta.url),
      "utf8"
    );

    expect(iconSource).toContain('props.src === "attendance"');
    expect(iconSource).toContain("img/icon/attendance.svg");
  });

  it("deve usar o ícone SVG local de apostilas", () => {
    const iconSource = fs.readFileSync(
      new URL("../src/utils/general.jsx", import.meta.url),
      "utf8"
    );

    expect(iconSource).toContain('props.src === "booklets"');
    expect(iconSource).toContain("img/icon/booklets.svg");
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
      "Frequência",
      "Apostilas",
      "Avaliação",
      "Lições",
      "Montagem de PC",
      "Word",
      "Gerador de Imagens",
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
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "desktop-seed-attendance-v1",
      "true"
    );
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "desktop-seed-booklets-v1",
      "true"
    );
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "desktop-seed-lessons-v1",
      "true"
    );
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "desktop-seed-pc-builder-v1",
      "true"
    );
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "desktop-seed-imagegen-v1",
      "true"
    );
  });
});
