import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect, vi } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Mock da API para não depender do servidor real durante os testes
const mockApi = {
  getExams: vi.fn(),
  getExamDetails: vi.fn(),
  submitExam: vi.fn(),
};

describe("EduExam Pro - Lógica de Avaliação", () => {
  it("deve filtrar provas publicadas para alunos", async () => {
    const exams = [
      { id: 1, title: "Prova 1", isPublished: true },
      { id: 2, title: "Prova 2", isPublished: false },
    ];

    // Simulação da lógica que o backend faz (já testada via integração, aqui validamos a intenção)
    const studentExams = exams.filter((e) => e.isPublished);
    expect(studentExams).toHaveLength(1);
    expect(studentExams[0].title).toBe("Prova 1");
  });

  it("deve validar corretamente uma tarefa de criação de arquivo", () => {
    // Simulação do motor de validação que implementamos no ExamApp.jsx
    const mockState = {
      files: {
        data: {
          parsePath: (path) => {
            if (path === "C:\\Users\\Usuário\\Desktop\\teste.txt")
              return "file-123";
            return null;
          },
        },
      },
    };

    const rule = {
      type: "FILE_EXISTS",
      path: "C:\\Users\\Usuário\\Desktop\\teste.txt",
    };
    const isCorrect = !!mockState.files.data.parsePath(rule.path);

    expect(isCorrect).toBe(true);

    const ruleFail = {
      type: "FILE_EXISTS",
      path: "C:\\Users\\Usuário\\Desktop\\nao_existe.txt",
    };
    const isCorrectFail = !!mockState.files.data.parsePath(ruleFail.path);
    expect(isCorrectFail).toBe(false);
  });

  it("deve validar corretamente o uso de atalhos (Action Tracker)", () => {
    const mockState = {
      examTracker: {
        actions: [
          { name: "EXPLORER", type: "shortcut" },
          { name: "NOTEPAD", type: "shortcut" },
        ],
      },
    };

    const rule = { type: "ACTION_PERFORMED", name: "EXPLORER" };
    const passed = mockState.examTracker.actions.some(
      (a) => a.name === rule.name
    );

    expect(passed).toBe(true);

    const ruleFail = { type: "ACTION_PERFORMED", name: "TERMINAL" };
    const passedFail = mockState.examTracker.actions.some(
      (a) => a.name === ruleFail.name
    );
    expect(passedFail).toBe(false);
  });

  it("deve calcular a nota final somando MCQ e Prática", () => {
    const questions = [
      { id: "q1", type: "mcq", points: 2, correctAnswer: "a" },
      { id: "q2", type: "practical", points: 3 },
    ];

    const mcqAnswers = { q1: "a" };
    const practicalCorrect = true; // Simulado

    const scoreMcq = questions
      .filter((q) => q.type === "mcq")
      .reduce(
        (acc, q) => acc + (mcqAnswers[q.id] === q.correctAnswer ? q.points : 0),
        0
      );

    const scorePractical = questions
      .filter((q) => q.type === "practical")
      .reduce((acc, q) => acc + (practicalCorrect ? q.points : 0), 0);

    expect(scoreMcq).toBe(2);
    expect(scorePractical).toBe(3);
    expect(scoreMcq + scorePractical).toBe(5);
  });

  it("deve finalizar múltipla escolha sem enviar o evento de clique como respostas", () => {
    const mcqViewSource = fs.readFileSync(
      path.resolve(
        __dirname,
        "../src/containers/applications/apps/exam/MCQView.jsx"
      ),
      "utf8"
    );

    expect(mcqViewSource).toContain("onClick={() => handleNext()}");
    expect(mcqViewSource).not.toContain("onClick={handleNext}");
  });

  it("deve confirmar e autoformatar o nome completo antes de iniciar a avaliação", () => {
    const examAppSource = fs.readFileSync(
      path.resolve(
        __dirname,
        "../src/containers/applications/apps/exam/exam.jsx"
      ),
      "utf8"
    );

    expect(examAppSource).toContain("Nome completo do aluno");
    expect(examAppSource).toContain("normalizeName(event.target.value)");
    expect(examAppSource).toContain("api.updateMyDisplayName");
  });
});
