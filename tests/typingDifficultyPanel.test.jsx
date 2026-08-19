/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
});
