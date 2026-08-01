/**
 * @vitest-environment jsdom
 */

import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TurmaManagement } from "../src/containers/applications/apps/settings/TurmaManagement";
import { api } from "../src/lib/api";

vi.mock("../src/lib/api", () => ({
  api: {
    createTurma: vi.fn(),
    deleteTurma: vi.fn(),
    getTurmas: vi.fn(),
    getUsers: vi.fn(),
    updateTurma: vi.fn(),
  },
}));

vi.mock("../src/utils/general", () => ({
  Icon: () => null,
}));

describe("Gerenciamento de turmas - regressão", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.createTurma.mockResolvedValue({ turma: { id: "turma-nova" } });
    api.getUsers.mockResolvedValue({ users: [] });
  });

  it("permite criar turma mesmo enquanto a listagem inicial está carregando", async () => {
    api.getTurmas
      .mockImplementationOnce(() => new Promise(() => {}))
      .mockResolvedValue({ turmas: [] });

    render(
      <TurmaManagement
        currentUser={{ id: "professor-1", role: "professor" }}
        onBack={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Criar turma" }));
    const saveButton = screen.getByRole("button", { name: "Salvar turma" });
    expect(saveButton.disabled).toBe(false);

    fireEvent.change(screen.getByLabelText("Nome da turma"), {
      target: { value: "Turma de Regressão" },
    });

    await act(async () => {
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(api.createTurma).toHaveBeenCalledWith(
        expect.objectContaining({ nome: "Turma de Regressão" })
      );
    });
  });

  it("carrega turmas antes dos usuários para não disputar conexões", async () => {
    const order = [];
    api.getTurmas.mockImplementation(async () => {
      order.push("turmas");
      return { turmas: [] };
    });
    api.getUsers.mockImplementation(async () => {
      order.push("usuários");
      return { users: [] };
    });

    render(
      <TurmaManagement
        currentUser={{ id: "professor-1", role: "professor" }}
        onBack={() => {}}
      />
    );

    await waitFor(() => expect(api.getUsers).toHaveBeenCalledTimes(1));
    expect(order).toEqual(["turmas", "usuários"]);
  });
});
