import { describe, expect, it } from "vitest";
import { composeDeadKeyMark } from "../src/containers/applications/apps/typingInput";
import { buildTypingPvpText } from "../src/containers/applications/apps/typingGameData";

describe("Cenários de Regressão - Game de Digitação", () => {
  describe("Regressão de Acentos", () => {
    it("não deve engolir o acento se a combinação for inválida", () => {
      // Antes: composeDeadKeyMark("~", "c") poderia falhar e retornar apenas "c" ou engolir o acento.
      // Agora: deve retornar a composição literal falha "~c"
      expect(composeDeadKeyMark("~", "c")).toBe("~c");
    });

    it("não deve ignorar o acento se a letra base coincidir com a esperada, forçando o erro de digitação", () => {
      // Se a palavra espera "c" e o usuário digita "~c"
      // Antes: composeDeadKeyMark("~", "c", "c") retornava "c", o que fazia passar como certo
      // Agora: retorna "~c" para que normalizeTypingCharacter acuse erro pois "~c" !== "c"
      expect(composeDeadKeyMark("~", "c", "c")).toBe("~c");
    });

    it("deve compor o acento corretamente quando válido", () => {
      expect(composeDeadKeyMark("~", "a")).toBe("ã");
      expect(composeDeadKeyMark("´", "e")).toBe("é");
    });
  });

  describe("Regressão do PVP (Palavra EM e pontuação)", () => {
    it("deve remover pontuação e converter para minúsculas", () => {
      const text = buildTypingPvpText(100);
      const words = text.split(/\s+/);

      for (const word of words) {
        // Nenhuma palavra deve ter letras maiúsculas
        expect(word).toBe(word.toLowerCase());

        // Nenhuma palavra deve conter pontuação
        expect(word).not.toMatch(/[,.]/);

        // Todas devem ter tamanho >= 2
        expect(word.length).toBeGreaterThanOrEqual(2);
      }

      // Verifica se a palavra 'em' existe no texto gerado (antes era 'Em')
      expect(words).toContain("em");
    });
  });
});
