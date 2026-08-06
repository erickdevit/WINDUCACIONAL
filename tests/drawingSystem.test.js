import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const drawingRoutes = require("../server/routes/drawing.cjs");

const read = (relativePath) =>
  fs.readFileSync(new URL(relativePath, import.meta.url), "utf8");

const route = read("../server/routes/drawing.cjs");
const migration = read(
  "../server/db/migrations/0004_drawing_activities.sql"
);
const optionsMigration = read(
  "../server/db/migrations/0005_drawing_activity_options.sql"
);
const client = read("../src/lib/api.js");
const app = read(
  "../src/containers/applications/apps/drawing/drawing.jsx"
);
const board = read(
  "../src/containers/applications/apps/drawing/DrawingBoard.jsx"
);
const styles = read(
  "../src/containers/applications/apps/drawing/drawing.scss"
);

describe("Desenho da Turma - persistência", () => {
  it("mantém atividades, desenhos, vencedores e opções visuais no banco", () => {
    expect(migration).toContain(
      "CREATE TABLE IF NOT EXISTS drawing_activities"
    );
    expect(migration).toContain(
      "CREATE TABLE IF NOT EXISTS drawing_strokes"
    );
    expect(migration).toContain("winner_id UUID REFERENCES users");
    expect(migration).toContain("idx_drawing_active_turma");
    expect(optionsMigration).toContain("instructions TEXT");
    expect(optionsMigration).toContain("background_color TEXT");
  });

  it("lista histórico com turma, vencedor, desenho vencedor e totais", () => {
    expect(route).toContain("winner.display_name AS winner_name");
    expect(route).toContain("winner_drawing.strokes AS winner_strokes");
    expect(route).toContain("participant_count");
    expect(route).toContain("drawing_count");
    expect(route).toContain("LIMIT 100");
  });
});

describe("Desenho da Turma - isolamento e tempo real", () => {
  it("aceita UUID completo de uma turma real", () => {
    expect(
      drawingRoutes.UUID_PATTERN.test("aa42bc8a-30d0-4131-8ba1-6023a3fb5578")
    ).toBe(true);
    expect(drawingRoutes.UUID_PATTERN.test("aa42bc8a-30d0-4131-8ba1"))
      .toBe(false);
  });

  it("limita alunos à própria turma e ao próprio desenho individual", () => {
    expect(route).toContain(
      'user.role !== "aluno" || user.turma_id !== activity.turma_id'
    );
    expect(route).toContain("u.id = $2 AND u.turma_id = $3");
    expect(route).toContain("client.user.id === ownerId");
    expect(route).toContain("client.user.turma_id !== activity.turma_id");
  });

  it("valida limites dos traços recebidos", () => {
    expect(route).toContain("MAX_STROKES = 500");
    expect(route).toContain("MAX_POINTS_PER_STROKE = 500");
    expect(route).toContain("x < 0");
    expect(route).toContain("x > 1");
    expect(route).toContain("y < 0");
    expect(route).toContain("y > 1");
  });

  it("acrescenta traços do modo caos de forma atômica", () => {
    expect(route).toContain(
      "drawing_strokes.strokes || EXCLUDED.strokes"
    );
    expect(route).toContain('activity.mode === "chaos" && action === "append"');
    expect(app).toContain('{ action: "append", stroke: operation.stroke }');
  });

  it("só aceita como vencedor aluno da turma que enviou desenho", () => {
    expect(route).toContain("JOIN drawing_strokes drawing");
    expect(route).toContain("u.turma_id = $3");
    expect(route).toContain("O vencedor deve ser um aluno da turma com desenho enviado.");
  });
});

describe("Desenho da Turma - experiência", () => {
  it("expõe API de criação, histórico, desenho e assinatura SSE", () => {
    expect(client).toContain("getDrawingActivities");
    expect(client).toContain("createDrawingActivity");
    expect(client).toContain("saveDrawingStrokes");
    expect(client).toContain("subscribeDrawing");
  });

  it("fecha a assinatura em tempo real quando a janela é ocultada", () => {
    expect(app).toContain(
      'if (wnapp?.hide || !activity?.id || activity.status !== "active")'
    );
  });

  it("oferece painel, criação, histórico, mosaico e escolha de vencedor", () => {
    expect(app).toContain("ProfessorLiveView");
    expect(app).toContain("CreateActivity");
    expect(app).toContain("HistoryView");
    expect(app).toContain("StudentTile");
    expect(app).toContain("PreviewView");
    expect(app).toContain('setView("preview")');
    expect(app).toContain("Escolher ${selectedDrawing.displayName} como vencedor?");
  });

  it("mantém a prévia separada da configuração e rolagem explícita", () => {
    expect(app).toContain("Prévia da tela do aluno");
    expect(app).toContain("Editar configuração");
    expect(styles).toContain("overflow:auto");
    expect(styles).toContain("scrollbar-gutter:stable both-edges");
    expect(styles).toContain(".drawingMainNav{overflow-x:auto");
    expect(app).toContain("contentRef.current.scrollTop = 0");
  });

  it("oferece pincel, borracha, cores, espessura e desfazer", () => {
    expect(board).toContain("Pincel");
    expect(board).toContain("Borracha");
    expect(board).toContain("Espessura");
    expect(board).toContain("Desfazer");
    expect(board).toContain("DRAWING_COLORS");
  });

  it("trata atividade nula com segurança durante o carregamento inicial", () => {
    expect(app).toContain("if (!activity)");
    expect(app).toContain("Carregando atividade");
  });
});
