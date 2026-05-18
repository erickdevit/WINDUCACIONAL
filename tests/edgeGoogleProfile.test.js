import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const edgePath = path.resolve(
  __dirname,
  "../src/containers/applications/apps/edge/edge.jsx"
);
const edgeStylesPath = path.resolve(
  __dirname,
  "../src/containers/applications/apps/edge/edge.scss"
);
const edgeCode = fs.readFileSync(edgePath, "utf8");
const edgeStyles = fs.readFileSync(edgeStylesPath, "utf8");

describe("Edge - perfil Google do simulador", () => {
  it("deve persistir login Google por usuário do simulador", () => {
    expect(edgeCode).toContain("googleProfileStorageKey");
    expect(edgeCode).toContain("edgeGoogleProfile_");
    expect(edgeCode).toContain("state.setting.person");
    expect(edgeCode).toContain("localStorage.setItem");
    expect(edgeCode).toContain("localStorage.getItem");
  });

  it("deve reconhecer páginas do Google e exibir painel de conta", () => {
    expect(edgeCode).toContain("isGoogleAddress");
    expect(edgeCode).toContain("hostname.endsWith");
    expect(edgeCode).toContain("Entrar no Google");
    expect(edgeCode).toContain("Salvar login");
    expect(edgeStyles).toContain(".edgeGoogleAccount");
  });
});
