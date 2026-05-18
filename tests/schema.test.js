import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(__dirname, "../server/db/schema.sql");

describe("Schema SQL", () => {
  const schema = fs.readFileSync(schemaPath, "utf8");

  it("deve criar a tabela turmas antes da tabela users", () => {
    const turmasPos = schema.indexOf("CREATE TABLE IF NOT EXISTS turmas");
    const usersPos = schema.indexOf("CREATE TABLE IF NOT EXISTS users");
    expect(turmasPos).toBeGreaterThan(-1);
    expect(usersPos).toBeGreaterThan(-1);
    expect(turmasPos).toBeLessThan(usersPos);
  });

  it("deve conter código único de 6 caracteres na tabela turmas", () => {
    const turmasStart = schema.indexOf("CREATE TABLE IF NOT EXISTS turmas");
    const turmasEnd = schema.indexOf(");", turmasStart);
    const turmasBlock = schema.substring(turmasStart, turmasEnd);
    expect(turmasBlock).toContain("code TEXT NOT NULL UNIQUE");
    expect(turmasBlock).toContain("turmas_code_format_check");
    expect(turmasBlock).toContain("code ~ '^[A-Z0-9]{6}$'");
  });

  it("deve conter migração e índice para código de turma", () => {
    expect(schema).toContain("ALTER TABLE turmas ADD COLUMN code");
    expect(schema).toContain("column_name = 'code'");
    expect(schema).toContain(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_turmas_code ON turmas(code)"
    );
  });

  it("deve conter coluna turma_id na definição da tabela users", () => {
    // Extrair bloco CREATE TABLE users
    const usersStart = schema.indexOf("CREATE TABLE IF NOT EXISTS users");
    const usersEnd = schema.indexOf(");", usersStart);
    const usersBlock = schema.substring(usersStart, usersEnd);
    expect(usersBlock).toContain("turma_id UUID REFERENCES turmas(id)");
  });

  it("deve conter coluna student_type e restrição Kids/Normal na tabela users", () => {
    const usersStart = schema.indexOf("CREATE TABLE IF NOT EXISTS users");
    const usersEnd = schema.indexOf(");", usersStart);
    const usersBlock = schema.substring(usersStart, usersEnd);
    expect(usersBlock).toContain("student_type TEXT NOT NULL DEFAULT 'normal'");
    expect(usersBlock).toContain("users_student_type_check");
    expect(usersBlock).toContain("student_type IN ('kids', 'normal')");
  });

  it("deve conter migração ALTER TABLE para adicionar turma_id em bancos existentes", () => {
    expect(schema).toContain("ALTER TABLE users ADD COLUMN turma_id");
    expect(schema).toContain("information_schema.columns");
    expect(schema).toContain("column_name = 'turma_id'");
  });

  it("deve conter migração ALTER TABLE para adicionar student_type em bancos existentes", () => {
    expect(schema).toContain("ALTER TABLE users ADD COLUMN student_type");
    expect(schema).toContain("column_name = 'student_type'");
    expect(schema).toContain("ADD CONSTRAINT users_student_type_check");
    expect(schema).toContain("SET student_type = t.student_type");
  });

  it("deve criar índice para turma_id", () => {
    expect(schema).toContain(
      "CREATE INDEX IF NOT EXISTS idx_users_turma_id ON users(turma_id)"
    );
  });

  it("deve persistir configurações de dificuldade de digitação por tipo de aluno", () => {
    expect(schema).toContain("CREATE TABLE IF NOT EXISTS typing_settings");
    expect(schema).toContain("student_type TEXT PRIMARY KEY");
    expect(schema).toContain("pass_min_wpm INTEGER NOT NULL DEFAULT 40");
    expect(schema).toContain("pass_min_accuracy INTEGER NOT NULL DEFAULT 95");
    expect(schema).toContain("max_errors INTEGER NOT NULL DEFAULT 7");
    expect(schema).toContain("('normal', 40, 95, 7)");
    expect(schema).toContain("('kids', 40, 95, 7)");
  });

  it("deve recriar a view typing_ranking sem CREATE OR REPLACE VIEW", () => {
    expect(schema).toContain("DROP VIEW IF EXISTS typing_ranking;");
    expect(schema).toContain("CREATE VIEW typing_ranking AS");
    expect(schema).not.toContain("CREATE OR REPLACE VIEW typing_ranking AS");
  });

  it("deve manter a ordem esperada de colunas na view typing_ranking", () => {
    const viewStart = schema.indexOf("CREATE VIEW typing_ranking AS");
    const viewEnd = schema.indexOf(
      "GROUP BY u.id, u.display_name, u.role, COALESCE(turma.student_type, u.student_type), u.turma_id;",
      viewStart
    );
    const viewBlock = schema.substring(viewStart, viewEnd);
    expect(viewBlock).toContain(
      "u.role,\n  COALESCE(turma.student_type, u.student_type) AS student_type,\n  u.turma_id,"
    );
  });

  it("deve excluir professores dos rankings de digitação e do game", () => {
    const typingViewStart = schema.indexOf("CREATE VIEW typing_ranking AS");
    const typingViewEnd = schema.indexOf(
      "GROUP BY u.id, u.display_name, u.role, COALESCE(turma.student_type, u.student_type), u.turma_id;",
      typingViewStart
    );
    const typingViewBlock = schema.substring(typingViewStart, typingViewEnd);
    expect(typingViewBlock).toContain("u.role != 'professor'");

    const gameViewStart = schema.indexOf("CREATE VIEW typing_game_ranking AS");
    const gameViewEnd = schema.indexOf(
      "GROUP BY u.id, u.display_name, u.role, COALESCE(turma.student_type, u.student_type), u.turma_id;",
      gameViewStart
    );
    const gameViewBlock = schema.substring(gameViewStart, gameViewEnd);
    expect(gameViewBlock).toContain("u.role != 'professor'");
  });

  it("deve calcular ranking de digitação usando as metas salvas", () => {
    const viewStart = schema.indexOf("CREATE VIEW typing_ranking AS");
    const viewEnd = schema.indexOf(
      "GROUP BY u.id, u.display_name, u.role, COALESCE(turma.student_type, u.student_type), u.turma_id;",
      viewStart
    );
    const viewBlock = schema.substring(viewStart, viewEnd);
    expect(viewBlock).toContain(
      "LEFT JOIN turmas turma ON turma.id = u.turma_id"
    );
    expect(viewBlock).toContain(
      "LEFT JOIN typing_settings s ON s.student_type = COALESCE(turma.student_type, u.student_type)"
    );
    expect(viewBlock).toContain(
      "t.accuracy >= COALESCE(s.pass_min_accuracy, 95)"
    );
    expect(viewBlock).toContain("t.wpm >= COALESCE(s.pass_min_wpm, 40)");
  });

  it("deve persistir configurações e ranking separados do game de digitação", () => {
    expect(schema).toContain("CREATE TABLE IF NOT EXISTS typing_game_settings");
    expect(schema).toContain("CREATE TABLE IF NOT EXISTS typing_game_scores");
    expect(schema).toContain("max_lives INTEGER NOT NULL DEFAULT 7");
    expect(schema).toContain("game_speed INTEGER NOT NULL DEFAULT 100");
    expect(schema).toContain("game_speed_boost INTEGER NOT NULL DEFAULT 3");
    expect(schema).toContain("game_speed BETWEEN 0 AND 100");
    expect(schema).toContain("game_speed_boost BETWEEN 0 AND 100");
    expect(schema).toContain("DROP VIEW IF EXISTS typing_game_ranking;");
    expect(schema).toContain("CREATE VIEW typing_game_ranking AS");
    expect(schema).toContain(
      "LEFT JOIN typing_game_settings s ON s.student_type = COALESCE(turma.student_type, u.student_type)"
    );
    expect(schema).toContain("LEFT JOIN typing_game_scores t");
    expect(schema).toContain("t.status = 'won'");
    expect(schema).toContain("t.accuracy >= COALESCE(s.pass_min_accuracy, 95)");
    expect(schema).toContain("t.wpm >= COALESCE(s.pass_min_wpm, 40)");
  });

  it("deve migrar pontuações do PVP em bancos existentes", () => {
    expect(schema).toContain("CREATE TABLE IF NOT EXISTS typing_pvp_matches");
    expect(schema).toContain("winner_score INT DEFAULT 0");
    expect(schema).toContain("loser_score INT DEFAULT 0");
    expect(schema).toContain(
      "ALTER TABLE typing_pvp_matches ADD COLUMN winner_score"
    );
    expect(schema).toContain(
      "ALTER TABLE typing_pvp_matches ADD COLUMN loser_score"
    );
    expect(schema).toContain("column_name = 'winner_score'");
    expect(schema).toContain("column_name = 'loser_score'");
  });

  it("deve persistir metadados de versão para limpeza de sessões pós-build", () => {
    expect(schema).toContain("CREATE TABLE IF NOT EXISTS app_metadata");
    expect(schema).toContain("key TEXT PRIMARY KEY");
    expect(schema).toContain("value TEXT NOT NULL");
  });

  it("deve persistir tempos e tentativa única nas avaliações", () => {
    expect(schema).toContain("CREATE TABLE IF NOT EXISTS exams");
    expect(schema).toContain("time_limit INTEGER NOT NULL DEFAULT 0");
    expect(schema).toContain("CREATE TABLE IF NOT EXISTS exam_questions");
    expect(schema).toContain("time_limit INTEGER NOT NULL DEFAULT 0");
    expect(schema).toContain("UNIQUE(exam_id, user_id)");
    expect(schema).toContain("ALTER TABLE exam_questions ADD COLUMN time_limit");
  });

  it("deve persistir rastreabilidade das aplicações de provas", () => {
    expect(schema).toContain("CREATE TABLE IF NOT EXISTS exam_application_batches");
    expect(schema).toContain("applied_by UUID REFERENCES users(id)");
    expect(schema).toContain("mode TEXT NOT NULL DEFAULT 'all'");
    expect(schema).toContain("cancelled_at TIMESTAMPTZ");
    expect(schema).toContain("total_removed INTEGER NOT NULL DEFAULT 0");
    expect(schema).toContain("CREATE TABLE IF NOT EXISTS exam_application_items");
    expect(schema).toContain("status TEXT NOT NULL CHECK (status IN ('created', 'existing', 'skipped'))");
    expect(schema).toContain("removal_status TEXT NOT NULL DEFAULT 'active'");
    expect(schema).toContain("exam_application_items_removal_status_check");
    expect(schema).toContain("idx_exam_application_items_batch");
  });

  it("não deve conter referências a tabelas inexistentes antes de suas definições", () => {
    // Garantir que o CREATE INDEX de turma_id vem após o bloco DO $$ de migração
    const alterPos = schema.indexOf("ALTER TABLE users ADD COLUMN turma_id");
    const indexPos = schema.indexOf("idx_users_turma_id");
    expect(alterPos).toBeGreaterThan(-1);
    expect(indexPos).toBeGreaterThan(alterPos);
  });
});
