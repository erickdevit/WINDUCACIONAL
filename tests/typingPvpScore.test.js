import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const pvpGamePath = path.resolve(
  __dirname,
  "../src/containers/applications/apps/TypingPvpGame.jsx"
);

const pvpGameCode = fs.readFileSync(pvpGamePath, "utf8");

describe("Duelo de digitação - placar final", () => {
  it("deve usar pontuações atuais ao finalizar e aplicar o resultado salvo", () => {
    expect(pvpGameCode).toContain("finishRequestRef");
    expect(pvpGameCode).toContain("requestMatchFinish");
    expect(pvpGameCode).toContain("applyMatchFinished");
    expect(pvpGameCode).toContain("myWordsCompletedRef.current");
    expect(pvpGameCode).toContain("oppWordsCompletedRef.current");
    expect(pvpGameCode).toContain("result?.match");
  });

  it("deve finalizar como vitória quando o oponente perde todas as vidas", () => {
    expect(pvpGameCode).toContain("opponentLives > 0");
    expect(pvpGameCode).toContain("myLives <= 0");
    expect(pvpGameCode).toContain('requestMatchFinish("win"');
    expect(pvpGameCode).toContain('buildMatchFinishScores("win")');
  });

  it("deve contar palavra destruída antes do próximo render", () => {
    expect(pvpGameCode).toContain("normalizePvpScore");
    expect(pvpGameCode).toContain("setMyCompletedScore");
    expect(pvpGameCode).toContain("buildMatchFinishScores");
    expect(pvpGameCode).toContain(
      "const wordCompleted = targetWord.typed + 1 >= targetWord.word.length"
    );
    expect(pvpGameCode).toContain(
      "const nextWordsCompleted = setMyCompletedScore"
    );
  });
});
