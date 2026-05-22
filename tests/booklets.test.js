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
    expect(source).toContain("api.getBookletStudentAccess");
    expect(source).toContain("api.saveBookletStudentAccess");
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
    expect(source.indexOf("const renderReader = ()")).toBeLessThan(
      source.indexOf('<div className="booklets-reader-shell">')
    );
    expect(styles).toContain(".booklets-module-selector");
    expect(styles).toContain("overflow: auto");
  });

  it("deve permitir liberação específica por turma e aluno", () => {
    expect(source).toContain("selectedAccessTurmaId");
    expect(source).toContain("selectedStudentIds");
    expect(source).toContain("selectedStudentModuleIds");
    expect(source).toContain("Salvar alunos");
    expect(styles).toContain(".booklets-student-access");
    expect(styles).toContain(".booklets-student-list");
    expect(styles).toContain(".booklets-student-module-list");
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
    expect(styles).toContain(".booklets-main");
    expect(styles).toContain("overflow: auto");
  });

  it("deve otimizar a leitura mobile para exibir somente o PDF", () => {
    expect(source).toContain("readerMode");
    expect(styles).toContain("@media (max-width: 640px)");
    expect(styles).toContain(".bookletsApp.readerMode");
    expect(styles).toContain(".booklets-reader-bar");
    expect(styles).toContain("display: none");
    expect(styles).toContain("height: 100%");
    expect(styles).toContain("width: max(100%, 560px)");
  });

  it("deve aplicar scroll vertical nas listagens mobile", () => {
    const mobileBlock = styles.substring(
      styles.indexOf("@media (max-width: 640px)"),
      styles.indexOf(".bookletsApp.readerMode")
    );

    expect(mobileBlock).toContain(".booklets-module-selector");
    expect(mobileBlock).toContain("max-height: 148px");
    expect(mobileBlock).toContain("overflow-y: auto");
    expect(mobileBlock).toContain(".booklets-tiles");
    expect(mobileBlock).toContain("max-height: calc(100dvh - 230px)");
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
