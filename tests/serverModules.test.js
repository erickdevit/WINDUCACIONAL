import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const serverDir = path.resolve(__dirname, "../server");
const routesDir = path.join(serverDir, "routes");

const routeModules = fs
  .readdirSync(routesDir)
  .filter((file) => file.endsWith(".cjs"))
  .sort();

describe("Backend - composicao modular", () => {
  it("deve ter modulos de rota por dominio", () => {
    for (const domain of [
      "auth.cjs",
      "users.cjs",
      "turmas.cjs",
      "booklets.cjs",
      "attendance.cjs",
      "exams.cjs",
      "lessons.cjs",
      "drawing.cjs",
      "pcBuilder.cjs",
      "typing.cjs",
      "chat.cjs",
      "notifications.cjs",
      "fs.cjs",
      "gestor.cjs",
      "edgeProxy.cjs",
    ]) {
      expect(routeModules).toContain(domain);
    }
  });

  it("cada modulo de rota deve exportar uma funcao injetora", () => {
    for (const file of routeModules) {
      const mod = require(path.join(routesDir, file));
      expect(typeof mod, `${file} deve exportar funcao`).toBe("function");
      // injetor recebe o contexto compartilhado
      expect(mod.length).toBe(1);
    }
  });

  it("index.cjs deve carregar sem efeitos colaterais e expor app/start", () => {
    // start() so roda quando executado diretamente (require.main === module),
    // entao importar o modulo registra as rotas sem subir o servidor nem o banco.
    const mod = require(path.join(serverDir, "index.cjs"));
    expect(typeof mod.app).toBe("function");
    expect(typeof mod.start).toBe("function");

    const stack = mod.app._router
      ? mod.app._router.stack
      : mod.app.router
      ? mod.app.router.stack
      : [];
    const routeCount = stack.filter((layer) => layer.route).length;
    // todas as rotas de dominio + PVP + catch-all devem estar registradas
    expect(routeCount).toBeGreaterThan(80);
  });
});
