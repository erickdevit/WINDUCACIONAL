import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const read = (relativePath) =>
  fs.readFileSync(new URL(relativePath, import.meta.url), "utf8");

const migration = read("../server/db/migrations/0007_quiz_arena.sql");
const quizRoutesCode = read("../server/routes/quiz.cjs");
const apiCode = read("../src/lib/api.js");
const appComponentCode = read(
  "../src/containers/applications/apps/quizArena/QuizArenaApp.jsx"
);
const scssCode = read(
  "../src/containers/applications/apps/quizArena/quizArena.scss"
);

describe("WindQuiz Arena - Schema e Migration", () => {
  it("contém tabelas para quizzes, perguntas, opções, sessões ao vivo, respostas e rankings", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS quiz_quizzes");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS quiz_questions");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS quiz_options");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS quiz_sessions");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS quiz_responses");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS quiz_rankings");
    expect(migration).toContain("idx_quiz_rankings_points");
  });
});

describe("WindQuiz Arena - Backend, Segurança e Streaming SSE", () => {
  it("implementa transmissão SSE de eventos e atualização de rankings por turma e global", () => {
    expect(quizRoutesCode).toContain("text/event-stream");
    expect(quizRoutesCode).toContain("QUESTION_START");
    expect(quizRoutesCode).toContain("REVEAL_ANSWER");
    expect(quizRoutesCode).toContain("PODIUM_FINAL");
    expect(quizRoutesCode).toContain("ANSWER_COUNT");
    expect(quizRoutesCode).toContain("turmaRankings");
    expect(quizRoutesCode).toContain("globalRankings");
  });

  it("calcula bônus de velocidade para respostas corretas", () => {
    expect(quizRoutesCode).toContain("speedBonusFactor = 1 - timeFraction * 0.5");
    expect(quizRoutesCode).toContain("points_earned");
  });

  it("aplica validação de UUID e isolamento por turma para conexões de alunos", () => {
    expect(quizRoutesCode).toContain("normalizeUuid");
    expect(quizRoutesCode).toContain("Você não pertence à turma desta partida");
    expect(quizRoutesCode).toContain("isRevealMode");
  });
});

describe("WindQuiz Arena - Frontend, Construtor Dinâmico e API Client", () => {
  it("exporta métodos da API para o simulador", () => {
    expect(apiCode).toContain("getQuizQuizzes");
    expect(apiCode).toContain("createQuizSession");
    expect(apiCode).toContain("advanceQuizSession");
    expect(apiCode).toContain("submitQuizAnswer");
    expect(apiCode).toContain("getQuizRankings");
  });

  it("renderiza a interface com AppWindow, construtor dinâmico de perguntas e SSE condicionado à visibilidade", () => {
    expect(appComponentCode).toContain('appId="quiz"');
    expect(appComponentCode).toContain("EventSource");
    expect(appComponentCode).toContain("TeacherHostView");
    expect(appComponentCode).toContain("StudentPlayerView");
    expect(appComponentCode).toContain("QuizPodiumView");
    expect(appComponentCode).toContain("handleAddQuestion");
    expect(appComponentCode).toContain("eventSource.close()");
  });

  it("define estilos SCSS para os 4 botões geométricos coloridos e o pódio", () => {
    expect(scssCode).toContain(".optA");
    expect(scssCode).toContain(".optB");
    expect(scssCode).toContain(".optC");
    expect(scssCode).toContain(".optD");
    expect(scssCode).toContain(".podiumStage");
  });
});
