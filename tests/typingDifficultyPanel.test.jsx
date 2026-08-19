/** @vitest-environment jsdom */

import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { TypingDifficultyAssignmentPanel } from "../src/containers/applications/apps/TypingDifficultyAssignmentPanel";

const apiMock = vi.hoisted(() => ({
  getUsers: vi.fn(),
  getTypingDifficulty: vi.fn(),
  saveTypingDifficulty: vi.fn(),
  clearTypingDifficulty: vi.fn(),
}));

vi.mock("../src/lib/api", () => ({ api: apiMock }));

const turmas = [
  { id: "turma-1", nome: "Kids A", studentType: "kids" },
  { id: "turma-2", nome: "Kids B", studentType: "KIDS" },
];

describe("Painel de dificuldade direcionada", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("permite escolher a turma antes de escolher um aluno", async () => {
    apiMock.getUsers.mockResolvedValue({
      users: [
        { id: "student-1", username: "ana", displayName: "Ana", role: "aluno", studentType: "kids", turmaId: "turma-1", active: true },
        { id: "student-2", username: "bia", displayName: "Bia", role: "aluno", studentType: "kids", turmaId: "turma-2", active: true },
      ],
    });
    apiMock.getTypingDifficulty.mockResolvedValue({
      settings: { studentType: "kids", passMinWpm: 40, passMinAccuracy: 95, maxErrors: 7 },
      source: "type",
      override: null,
    });

    render(<TypingDifficultyAssignmentPanel studentType="kids" turmas={turmas} enabled />);
    await waitFor(() => expect(screen.getByDisplayValue("Kids A")).toBeTruthy());

    fireEvent.change(screen.getByLabelText("Direcionar para"), {
      target: { value: "student" },
    });
    fireEvent.change(screen.getByLabelText("Turma do aluno"), {
      target: { value: "turma-2" },
    });

    await waitFor(() => expect(screen.getByRole("option", { name: "Bia" })).toBeTruthy());
    expect(screen.queryByRole("option", { name: "Ana" })).toBeNull();
    expect(apiMock.getTypingDifficulty).toHaveBeenCalledWith(
      expect.objectContaining({ scope: "student", studentId: "student-2" })
    );
  });

  it("edita a dificuldade direcionada por barras e campos numéricos", async () => {
    apiMock.getUsers.mockResolvedValue({ users: [] });
    apiMock.getTypingDifficulty.mockResolvedValue({
      settings: {
        studentType: "kids",
        passMinWpm: 40,
        passMinAccuracy: 95,
        maxErrors: 7,
      },
      source: "type",
      override: null,
    });
    apiMock.saveTypingDifficulty.mockResolvedValue({
      settings: {
        studentType: "kids",
        passMinWpm: 72,
        passMinAccuracy: 95,
        maxErrors: 7,
      },
      source: "turma",
      override: { scope: "turma" },
    });

    render(
      <TypingDifficultyAssignmentPanel
        studentType="kids"
        turmas={turmas}
        enabled
      />
    );

    const wpmSlider = await screen.findByRole("slider", {
      name: "PPM mínimo: barra",
    });
    expect(screen.getAllByRole("slider")).toHaveLength(3);
    fireEvent.change(wpmSlider, { target: { value: "72" } });
    expect(screen.getByRole("spinbutton", { name: "PPM mínimo: valor" }).value).toBe("72");

    fireEvent.click(screen.getByRole("button", { name: "Salvar direcionamento" }));
    await waitFor(() =>
      expect(apiMock.saveTypingDifficulty).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "lesson",
          scope: "turma",
          turmaId: "turma-1",
          settings: expect.objectContaining({ passMinWpm: 72 }),
        })
      )
    );
  });

  it("mantém o painel global somente para o game", () => {
    const normalApp = fs.readFileSync(
      path.resolve(
        process.cwd(),
        "src/containers/applications/apps/typing/typing.jsx"
      ),
      "utf8"
    );
    const kidsApp = fs.readFileSync(
      path.resolve(
        process.cwd(),
        "src/containers/applications/apps/typingKids/TypingKidsApp.jsx"
      ),
      "utf8"
    );

    expect(normalApp).not.toContain("Configurações das lições");
    expect(kidsApp).not.toContain("Vidas por lição");
    expect(normalApp).toContain("Configurações do game");
    expect(kidsApp).toContain("Configurações do game");
  });
});
