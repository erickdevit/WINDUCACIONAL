import { describe, it, expect } from "vitest";
import { Bin } from "../src/utils/bin.js";

describe("Bin - createFile", () => {
  it("deve criar arquivo com ícone textfile", () => {
    const bin = new Bin();
    bin.parse({
      "C:": {
        type: "folder",
        name: "C:",
        data: {
          Home: {
            type: "folder",
            name: "Home",
          },
        },
      },
    });

    const homeId = bin.parsePath("C:\\Home");
    expect(homeId).not.toBeNull();

    const file = bin.createFile(homeId, "documento.txt", "file");
    expect(file).not.toBeNull();
    expect(file.name).toBe("documento.txt");
    expect(file.info.icon).toBe("textfile");
    expect(file.type).toBe("file");
  });

  it("deve criar arquivo txt com ícone textfile", () => {
    const bin = new Bin();
    bin.parse({
      "C:": {
        type: "folder",
        name: "C:",
        data: {
          Home: {
            type: "folder",
            name: "Home",
          },
        },
      },
    });

    const homeId = bin.parsePath("C:\\Home");
    const file = bin.createFile(homeId, "notas.txt", "txt");
    expect(file.info.icon).toBe("textfile");
  });

  it("não deve usar ícone notepad para arquivos (ícone do aplicativo)", () => {
    const bin = new Bin();
    bin.parse({
      "C:": {
        type: "folder",
        name: "C:",
        data: {
          Home: {
            type: "folder",
            name: "Home",
          },
        },
      },
    });

    const homeId = bin.parsePath("C:\\Home");
    const file = bin.createFile(homeId, "teste.txt", "file");
    expect(file.info.icon).not.toBe("notepad");
  });
});

describe("Bin - createFolder", () => {
  it("deve criar pasta com ícone folder", () => {
    const bin = new Bin();
    bin.parse({
      "C:": {
        type: "folder",
        name: "C:",
        data: {
          Home: {
            type: "folder",
            name: "Home",
          },
        },
      },
    });

    const homeId = bin.parsePath("C:\\Home");
    const folder = bin.createFolder(homeId, "Nova Pasta");
    expect(folder).not.toBeNull();
    expect(folder.name).toBe("Nova Pasta");
    expect(folder.info.icon).toBe("folder");
    expect(folder.type).toBe("folder");
    expect(folder.data).toEqual([]);
  });
});

describe("Bin - toJSON e persistência", () => {
  it("deve serializar e desserializar a árvore de arquivos mantendo a estrutura", () => {
    const bin = new Bin();
    bin.parse({
      "C:": {
        type: "folder",
        name: "C:",
        data: {
          Home: {
            type: "folder",
            name: "Home",
          },
        },
      },
    });

    const homeId = bin.parsePath("C:\\Home");
    bin.createFolder(homeId, "Documentos");
    bin.createFile(homeId, "notas.txt", "file");

    const json = bin.toJSON();
    expect(json["C:"]).toBeDefined();
    expect(json["C:"].data.Home.data.Documentos).toBeDefined();
    expect(json["C:"].data.Home.data["notas.txt"]).toBeDefined();
    expect(json["C:"].data.Home.data["notas.txt"].type).toBe("file");
    expect(json["C:"].data.Home.data["notas.txt"].info.icon).toBe("textfile");

    // Re-parse e verificar consistência
    const bin2 = new Bin();
    bin2.parse(json);
    const homeId2 = bin2.parsePath("C:\\Home");
    const home2 = bin2.getId(homeId2);
    expect(home2.data.length).toBe(2);

    const fileItem = home2.data.find((x) => x.name === "notas.txt");
    expect(fileItem).toBeDefined();
    expect(fileItem.info.icon).toBe("textfile");
  });
});
