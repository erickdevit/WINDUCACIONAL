import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const read = (relativePath) =>
  fs.readFileSync(path.resolve(__dirname, relativePath), "utf8");

describe("App Apostilas", () => {
  const source = read(
    "../src/containers/applications/apps/booklets/booklets.jsx"
  );
  const styles = read(
    "../src/containers/applications/apps/booklets/booklets.scss"
  );

  it("deve usar AppWindow e APIs de apostilas", () => {
    expect(source).toContain("<AppWindow");
    expect(source).toContain("state.apps.booklets");
    expect(source).toContain("api.getBookletModules");
    expect(source).toContain("api.saveBookletAccess");
  });

  it("deve separar a experiência de professor e aluno", () => {
    expect(source).toContain("professorTabs");
    expect(source).toContain("studentTabs");
    expect(source).toContain('id: "access"');
    expect(source).toContain('id: "reader"');
    expect(source).toContain("renderAccess");
  });

  it("deve abrir PDFs em leitor interno sem expor caminho local", () => {
    expect(source).toContain("<object");
    expect(source).toContain("<iframe");
    expect(source).toContain("selectedFile.url");
    expect(source).toContain("booklets-pdf-scroll");
    expect(source).toContain('rel="noopener noreferrer"');
  });

  it("deve exibir apostilas em tiles com prévia de capa", () => {
    expect(source).toContain("bookletTiles");
    expect(source).toContain("renderBookletTile");
    expect(source).toContain("booklets-tile-preview");
    expect(source).toContain("#page=1");
    expect(source).toContain("isSelected ? (");
    expect(source).toContain("booklets-cover-preview");
    expect(styles).toContain(".booklets-tiles");
    expect(styles).toContain(".booklets-tile");
    expect(styles).toContain(".booklets-tile-preview");
  });

  it("deve selecionar módulo antes de listar apostilas", () => {
    expect(source).toContain("renderModuleSelector");
    expect(source).toContain("selectModule");
    expect(source.indexOf("{renderModuleSelector()}")).toBeLessThan(
      source.indexOf('<section className="booklets-tiles')
    );
    expect(styles).toContain(".booklets-module-selector");
    expect(styles).toContain("overflow-x: auto");
  });

  it("deve remover cabeçalhos descritivos superiores das views", () => {
    expect(source).not.toContain("renderHeader");
    expect(source).not.toContain("booklets-kicker");
    expect(styles).not.toContain(".booklets-header");
    expect(styles).not.toContain(".booklets-kicker");
  });

  it("deve manter navegação e rolagem próprias", () => {
    expect(styles).toContain(".booklets-sidebar");
    expect(styles).toContain(".booklets-nav");
    expect(styles).toContain(".booklets-reader-list");
    expect(styles).toContain(".booklets-pdf-scroll");
    expect(styles).toContain("width: max(100%, 760px)");
    expect(styles).toContain("overflow: auto");
  });

  it("deve manter a biblioteca de PDFs dentro da pasta do app", () => {
    const libraryDir = path.resolve(
      __dirname,
      "../src/containers/applications/apps/booklets/library"
    );
    expect(fs.existsSync(libraryDir)).toBe(true);
    expect(fs.existsSync(path.resolve(__dirname, "../apostilas"))).toBe(false);
  });
});
