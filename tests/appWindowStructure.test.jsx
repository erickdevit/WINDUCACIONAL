import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const APPS_DIR = path.resolve(__dirname, "../src/containers/applications/apps");
const read = (relativePath) =>
  fs.readFileSync(path.resolve(__dirname, relativePath), "utf-8");

const LEGACY_WINDOW_EXCEPTIONS = new Set(["about.jsx"]);

const NON_WINDOW_FILES = new Set([
  "FileDialog.jsx",
  "TypingRankingScrollArea.jsx",
]);

const listJsxFiles = (dir, prefix = "") => {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolutePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === "assets" || entry.name === "hooks") return [];
      return listJsxFiles(absolutePath, relativePath);
    }

    if (!entry.name.endsWith(".jsx")) return [];
    return [relativePath];
  });
};

describe("App Window Structure", () => {
  it("AppWindow deve centralizar o shell padrão das janelas principais", () => {
    const appWindowContent = read("../src/components/shared/AppWindow.jsx");

    expect(appWindowContent).toContain("floatTab dpShad");
    expect(appWindowContent).toContain("<ToolBar");
    expect(appWindowContent).toContain(
      'windowScreenClassName = "flex flex-col"'
    );
    expect(appWindowContent).toContain(
      'restWindowClassName = "flex-grow flex flex-col"'
    );
    expect(appWindowContent).toContain('data-dock="true"');
    expect(appWindowContent).toMatch(/restWindowClassName\s*\?\s*\(\s*<div/);
    expect(appWindowContent).toContain("clampCustomWindowStyle");
    expect(appWindowContent).toContain(
      "maxHeight = `calc(100% - ${safeTop}px)`"
    );
  });

  it("janelas globais devem respeitar a área acima da barra de tarefas", () => {
    const appShellStyles = read("../src/containers/applications/tabs.scss");
    const appStyles = read("../src/index.css");
    const taskbarStyles = read("../src/components/taskbar/taskbar.scss");
    const generalContent = read("../src/utils/general.jsx");

    expect(appStyles).toContain("--taskbar-height: 48px");
    expect(appStyles).toContain("--desktop-workarea-height");
    expect(appStyles).toContain("height: var(--desktop-workarea-height)");
    expect(taskbarStyles).toContain("height: var(--taskbar-height)");
    expect(appShellStyles).toContain("max-height: 100%");
    expect(generalContent).toContain("clampGeometry");
    expect(generalContent).toContain('wnapp?.closest?.(".desktop")');
  });

  it("apps fora da lista legada devem usar AppWindow para manter o padrão antigo de janela", () => {
    const appFiles = listJsxFiles(APPS_DIR);
    const managedFiles = appFiles.filter((file) => {
      const baseName = path.basename(file);
      if (
        LEGACY_WINDOW_EXCEPTIONS.has(baseName) ||
        NON_WINDOW_FILES.has(baseName)
      ) {
        return false;
      }

      const content = fs.readFileSync(path.join(APPS_DIR, file), "utf-8");
      return (
        content.includes("state.apps.") ||
        content.includes("const wnapp = useSelector")
      );
    });

    expect(managedFiles.length).toBeGreaterThan(0);

    managedFiles.forEach((relativePath) => {
      const content = fs.readFileSync(
        path.join(APPS_DIR, relativePath),
        "utf-8"
      );
      expect(content, `${relativePath} deve importar AppWindow`).toContain(
        "AppWindow"
      );
      expect(content, `${relativePath} deve renderizar AppWindow`).toContain(
        "<AppWindow"
      );
    });
  });

  it("ChatApp deve manter as regras CSS estruturais que evitam quebra de posicionamento e layout", () => {
    const chatStyles = read(
      "../src/containers/applications/apps/chat/chat.scss"
    );

    expect(chatStyles).toContain(".chatWn {");
    expect(chatStyles).toContain("min-width: 620px;");
    expect(chatStyles).toContain("min-height: 420px;");
    expect(chatStyles).toContain("overflow: hidden;");

    expect(chatStyles).toContain(".chat-layout {");
    expect(chatStyles).toContain("flex: 1;");
    expect(chatStyles).toContain("flex-grow: 1;");
    expect(chatStyles).toContain("height: 100%;");
    expect(chatStyles).toContain("min-height: 0;");

    expect(chatStyles).toContain(".chat-sidebar {");
    expect(chatStyles).toContain("min-width: 180px;");
    expect(chatStyles).toContain("min-height: 0;");
  });

  it("ChatApp deve limitar rolagem automática ao painel de mensagens", () => {
    const chatContent = read(
      "../src/containers/applications/apps/chat/chat.jsx"
    );

    expect(chatContent).not.toContain("scrollIntoView");
    expect(chatContent).toContain("messagesRef");
    expect(chatContent).toContain(
      "messagePane.scrollTop = messagePane.scrollHeight;"
    );
    expect(chatContent).toContain("preventScroll: true");
  });
});
