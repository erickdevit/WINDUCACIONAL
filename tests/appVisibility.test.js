import { describe, expect, it } from "vitest";
import {
  canDisplayAppForUser,
  filterAppsForUser,
} from "../src/lib/appVisibility";

const commonApp = { name: "Explorador de Arquivos", action: "EXPLORER" };
const normalApp = {
  name: "Digitação",
  action: "TYPINGAPP",
  studentAccess: "normal",
};
const kidsApp = {
  name: "Digitação Kids",
  action: "TYPINGKIDS",
  studentAccess: "kids",
};

describe("Visibilidade de aplicativos por perfil", () => {
  it("deve liberar apps comuns para alunos normais e Kids", () => {
    expect(
      canDisplayAppForUser(commonApp, { role: "aluno", studentType: "normal" })
    ).toBe(true);
    expect(
      canDisplayAppForUser(commonApp, { role: "aluno", studentType: "kids" })
    ).toBe(true);
  });

  it("deve separar apps de digitação normal e Kids por tipo de aluno", () => {
    expect(
      canDisplayAppForUser(normalApp, { role: "aluno", studentType: "normal" })
    ).toBe(true);
    expect(
      canDisplayAppForUser(kidsApp, { role: "aluno", studentType: "normal" })
    ).toBe(false);
    expect(
      canDisplayAppForUser(normalApp, { role: "aluno", studentType: "kids" })
    ).toBe(false);
    expect(
      canDisplayAppForUser(kidsApp, { role: "aluno", studentType: "kids" })
    ).toBe(true);
  });

  it("deve liberar todos os apps para professor", () => {
    const professor = { role: "professor", studentType: "normal" };
    expect(
      filterAppsForUser([commonApp, normalApp, kidsApp], professor)
    ).toEqual([commonApp, normalApp, kidsApp]);
  });
});
