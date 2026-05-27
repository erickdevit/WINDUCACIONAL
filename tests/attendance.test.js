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
  const styles = fs.readFileSync(
    path.resolve(
      __dirname,
      "../src/containers/applications/apps/attendance/attendance.scss"
    ),
    "utf8"
  );
  const appSource = fs.readFileSync(
    path.resolve(__dirname, "../src/App.jsx"),
    "utf8"
  );
  const manifest = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../public/manifest.json"), "utf8")
  );

  it("deve usar AppWindow e rotas de frequência", () => {
    expect(source).toContain("<AppWindow");
    expect(source).toContain("api.getMyAttendance");
    expect(source).toContain("api.getAttendanceSummary");
  });

  it("deve oferecer filtros analíticos e impressão para professores", () => {
    expect(source).toContain("professorTabs");
    expect(source).toContain("Visão Geral");
    expect(source).toContain("Por Dia");
    expect(source).toContain("Registros");
    expect(source).toContain("Aplicar");
    expect(source).toContain("printReport");
    expect(source).toContain("Relatório de frequência");
    expect(source).toContain("Resumo por aluno");
  });

  it("deve organizar a experiência com menu lateral e telas separadas", () => {
    expect(source).toContain("attendance-sidebar");
    expect(source).toContain("attendance-nav-link");
    expect(source).toContain("renderActiveContent");
    expect(source).toContain("renderStudents");
    expect(source).toContain("renderDaily");
    expect(source).toContain("renderRecords");
    expect(source).toContain("renderPrint");
  });

  it("deve mostrar histórico individual para alunos", () => {
    expect(source).toContain("Minha frequência");
    expect(source).toContain("Presença registrada automaticamente");
    expect(source).toContain("Histórico");
  });

  it("deve separar visualização reutilizável e rota direta standalone", () => {
    expect(source).toContain("export const AttendanceView");
    expect(source).toContain("export const AttendanceStandalonePage");
    expect(source).toContain('standalone ? "standalone" : "windowed"');
    expect(appSource).toContain('directPath === "/frequencia"');
    expect(appSource).toContain("<AttendanceStandalonePage />");
  });

  it("deve redesenhar a navegação e listas para celular em retrato", () => {
    expect(source).toContain("attendance-mobile-nav");
    expect(source).toContain("attendance-filter-backdrop");
    expect(source).toContain("attendance-mobile-card");
    expect(styles).toContain(
      "@media (max-width: 600px) and (orientation: portrait)"
    );
    expect(styles).toContain(".attendance-mobile-nav");
    expect(styles).toContain(".attendance-card-list");
    expect(styles).toContain(".attendance-desktop-table");
  });

  it("deve registrar atalho PWA para abrir a Frequência direto", () => {
    expect(manifest.shortcuts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Frequência",
          url: "/frequencia",
        }),
      ])
    );
  });
});
