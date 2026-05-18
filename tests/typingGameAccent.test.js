import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const spaceGamePath = path.resolve(
  __dirname,
  "../src/containers/applications/apps/TypingSpaceGame.jsx"
);
const pvpGamePath = path.resolve(
  __dirname,
  "../src/containers/applications/apps/TypingPvpGame.jsx"
);
const inputPath = path.resolve(
  __dirname,
  "../src/containers/applications/apps/typingInput.js"
);

const spaceGameCode = fs.readFileSync(spaceGamePath, "utf8");
const pvpGameCode = fs.readFileSync(pvpGamePath, "utf8");
const inputCode = fs.readFileSync(inputPath, "utf8");

describe("Game de digitação - acentuação", () => {
  it("deve compartilhar a normalização NFC de caracteres com a lição", () => {
    expect(inputCode).toContain("normalizeTypingCharacter");
    expect(inputCode).toContain("areTypingCharactersEquivalent");
    expect(inputCode).toContain('String(char).normalize("NFC")');
  });

  it("deve usar a comparação compartilhada no game solo e no PVP", () => {
    expect(spaceGameCode).toContain(
      "areTypingCharactersEquivalent(key, expected)"
    );
    expect(pvpGameCode).toContain(
      "areTypingCharactersEquivalent(key, expected)"
    );
  });

  it("deve passar o caractere esperado ao compor tecla morta nos games", () => {
    expect(spaceGameCode).toContain(
      "composeDeadKeyMark(pendingDeadMark, key, expectedChar, {"
    );
    expect(pvpGameCode).toContain(
      "composeDeadKeyMark(pendingDeadMark, key, expectedChar, {"
    );
  });

  it("deve permitir fallback do acento esperado quando o game recebe tecla morta genérica", () => {
    expect(spaceGameCode).toContain(
      'pendingDeadMarkAllowsExpectedFallback = source.key === "Dead"'
    );
    expect(spaceGameCode).toContain(
      "allowExpectedFallback: pendingDeadMarkAllowsExpectedFallback"
    );
    expect(pvpGameCode).toContain(
      'pendingDeadMarkAllowsExpectedFallback = source.key === "Dead"'
    );
    expect(pvpGameCode).toContain(
      "allowExpectedFallback: pendingDeadMarkAllowsExpectedFallback"
    );
  });
});
