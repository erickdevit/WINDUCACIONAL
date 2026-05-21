import { describe, expect, it } from "vitest";
import {
  UNKNOWN_DEAD_KEY_MARK,
  areTypingCharactersEquivalent,
  composeDeadKeyMark,
  normalizeTypingInputValue,
  normalizeTypingCharacter,
  resolveDeadKeyMarkFromEvent,
} from "../src/containers/applications/apps/typingInput";

describe("Entrada de digitação com acentos", () => {
  it("deve compor acento morto com a letra seguinte", () => {
    expect(composeDeadKeyMark("~", "a")).toBe("ã");
    expect(composeDeadKeyMark("´", "e")).toBe("é");
    expect(composeDeadKeyMark("^", "a")).toBe("â");
    expect(composeDeadKeyMark("^", "e")).toBe("ê");
    expect(composeDeadKeyMark("^", "o")).toBe("ô");
  });

  it("deve recompor pelo caractere esperado quando o game recebe tecla morta genérica", () => {
    expect(
      composeDeadKeyMark("`", "a", "ã", { allowExpectedFallback: true })
    ).toBe("ã");
  });

  it("deve identificar tecla morta mesmo quando o input ainda não mudou", () => {
    expect(resolveDeadKeyMarkFromEvent({ key: "Dead" })).toBe(
      UNKNOWN_DEAD_KEY_MARK
    );
    expect(
      resolveDeadKeyMarkFromEvent({
        key: "Dead",
        code: "Backquote",
        shiftKey: true,
      })
    ).toBe("~");
    expect(resolveDeadKeyMarkFromEvent({ key: "´" })).toBe("´");
  });

  it("deve mapear tecla morta do circunflexo pelo codigo Digit6 como desconhecida", () => {
    expect(
      resolveDeadKeyMarkFromEvent({
        key: "Dead",
        code: "Digit6",
        shiftKey: true,
      })
    ).toBe(UNKNOWN_DEAD_KEY_MARK);
    expect(
      resolveDeadKeyMarkFromEvent({
        key: "Dead",
        code: "Digit6",
        shiftKey: false,
      })
    ).toBe(UNKNOWN_DEAD_KEY_MARK);
    expect(
      resolveDeadKeyMarkFromEvent({
        key: "Dead",
        code: "BracketRight",
        shiftKey: true,
      })
    ).toBe("^");
  });

  it("deve ignorar acento isolado sem avançar nem contar caractere", () => {
    const result = normalizeTypingInputValue({
      nextValue: "an~",
      previousValue: "an",
      pendingMark: "",
    });

    expect(result).toEqual({
      value: "an",
      pendingMark: "~",
      ignored: true,
    });
  });

  it("deve aplicar acento pendente somente quando a letra chegar", () => {
    const result = normalizeTypingInputValue({
      nextValue: "ana",
      previousValue: "an",
      pendingMark: "~",
    });

    expect(result.value).toBe("anã");
    expect(result.pendingMark).toBe("");
    expect(result.ignored).toBe(false);
  });

  it("deve aceitar aspas duplas literais quando a lição espera aspas", () => {
    const result = normalizeTypingInputValue({
      nextValue: 'aspas "',
      previousValue: "aspas ",
      pendingMark: '"',
      referenceText: 'aspas ""',
    });

    expect(result.value).toBe('aspas "');
    expect(result.pendingMark).toBe("");
    expect(result.ignored).toBe(false);
  });

  it("deve manter aspas duplas como tecla morta quando a lição não espera aspas", () => {
    const result = normalizeTypingInputValue({
      nextValue: 'ana"',
      previousValue: "ana",
      pendingMark: "",
      referenceText: "anão",
    });

    expect(result.value).toBe("ana");
    expect(result.pendingMark).toBe('"');
    expect(result.ignored).toBe(true);
  });

  it("não deve duplicar acento quando o navegador já envia a letra composta", () => {
    const result = normalizeTypingInputValue({
      nextValue: "anã",
      previousValue: "an",
      pendingMark: "~",
      referenceText: "anão",
    });

    expect(result.value).toBe("anã");
    expect(result.pendingMark).toBe("");
    expect(result.ignored).toBe(false);
  });

  it("não deve duplicar circunflexo quando o navegador já envia a letra composta", () => {
    const result = normalizeTypingInputValue({
      nextValue: "anâ",
      previousValue: "an",
      pendingMark: "^",
      referenceText: "anâlise",
    });

    expect(result.value).toBe("anâ");
    expect(result.pendingMark).toBe("");
    expect(result.ignored).toBe(false);
  });

  it("deve compor circunflexo pendente com letra simples", () => {
    const result = normalizeTypingInputValue({
      nextValue: "ana",
      previousValue: "an",
      pendingMark: "^",
      referenceText: "anâlise",
    });

    expect(result.value).toBe("anâ");
    expect(result.pendingMark).toBe("");
    expect(result.ignored).toBe(false);
  });

  it("deve compor circunflexo com e", () => {
    expect(composeDeadKeyMark("^", "e")).toBe("ê");
    const result = normalizeTypingInputValue({
      nextValue: "e",
      previousValue: "",
      pendingMark: "^",
      referenceText: "ênfase",
    });
    expect(result.value).toBe("ê");
    expect(result.pendingMark).toBe("");
  });

  it("deve ignorar acento circunflexo isolado", () => {
    const result = normalizeTypingInputValue({
      nextValue: "a^",
      previousValue: "a",
      pendingMark: "",
    });
    expect(result.value).toBe("a");
    expect(result.pendingMark).toBe("^");
    expect(result.ignored).toBe(true);
  });

  it("deve compor trema com pending mark desconhecido pelo expectedChar", () => {
    const result = normalizeTypingInputValue({
      nextValue: "agu",
      previousValue: "ag",
      pendingMark: UNKNOWN_DEAD_KEY_MARK,
      referenceText: "agüentar",
    });

    expect(result.value).toBe("agü");
    expect(result.pendingMark).toBe("");
    expect(result.ignored).toBe(false);
  });

  it("deve compor circunflexo com pending mark desconhecido pelo expectedChar", () => {
    const result = normalizeTypingInputValue({
      nextValue: "ana",
      previousValue: "an",
      pendingMark: UNKNOWN_DEAD_KEY_MARK,
      referenceText: "anâlise",
    });

    expect(result.value).toBe("anâ");
    expect(result.pendingMark).toBe("");
    expect(result.ignored).toBe(false);
  });

  it("deve aplicar acento pendente desconhecido conforme a letra esperada", () => {
    const result = normalizeTypingInputValue({
      nextValue: "ana",
      previousValue: "an",
      pendingMark: UNKNOWN_DEAD_KEY_MARK,
      referenceText: "anão",
    });

    expect(result.value).toBe("anã");
    expect(result.pendingMark).toBe("");
    expect(result.ignored).toBe(false);
  });

  it("deve aplicar acento circunflexo pendente desconhecido com letra esperada", () => {
    const result = normalizeTypingInputValue({
      nextValue: "ana",
      previousValue: "an",
      pendingMark: UNKNOWN_DEAD_KEY_MARK,
      referenceText: "anâlise",
    });

    expect(result.value).toBe("anâ");
    expect(result.pendingMark).toBe("");
    expect(result.ignored).toBe(false);
  });

  it("não deve aceitar letra sem acento quando não houve acento pendente", () => {
    const result = normalizeTypingInputValue({
      nextValue: "ana",
      previousValue: "an",
      pendingMark: "",
      referenceText: "anão",
    });

    expect(result.value).toBe("ana");
    expect(result.pendingMark).toBe("");
    expect(result.ignored).toBe(false);
  });

  it("deve respeitar o acento real quando ele é conhecido", () => {
    const result = normalizeTypingInputValue({
      nextValue: "ana",
      previousValue: "an",
      pendingMark: "´",
      referenceText: "anão",
    });

    expect(result.value).toBe("aná");
    expect(result.pendingMark).toBe("");
    expect(composeDeadKeyMark("`", "a", "ã")).toBe("à");
  });

  it("deve normalizar letra seguida de marca combinante no mesmo evento", () => {
    const result = normalizeTypingInputValue({
      nextValue: "a\u0303",
      previousValue: "",
      pendingMark: "",
    });

    expect(result.value).toBe("ã");
    expect(result.pendingMark).toBe("");
  });

  it("deve tratar caracteres do game com a mesma forma normalizada da lição", () => {
    expect(normalizeTypingCharacter("a\u0303")).toBe("ã");
    expect(normalizeTypingCharacter("c\u0327")).toBe("ç");
    expect(normalizeTypingCharacter("á")).toBe("á");
    expect(areTypingCharactersEquivalent("a\u0303", "ã")).toBe(true);
  });
});
