/**
 * @vitest-environment jsdom
 */
import { beforeAll, describe, expect, it, vi } from "vitest";
import fs from "fs";
import path from "path";

let getMobilePortraitTaskApps;

beforeAll(async () => {
  vi.stubGlobal("localStorage", {
    getItem: () => "[]",
    setItem: () => {},
    removeItem: () => {},
  });
  ({ getMobilePortraitTaskApps } = await import(
    "../src/components/taskbar/taskbarUtils.js"
  ));
});

describe("Taskbar mobile em portrait", () => {
  it("mantém os apps fixados padrão enquanto nenhum app está aberto", () => {
    const taskApps = [
      { name: "Configurações", icon: "settings" },
      { name: "Explorador de Arquivos", icon: "explorer" },
      { name: "Navegador", icon: "edge" },
      { name: "Loja", icon: "store" },
      { name: "Chat da Turma", icon: "chat" },
    ];

    expect(
      getMobilePortraitTaskApps({
        taskApps,
        apps: { hz: 2 },
        user: { role: "professor" },
      }).map((app) => app.icon)
    ).toEqual(["settings", "explorer", "edge", "store", "chat"]);
  });

  it("troca os cinco slots por apps abertos, deixando o app ativo em primeiro", () => {
    const apps = {
      hz: 9,
      edge: {
        name: "Navegador",
        icon: "edge",
        hide: false,
        z: 7,
      },
      chat: {
        name: "Chat da Turma",
        icon: "chat",
        hide: false,
        z: 9,
      },
      store: {
        name: "Loja",
        icon: "store",
        hide: false,
        z: 8,
      },
      settings: {
        name: "Configurações",
        icon: "settings",
        hide: true,
        z: 10,
      },
    };

    expect(
      getMobilePortraitTaskApps({
        taskApps: [{ name: "Configurações", icon: "settings" }],
        apps,
        user: { role: "professor" },
      }).map((app) => app.icon)
    ).toEqual(["chat", "store", "edge"]);
  });

  it("mantém o botão de minimizar disponível apenas no breakpoint portrait mobile", () => {
    const styles = fs.readFileSync(
      path.resolve(__dirname, "../src/mobile.scss"),
      "utf-8"
    );

    expect(styles).toContain('.actbtns .uicon[data-payload="mnmz"]');
    expect(styles).toContain(
      "@media screen and (max-width: 480px) and (orientation: portrait)"
    );
    expect(styles).toContain("display: grid !important;");
  });

  it("limita janelas mobile à área acima da barra de tarefas", () => {
    const styles = fs.readFileSync(
      path.resolve(__dirname, "../src/mobile.scss"),
      "utf-8"
    );

    expect(styles).toContain("bottom: var(--taskbar-height) !important;");
    expect(styles).toContain("height: auto !important;");
    expect(styles).toContain("height: 100% !important;");
    expect(styles).toContain("max-height: 100% !important;");
    expect(styles).not.toContain("height: calc(100dvh - 44px) !important;");
    expect(styles).not.toContain(
      "height: calc(100dvh - 42px - var(--sai-bottom)) !important;"
    );
  });
});
