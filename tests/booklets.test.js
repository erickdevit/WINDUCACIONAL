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
    expect(source).toContain("Permissões dos alunos");
    expect(source).toContain("Minha estante");
    expect(source).toContain("Leitor de apostilas");
  });

  it("deve abrir PDFs em leitor interno sem expor caminho local", () => {
    expect(source).toContain("<iframe");
    expect(source).toContain("selectedFile.url");
    expect(source).toContain('rel="noopener noreferrer"');
  });

  it("deve manter navegação e rolagem próprias", () => {
    expect(styles).toContain(".booklets-sidebar");
    expect(styles).toContain(".booklets-nav");
    expect(styles).toContain(".booklets-module-grid");
    expect(styles).toContain(".booklets-file-list");
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
