import { describe, expect, it } from "vitest"
import {
  formatWindowsPath,
  getEntryIcon,
  getNodeAtPath,
  isImageFileType,
  listEntries,
  resolveSpecialPath,
  setNodeAtPath,
} from "./treeUtils"
import type { FsTree } from "./types"

const TREE: FsTree = {
  "C:": {
    type: "folder",
    info: { spid: "%cdrive%" },
    data: {
      Users: {
        data: {
          professor: {
            type: "folder",
            info: { spid: "%user%", icon: "user" },
            data: {
              Desktop: { info: { spid: "%desktop%", icon: "desk" }, data: {} },
              Documents: {
                info: { spid: "%documents%", icon: "docs" },
                data: {
                  "Aula 1": { data: {} },
                  "notas.txt": { type: "txt", data: "conteúdo" },
                  "apresentacao.docx": { type: "docx", data: "" },
                },
              },
            },
          },
        },
      },
    },
  },
  "D:": { info: { spid: "%ddrive%" }, data: {} },
}

describe("treeUtils", () => {
  it("getNodeAtPath retorna o nó na raiz de uma unidade", () => {
    expect(getNodeAtPath(TREE, ["C:"])).toBe(TREE["C:"])
  })

  it("getNodeAtPath navega por subpastas", () => {
    const node = getNodeAtPath(TREE, ["C:", "Users", "professor", "Documents"])

    expect(node?.info?.spid).toBe("%documents%")
  })

  it("getNodeAtPath retorna null para caminho inexistente", () => {
    expect(getNodeAtPath(TREE, ["C:", "Nope"])).toBeNull()
  })

  it("listEntries ordena pastas antes de arquivos, alfabeticamente", () => {
    const entries = listEntries(TREE, ["C:", "Users", "professor", "Documents"])

    expect(entries.map((entry) => entry.key)).toEqual(["Aula 1", "apresentacao.docx", "notas.txt"])
  })

  it("listEntries inclui o caminho completo de cada item", () => {
    const entries = listEntries(TREE, ["C:", "Users", "professor"])
    const desktop = entries.find((entry) => entry.key === "Desktop")

    expect(desktop?.path).toEqual(["C:", "Users", "professor", "Desktop"])
  })

  it("listEntries retorna vazio para caminho inexistente", () => {
    expect(listEntries(TREE, ["C:", "Nope"])).toEqual([])
  })

  it("resolveSpecialPath encontra o caminho de uma pasta especial", () => {
    expect(resolveSpecialPath(TREE, "%user%")).toEqual(["C:", "Users", "professor"])
    expect(resolveSpecialPath(TREE, "%documents%")).toEqual(["C:", "Users", "professor", "Documents"])
  })

  it("resolveSpecialPath retorna null quando não encontra", () => {
    expect(resolveSpecialPath(TREE, "%inexistente%")).toBeNull()
  })

  it("formatWindowsPath formata a raiz de uma unidade com barra invertida final", () => {
    expect(formatWindowsPath(["C:"])).toBe("C:\\")
  })

  it("formatWindowsPath junta os segmentos com barra invertida", () => {
    expect(formatWindowsPath(["C:", "Users", "professor", "Documents"])).toBe("C:\\Users\\professor\\Documents")
  })

  it("getEntryIcon retorna ícone de pasta para diretórios", () => {
    const folder = getNodeAtPath(TREE, ["C:", "Users", "professor", "Documents"])!

    expect(getEntryIcon(folder)).toBe("folder")
  })

  it("getEntryIcon retorna ícone específico para arquivos conhecidos", () => {
    const txt = getNodeAtPath(TREE, ["C:", "Users", "professor", "Documents", "notas.txt"])!
    const docx = getNodeAtPath(TREE, ["C:", "Users", "professor", "Documents", "apresentacao.docx"])!

    expect(getEntryIcon(txt)).toBe("document")
    expect(getEntryIcon(docx)).toBe("document")
  })

  it("identifica apenas tipos raster aceitos pelo Fotos", () => {
    expect(isImageFileType("png")).toBe(true)
    expect(isImageFileType("jpeg")).toBe(true)
    expect(isImageFileType("webp")).toBe(true)
    expect(isImageFileType("gif")).toBe(true)
    expect(isImageFileType("svg")).toBe(false)
    expect(isImageFileType("txt")).toBe(false)
    expect(isImageFileType(null)).toBe(false)
  })

  it("setNodeAtPath substitui o nó sem mutar a árvore original", () => {
    const path = ["C:", "Users", "professor", "Documents", "notas.txt"]

    const updated = setNodeAtPath(TREE, path, { type: "txt", data: "novo conteúdo" })

    expect(getNodeAtPath(updated, path)?.data).toBe("novo conteúdo")
    expect(getNodeAtPath(TREE, path)?.data).toBe("conteúdo")
    // Ramos não afetados são reaproveitados por referência.
    expect(getNodeAtPath(updated, ["C:", "Users", "professor", "Desktop"])).toBe(
      getNodeAtPath(TREE, ["C:", "Users", "professor", "Desktop"]),
    )
  })

  it("setNodeAtPath retorna a árvore intacta para caminho inexistente", () => {
    expect(setNodeAtPath(TREE, ["C:", "Nope", "x.txt"], { type: "txt", data: "x" })).toBe(TREE)
  })
})
