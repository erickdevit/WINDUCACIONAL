import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("App Frequência", () => {
  const source = fs.readFileSync(
    path.resolve(
      __dirname,
      "../src/containers/applications/apps/attendance/attendance.jsx"
    ),
    "utf8"
  );

  it("deve usar AppWindow e rotas de frequência", () => {
    expect(source).toContain("<AppWindow");
    expect(source).toContain("api.getMyAttendance");
    expect(source).toContain("api.getAttendanceSummary");
  });

  it("deve oferecer filtros analíticos e impressão para professores", () => {
    expect(source).toContain("Aplicar filtros");
    expect(source).toContain("printReport");
    expect(source).toContain("Relatório de frequência");
    expect(source).toContain("Resumo por aluno");
  });

  it("deve mostrar histórico individual para alunos", () => {
    expect(source).toContain("Minha frequência");
    expect(source).toContain("Presença registrada automaticamente");
    expect(source).toContain("Histórico");
  });
});
