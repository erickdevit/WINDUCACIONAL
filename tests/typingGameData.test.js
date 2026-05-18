/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, beforeEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  TYPING_SPACE_GREEN_MAX_LENGTH,
  TYPING_SPACE_MISSIONS,
  TYPING_SPACE_RED_MIN_LENGTH,
  buildTypingPvpText,
  calculateTypingGameAccuracy,
  calculateTypingGameWpm,
  getTypingSpaceWordClassName,
  readTypingGameScores,
  writeTypingGameScore,
} from "../src/containers/applications/apps/typingGameData";
import {
  DEFAULT_PLAYER_PROJECTILE,
  PROJECTILE_SPRITES,
  getProjectileSprite,
} from "../src/containers/applications/apps/projectileSprites";

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = String(value);
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

const spaceGameCode = fs.readFileSync(
  path.resolve(
    __dirname,
    "../src/containers/applications/apps/TypingSpaceGame.jsx"
  ),
  "utf8"
);

describe("Dados e regras do game de digitação", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("define missões solo apenas com palavras", () => {
    expect(TYPING_SPACE_MISSIONS.length).toBeGreaterThanOrEqual(3);

    for (const mission of TYPING_SPACE_MISSIONS) {
      expect(mission.words.length).toBeGreaterThan(10);
      for (const word of mission.words) {
        expect(word).toMatch(/^[a-záàâãéêíóôõúç]+$/i);
        expect(word.includes(" ")).toBe(false);
      }
    }
  });

  it("define fases do Defesa Orbital por cor e quantidade de palavras", () => {
    const [firstMission, secondMission, thirdMission] = TYPING_SPACE_MISSIONS;
    const isGreenWord = (word) => word.length <= TYPING_SPACE_GREEN_MAX_LENGTH;
    const isYellowWord = (word) =>
      word.length > TYPING_SPACE_GREEN_MAX_LENGTH &&
      word.length < TYPING_SPACE_RED_MIN_LENGTH;
    const isRedWord = (word) => word.length >= TYPING_SPACE_RED_MIN_LENGTH;

    expect(firstMission.words).toHaveLength(50);
    expect(firstMission.words.every(isGreenWord)).toBe(true);

    expect(secondMission.words).toHaveLength(100);
    expect(
      secondMission.words.every(
        (word) => isGreenWord(word) || isYellowWord(word)
      )
    ).toBe(true);
    expect(secondMission.words.some(isGreenWord)).toBe(true);
    expect(secondMission.words.some(isYellowWord)).toBe(true);

    expect(thirdMission.words).toHaveLength(150);
    expect(
      thirdMission.words.every((word) => isYellowWord(word) || isRedWord(word))
    ).toBe(true);
    expect(thirdMission.words.some(isYellowWord)).toBe(true);
    expect(thirdMission.words.some(isRedWord)).toBe(true);
  });

  it("classifica palavras verdes até cinco letras", () => {
    expect(getTypingSpaceWordClassName("mouse")).toBe("isShort");
    expect(getTypingSpaceWordClassName("teclado")).toBe("isMedium");
    expect(getTypingSpaceWordClassName("aprendizado")).toBe("isLong");
  });

  it("atualiza a missão ativa para usar o background correto da arena", () => {
    expect(spaceGameCode).toContain("setActiveMission(activeMissionInstance)");
    expect(spaceGameCode).toContain("MISSION_BACKGROUNDS[mission?.id]");
  });

  it("gera texto PVP com pelo menos 500 palavras", () => {
    const text = buildTypingPvpText();
    expect(text.split(/\s+/)).toHaveLength(520);
  });

  it("calcula precisão e PPM do modo game", () => {
    expect(calculateTypingGameAccuracy(9, 1)).toBe(90);
    expect(calculateTypingGameAccuracy(0, 0)).toBe(100);
    expect(calculateTypingGameWpm(250, 60000)).toBe(50);
  });

  it("mantém ranking separado do game ordenado por pontuação", () => {
    writeTypingGameScore("ana", {
      id: "score-1",
      missionTitle: "Órbita Inicial",
      score: 120,
      wpm: 20,
      accuracy: 90,
    });
    writeTypingGameScore("ana", {
      id: "score-2",
      missionTitle: "Fronteira Estelar",
      score: 360,
      wpm: 34,
      accuracy: 96,
    });

    const scores = readTypingGameScores("ana");
    expect(scores.map((item) => item.id)).toEqual(["score-2", "score-1"]);
    expect(localStorage.getItem("typingSpaceScores_ana")).toContain(
      "Fronteira Estelar"
    );
  });

  it("mantém mapeamento do projétil da nave", () => {
    const defaultSprite = getProjectileSprite();

    expect(DEFAULT_PLAYER_PROJECTILE).toBe("shipBlueBullet");
    expect(defaultSprite).toBe(PROJECTILE_SPRITES.shipBlueBullet);
    expect(defaultSprite.width).toBe(80);
    expect(defaultSprite.height).toBe(80);
    expect(defaultSprite.renderWidth).toBeGreaterThan(0);
    expect(defaultSprite.src).toMatch(/ship_Bullrt_sprite\.png/);
  });
});
