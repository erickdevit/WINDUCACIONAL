import React, { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../../../utils/general";
import { api } from "../../../lib/api";
import shipSprite from "./assets/typingSpace/ship.png";
import orbitaBackground from "./assets/typingSpace/backgrounds/orbita-inicial.png";
import meteorosBackground from "./assets/typingSpace/backgrounds/chuva-de-meteoros.png";
import fronteiraBackground from "./assets/typingSpace/backgrounds/fronteira-estelar.png";
import {
  areTypingCharactersEquivalent,
  composeDeadKeyMark,
  resolveDeadKeyMarkFromEvent,
} from "./typingInput";
import {
  TYPING_SPACE_MISSIONS,
  buildTypingPvpText,
  calculateTypingGameAccuracy,
  calculateTypingGameWpm,
  getTypingSpaceWordClassName,
  readTypingGameScores,
  writeTypingGameScore,
} from "./typingGameData";
import { TypingRankingScrollArea } from "./TypingRankingScrollArea";

const COLUMN_X = [15, 32, 50, 68, 85];
const SPAWN_INTERVAL = 5;
const TICK_INTERVAL = 70;
const SHIP_Y = 91.5;
const LETTER_PITCH_PX = 30;
const LETTER_WIDTH_PX = 26;
const SHOT_MIN_MS = 90;
const SHOT_MAX_MS = 150;
const SHIP_MUZZLE_X = 0.5;
const SHIP_MUZZLE_Y = 0.16;
const MIN_Y_SPACING = 8;
const BASE_Y_START = 0;
const WORD_SPAWN_DELAY_Y = 12;
const WORD_DESPAWN_Y = 78;
const toPercentMultiplier = (value) => Math.max(0, Number(value) || 0) / 100;
const toAccelerationMultiplier = (value) =>
  1 + Math.max(0, Number(value) || 0) / 100;

let pendingDeadMark = "";
let pendingDeadMarkAllowsExpectedFallback = false;

const shuffleWithSeed = (array, seed) => {
  const result = [...array];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const buildMissionLaneMap = (mission, seed) => {
  // As palavras já vêm embaralhadas no startMission.
  // Vamos distribuir sequencialmente nas colunas com yOffset 0 para cadência constante.
  const laneMap = {};
  mission.words.forEach((_, index) => {
    const colX = COLUMN_X[index % COLUMN_X.length];
    laneMap[index] = { x: colX, yOffset: BASE_Y_START };
  });
  return laneMap;
};

const MISSION_BACKGROUNDS = {
  "orbita-inicial": orbitaBackground,
  "chuva-de-meteoros": meteorosBackground,
  "fronteira-estelar": fronteiraBackground,
};

const GAME_COMBO_REWARDS = {
  8: "Aquecendo",
  16: "No ritmo",
  24: "Sequência limpa",
  32: "Turbo",
  40: "Modo foco",
};

const resolveGameKey = (event, expectedChar = "") => {
  try {
    const source = event?.nativeEvent || event || {};
    const mark = resolveDeadKeyMarkFromEvent(event);
    if (mark) {
      pendingDeadMark = mark;
      pendingDeadMarkAllowsExpectedFallback = source.key === "Dead";
      return null;
    }

    const key = event?.key;
    if (!key || key.length !== 1) return null;
    if (event?.ctrlKey || event?.metaKey || event?.altKey) return null;

    if (pendingDeadMark) {
      const composed = composeDeadKeyMark(pendingDeadMark, key, expectedChar, {
        allowExpectedFallback: pendingDeadMarkAllowsExpectedFallback,
      });
      pendingDeadMark = "";
      pendingDeadMarkAllowsExpectedFallback = false;
      return composed || key;
    }

    return key;
  } catch (e) {
    return null;
  }
};

const createFallingWord = (mission, index, laneMap, missionSeed, baseSpeed) => {
  const lane = laneMap[index] || {
    x: COLUMN_X[index % COLUMN_X.length],
    yOffset: BASE_Y_START,
  };
  const wordString = mission.words[index];

  // Calcula margens seguras (1 letra = ~31px, Arena = 900px) para evitar corte lateral
  const halfWidthPct = ((wordString.length * 31) / 2 / 900) * 100;
  const safeMinX = halfWidthPct + 1.5;
  const safeMaxX = 100 - safeMinX;
  const clampedX = Math.max(safeMinX, Math.min(safeMaxX, lane.x));

  return {
    id: `${mission.id}-${index}-${Date.now()}-${missionSeed}`,
    word: wordString,
    typed: 0,
    x: clampedX,
    y: -5 - lane.yOffset,
    speed:
      baseSpeed *
      (0.9 + Math.min(0.36, wordString.length * 0.018) + (index % 4) * 0.035),
    impactIndex: -1,
    impactAt: 0,
  };
};

const getLetterPosition = (word, letterIndex, fieldRect) => {
  const centerX = (word.x / 100) * fieldRect.width;
  const centerY = (word.y / 100) * fieldRect.height;
  const pitchPx = Math.min(34, Math.max(24, LETTER_PITCH_PX));
  const wordHalfWidth = ((word.word.length - 1) * pitchPx) / 2;
  const letterOffset =
    letterIndex * pitchPx - wordHalfWidth + LETTER_WIDTH_PX / 2;
  return {
    x: centerX + letterOffset,
    y: centerY + 18,
  };
};

export const TypingSpaceGame = ({
  user,
  maxLives = 7,
  passMinWpm = 40,
  passMinAccuracy = 95,
  isProfessor = false,
  turmaId = null,
  turmas = [],
  gameTab = "games-solo",
  rankingTab = "global",
  gameSpeed = 100,
  gameSpeedBoost = 3,
}) => {
  const [activeMission, setActiveMission] = useState(TYPING_SPACE_MISSIONS[0]);
  const [activeMissionInstance, setActiveMissionInstance] = useState(null);
  const view =
    gameTab === "games-solo"
      ? activeMissionInstance
        ? "solo"
        : "home"
      : gameTab.replace("games-", "");
  const [gameStatus, setGameStatus] = useState("idle");
  const [fallingWords, setFallingWords] = useState([]);
  const [nextWordIndex, setNextWordIndex] = useState(0);
  const [lives, setLives] = useState(maxLives);
  const [hits, setHits] = useState(0);
  const [errors, setErrors] = useState(0);
  const [score, setScore] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [shots, setShots] = useState([]);
  const [explosions, setExplosions] = useState([]);
  const [scores, setScores] = useState({ global: [], turma: [] });
  const [loadingScores, setLoadingScores] = useState(false);
  const [selectedTurmaId, setSelectedTurmaId] = useState(turmaId || "");
  const [feedback, setFeedback] = useState(null);
  const [feedbackPulse, setFeedbackPulse] = useState(null);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [shipX, setShipX] = useState(50);
  const [missionSeed, setMissionSeed] = useState(0);
  const [laneMap, setLaneMap] = useState({});
  const [speedBoost, setSpeedBoost] = useState(1);
  const gameBaseSpeed = toPercentMultiplier(gameSpeed);
  const gameAccelerationMultiplier = toAccelerationMultiplier(gameSpeedBoost);
  const arenaRef = useRef(null);
  const fieldRef = useRef(null);
  const shipRef = useRef(null);
  const targetWordRef = useRef(null);
  const shipXRef = useRef(shipX);

  const pvpText = useMemo(() => buildTypingPvpText(), []);
  const targetWord = useMemo(() => {
    return (
      [...fallingWords].sort(
        (a, b) => b.y - a.y || a.id.localeCompare(b.id)
      )[0] || null
    );
  }, [fallingWords]);
  const wpm = calculateTypingGameWpm(hits, elapsedMs);
  const accuracy = calculateTypingGameAccuracy(hits, errors);
  const missionFinished =
    gameStatus === "running" &&
    nextWordIndex >= activeMission.words.length &&
    fallingWords.length === 0;

  const getGameRhythmColor = (ratio) => {
    if (ratio >= 0.78) return "#22c55e";
    if (ratio >= 0.52) return "#ffcc02";
    return "#f97316";
  };

  const wpmRatio = Math.min(1, Math.max(0, wpm / 60));
  const accRatio = Math.min(1, Math.max(0, accuracy / 100));
  const wpmColor = getGameRhythmColor(wpmRatio);
  const accColor = getGameRhythmColor(accRatio);

  useEffect(() => {
    targetWordRef.current = targetWord;
  }, [targetWord]);

  useEffect(() => {
    shipXRef.current = shipX;
  }, [shipX]);

  useEffect(() => {
    setLives(maxLives);
  }, [maxLives]);

  useEffect(() => {
    if (!selectedTurmaId && turmas.length > 0) {
      setSelectedTurmaId(turmas[0].id);
    }
  }, [selectedTurmaId, turmas]);

  const fetchScores = async () => {
    setLoadingScores(true);
    try {
      const globalData = await api.getTypingGameGlobalRanking("normal");
      let turmaData;
      if (rankingTab === "turma") {
        if (isProfessor && selectedTurmaId) {
          turmaData = await api.getTypingGameTurmaRankingById(
            selectedTurmaId,
            "normal"
          );
        } else {
          turmaData = await api.getTypingGameTurmaRanking();
        }
      }
      setScores({
        global: globalData.ranking || [],
        turma: turmaData?.ranking || [],
      });
    } catch (error) {
      setScores({
        global: readTypingGameScores(user?.username || "guest"),
        turma: [],
      });
    } finally {
      setLoadingScores(false);
    }
  };

  useEffect(() => {
    if (view === "scores") {
      fetchScores();
    }
  }, [view, rankingTab, selectedTurmaId]);

  useEffect(() => {
    if (view !== "solo" || gameStatus !== "running") return undefined;
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 120);
    return () => clearInterval(interval);
  }, [gameStatus, startedAt, view]);

  useEffect(() => {
    if (view !== "solo" || gameStatus !== "running") return undefined;

    const interval = setInterval(() => {
      setFallingWords((current) => {
        let missed = 0;
        const next = current
          .map((word) => ({ ...word, y: word.y + word.speed * speedBoost }))
          .filter((word) => {
            const keep = word.y < WORD_DESPAWN_Y;
            if (!keep) missed += 1;
            return keep;
          });

        if (missed > 0) {
          setErrors((value) => value + missed);
          setLives((value) => Math.max(0, value - missed));
          setFeedback({ type: "danger", text: "Palavra atravessou a defesa" });
          setCombo(0);
        }

        return next;
      });
    }, TICK_INTERVAL);

    return () => clearInterval(interval);
  }, [gameStatus, view, speedBoost]);

  useEffect(() => {
    if (view !== "solo" || gameStatus !== "running") return undefined;

    const spawnIfNeeded = () => {
      setFallingWords((current) => {
        if (nextWordIndex >= activeMission.words.length) return current;
        const lastWord = current[current.length - 1];
        if (lastWord && lastWord.y < WORD_SPAWN_DELAY_Y) return current;
        const nextWord = createFallingWord(
          activeMission,
          nextWordIndex,
          laneMap,
          missionSeed,
          gameBaseSpeed
        );
        setNextWordIndex((value) => value + 1);
        return [...current, nextWord];
      });
    };

    const interval = setInterval(spawnIfNeeded, SPAWN_INTERVAL);

    return () => clearInterval(interval);
  }, [
    activeMission,
    gameStatus,
    nextWordIndex,
    view,
    laneMap,
    missionSeed,
    gameBaseSpeed,
  ]);

  useEffect(() => {
    if (view !== "solo") {
      setShipX(50);
      return undefined;
    }

    const interval = setInterval(() => {
      const targetX = targetWordRef.current?.x ?? 50;
      setShipX((current) => current + (targetX - current) * 0.16);
    }, 32);

    return () => clearInterval(interval);
  }, [view, gameStatus, targetWord]);

  useEffect(() => {
    if (view !== "solo" || gameStatus !== "running") return undefined;

    const handleKeyDown = (event) => {
      const expected = targetWord ? targetWord.word[targetWord.typed] : "";
      const key = resolveGameKey(event, expected);
      if (!key) return;
      event.preventDefault();

      if (!targetWord) return;

      if (!areTypingCharactersEquivalent(key, expected)) {
        setErrors((value) => value + 1);
        setLives((value) => Math.max(0, value - 1));
        setCombo(0);
        setFeedback({
          type: "danger",
          text: `Tecla correta: ${expected.toUpperCase()}`,
        });
        return;
      }

      const fieldEl = fieldRef.current;
      const fieldRect = fieldEl?.getBoundingClientRect();
      const shipRect = shipRef.current?.getBoundingClientRect();
      const shipPxX =
        fieldRect && shipRect
          ? shipRect.left - fieldRect.left + shipRect.width * SHIP_MUZZLE_X
          : fieldRect
          ? (shipXRef.current / 100) * fieldRect.width
          : 0;
      const shipPxY =
        fieldRect && shipRect
          ? shipRect.top - fieldRect.top + shipRect.height * SHIP_MUZZLE_Y
          : fieldRect
          ? (SHIP_Y / 100) * fieldRect.height
          : 0;
      const targetPoint = fieldRect
        ? getLetterPosition(targetWord, targetWord.typed, fieldRect)
        : { x: shipPxX, y: shipPxY - 140 };
      const targetPxX = targetPoint.x;
      const targetPxY = targetPoint.y;
      const dx = targetPxX - shipPxX;
      const dy = targetPxY - shipPxY;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      const distance = Math.max(24, Math.hypot(dx, dy));
      const duration = Math.max(
        SHOT_MIN_MS,
        Math.min(SHOT_MAX_MS, Math.round(distance * 0.62))
      );
      const shotId = `shot-${Date.now()}-${targetWord.id}-${targetWord.typed}`;
      setShots((current) => [
        ...current.slice(-8),
        {
          id: shotId,
          x: shipPxX,
          y: shipPxY,
          angle,
          distance,
          duration,
          letter: expected.toUpperCase(),
          targetX: targetPxX,
          targetY: targetPxY,
        },
      ]);
      setExplosions((current) => [
        ...current.slice(-10),
        {
          id: `${shotId}-boom`,
          x: fieldRect ? (targetPxX / fieldRect.width) * 100 : targetWord.x,
          y: fieldRect ? (targetPxY / fieldRect.height) * 100 : targetWord.y,
          letter: expected.toUpperCase(),
        },
      ]);
      setHits((value) => value + 1);
      setScore(
        (value) =>
          value + 15 + Math.max(0, targetWord.word.length - targetWord.typed)
      );
      setFeedback({ type: "ok", text: "Impacto confirmado" });

      let nextCombo = combo + 1;
      setCombo(nextCombo);
      setBestCombo((prev) => Math.max(prev, nextCombo));

      let comboReward = null;
      if (GAME_COMBO_REWARDS[nextCombo]) {
        comboReward = GAME_COMBO_REWARDS[nextCombo];
        setFeedbackPulse({
          id: `combo-${Date.now()}`,
          type: "reward",
          message: comboReward,
          combo: nextCombo,
        });
      }

      let wordCompleted = false;
      setFallingWords((current) =>
        current.flatMap((word) => {
          if (word.id !== targetWord.id) return [word];
          const typed = word.typed + 1;
          const nextImpact = {
            impactIndex: word.typed,
            impactAt: Date.now(),
          };
          if (typed >= word.word.length) {
            wordCompleted = true;
            return [];
          }
          return [{ ...word, typed, ...nextImpact }];
        })
      );
      if (wordCompleted) {
        setSpeedBoost((prev) =>
          Math.min(prev * gameAccelerationMultiplier, 2.5)
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameStatus, targetWord, view, combo, gameAccelerationMultiplier]);

  useEffect(() => {
    if (lives > 0 || gameStatus !== "running") return;
    finishMission("lost");
  }, [gameStatus, lives]);

  useEffect(() => {
    if (!missionFinished) return;
    finishMission("won");
  }, [missionFinished]);

  useEffect(() => {
    if (!feedback) return undefined;
    const timeout = setTimeout(() => setFeedback(null), 650);
    return () => clearTimeout(timeout);
  }, [feedback]);

  useEffect(() => {
    if (!feedbackPulse) return undefined;
    const timeout = setTimeout(() => setFeedbackPulse(null), 1100);
    return () => clearTimeout(timeout);
  }, [feedbackPulse]);

  useEffect(() => {
    if (shots.length === 0 && explosions.length === 0) return undefined;
    const timeout = setTimeout(() => {
      setShots([]);
      setExplosions([]);
    }, 120);
    return () => clearTimeout(timeout);
  }, [explosions, shots]);

  const startMission = (mission) => {
    const newSeed = Date.now() + Math.floor(Math.random() * 99999);
    const shuffledWords = shuffleWithSeed([...mission.words], newSeed);
    const activeMissionInstance = { ...mission, words: shuffledWords };

    const newLaneMap = buildMissionLaneMap(activeMissionInstance, newSeed);
    setMissionSeed(newSeed);
    setLaneMap(newLaneMap);
    setActiveMission(activeMissionInstance);
    setActiveMissionInstance(activeMissionInstance);
    setGameStatus("running");
    pendingDeadMark = "";
    pendingDeadMarkAllowsExpectedFallback = false;
    setFallingWords([
      createFallingWord(
        activeMissionInstance,
        0,
        newLaneMap,
        newSeed,
        gameBaseSpeed
      ),
    ]);
    setNextWordIndex(1);
    setLives(maxLives);
    setHits(0);
    setErrors(0);
    setScore(0);
    setElapsedMs(0);
    setStartedAt(Date.now());
    setShots([]);
    setExplosions([]);
    setFeedback(null);
    setFeedbackPulse(null);
    setCombo(0);
    setBestCombo(0);
    setSpeedBoost(1);
    if (arenaRef.current) arenaRef.current.focus();
  };

  const finishMission = (status) => {
    const finalElapsedMs = startedAt ? Date.now() - startedAt : elapsedMs;
    const finalAccuracy = calculateTypingGameAccuracy(hits, errors);
    const finalWpm = calculateTypingGameWpm(hits, finalElapsedMs);
    const finalScore = score + (status === "won" ? 250 : 0) + finalAccuracy;
    setGameStatus(status);
    setElapsedMs(finalElapsedMs);
    if (!isProfessor) {
      const nextScores = writeTypingGameScore(user?.username || "guest", {
        id: `${activeMission.id}-${Date.now()}`,
        missionId: activeMission.id,
        missionTitle: activeMission.title,
        score: finalScore,
        wpm: finalWpm,
        accuracy: finalAccuracy,
        hits,
        errors,
        status,
        createdAt: new Date().toISOString(),
      });
      setScores((current) => ({ ...current, global: nextScores }));
      api
        .saveTypingGameScore?.({
          missionId: activeMission.id,
          missionTitle: activeMission.title,
          score: finalScore,
          wpm: finalWpm,
          accuracy: finalAccuracy,
          hits,
          errors,
          status,
          timeMs: finalElapsedMs,
        })
        .catch(() => {});
    }
  };

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const renderSpaceBackdrop = (variant = "arena", mission = activeMission) => (
    <div
      className={`typingSpaceBackdrop typingSpaceBackdrop--${variant}`}
      aria-hidden="true"
    >
      <div className="typingSpaceBackdropStars" />
      <img
        src={
          MISSION_BACKGROUNDS[mission?.id] ||
          MISSION_BACKGROUNDS["orbita-inicial"]
        }
        alt=""
        className="typingSpaceBackdropLayer typingSpaceBackdropImage"
      />
    </div>
  );

  const renderSoloHome = () => {
    const localScores = readTypingGameScores(user?.username || "guest");
    const passedMissions = new Set(
      localScores.filter((s) => s.status === "won").map((s) => s.missionId)
    );

    return (
      <div className="max-w-6xl mx-auto p-6 md:p-10 animate-fade-in pb-20">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Defesa Orbital
          </h2>
        </div>
        <div className="typingSpaceMissionGrid">
          {TYPING_SPACE_MISSIONS.map((mission, index) => {
            const isUnlocked =
              isProfessor ||
              index === 0 ||
              passedMissions.has(TYPING_SPACE_MISSIONS[index - 1].id);
            return (
              <button
                type="button"
                key={mission.id}
                className={`typingSpaceMissionCard ${
                  !isUnlocked ? "opacity-50 cursor-not-allowed grayscale" : ""
                }`}
                onClick={() => isUnlocked && startMission(mission)}
                disabled={!isUnlocked}
              >
                <span>{mission.difficulty}</span>
                <strong>
                  {mission.title} {!isUnlocked && "🔒"}
                </strong>
                <small>{mission.words.length} palavras</small>
                <img
                  src={
                    MISSION_BACKGROUNDS[mission.id] ||
                    MISSION_BACKGROUNDS["orbita-inicial"]
                  }
                  alt=""
                  className="typingSpaceMissionCardBg"
                />
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSoloArena = () => (
    <div
      ref={arenaRef}
      className={`typingSpaceArena ${
        gameStatus !== "running" ? "isFinished" : ""
      }`}
      tabIndex={0}
      role="application"
      aria-label="Game de digitação Defesa Orbital"
    >
      {renderSpaceBackdrop("arena")}

      <div className="typingSpaceField" ref={fieldRef}>
        {fallingWords.map((item) => (
          <div
            key={item.id}
            className={`typingSpaceWord ${
              targetWord?.id === item.id ? "isTarget" : ""
            } ${getTypingSpaceWordClassName(item.word)}`}
            style={{ left: `${item.x}%`, top: `${item.y}%` }}
          >
            {item.word.split("").map((letter, index) => (
              <span
                key={`${item.id}-${index}`}
                className={[
                  index < item.typed ? "isDestroyed" : "",
                  index === item.typed ? "isNext" : "",
                  index === item.impactIndex && Date.now() - item.impactAt < 280
                    ? "isImpacting"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {letter.toUpperCase()}
              </span>
            ))}
          </div>
        ))}

        {shots.map((shot) => {
          return (
            <div
              key={shot.id}
              className="typingSpaceShot"
              style={{
                left: `${shot.x}px`,
                top: `${shot.y}px`,
                transform: `rotate(${shot.angle}deg)`,
                "--shot-distance": `${Math.max(24, shot.distance - 10)}px`,
                "--shot-duration": `${shot.duration}ms`,
              }}
              aria-hidden="true"
            >
              <span className="typingSpaceShotCore" />
              <span className="typingSpaceShotGlow" />
            </div>
          );
        })}

        {explosions.map((explosion) => (
          <span
            key={explosion.id}
            className="typingSpaceExplosion"
            style={{ left: `${explosion.x}%`, top: `${explosion.y}%` }}
          >
            {explosion.letter}
          </span>
        ))}

        <div
          className="typingSpaceShip"
          ref={shipRef}
          aria-hidden="true"
          style={{ left: `${shipX}%` }}
        >
          <img src={shipSprite} alt="" className="typingSpaceShipSprite" />
          <span />
        </div>

        {feedback && (
          <div className={`typingSpaceFeedback ${feedback.type}`}>
            {feedback.text}
          </div>
        )}

        {feedbackPulse && gameStatus === "running" && (
          <div className="typingSpaceComboPop">
            <div
              className={`typingSpaceComboPopInner ${
                feedbackPulse.type === "reward" ? "isReward" : "isWarning"
              }`}
            >
              <div className="typingSpaceComboPopMessage">
                {feedbackPulse.message}
              </div>
              {feedbackPulse.type === "reward" && feedbackPulse.combo ? (
                <div className="typingSpaceComboPopCombo">
                  x{feedbackPulse.combo}
                </div>
              ) : null}
            </div>
          </div>
        )}

        {gameStatus === "running" && (
          <div className="typingSpaceBottomHud">
            <div className="typingSpaceLives">
              <div className="typingSpaceLivesDots">
                {Array.from({ length: maxLives }, (_, index) => (
                  <span
                    key={index}
                    className={`typingSpaceLivesDot ${
                      index < lives ? "active" : ""
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="typingSpaceGauges">
              <div className="typingSpaceGauge">
                <svg viewBox="0 0 110 65" className="typingSpaceGaugeSvg">
                  <path
                    d="M 8 58 A 45 45 0 0 1 102 58"
                    fill="none"
                    stroke="rgb(148 163 184 / 18%)"
                    strokeWidth="7"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 8 58 A 45 45 0 0 1 102 58"
                    fill="none"
                    stroke={wpmColor}
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={`${wpmRatio * 141.3} 141.3`}
                    style={{ filter: `drop-shadow(0 0 4px ${wpmColor})` }}
                  />
                </svg>
                <div
                  className="typingSpaceGaugeInner"
                  style={{ color: wpmColor }}
                >
                  <span className="typingSpaceGaugeValue">{wpm}</span>
                  <span className="typingSpaceGaugeLabel">PPM</span>
                </div>
              </div>
              <div className="typingSpaceGauge">
                <svg viewBox="0 0 110 65" className="typingSpaceGaugeSvg">
                  <path
                    d="M 8 58 A 45 45 0 0 1 102 58"
                    fill="none"
                    stroke="rgb(148 163 184 / 18%)"
                    strokeWidth="7"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 8 58 A 45 45 0 0 1 102 58"
                    fill="none"
                    stroke={accColor}
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={`${accRatio * 141.3} 141.3`}
                    style={{ filter: `drop-shadow(0 0 4px ${accColor})` }}
                  />
                </svg>
                <div
                  className="typingSpaceGaugeInner"
                  style={{ color: accColor }}
                >
                  <span className="typingSpaceGaugeValue">{accuracy}</span>
                  <span className="typingSpaceGaugeLabel">PRE</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {gameStatus !== "running" && (
          <>
            <div className={`typingSpaceResultBackdrop ${gameStatus}`} />
            <div className={`typingSpaceResult ${gameStatus}`}>
              <div className="typingSpaceResultIcon">
                {gameStatus === "won" ? (
                  <svg viewBox="0 0 48 48" fill="none">
                    <circle cx="24" cy="24" r="22" fill="url(#winGrad)" />
                    <path
                      d="M14 24l7 7 13-13"
                      stroke="#fff"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <defs>
                      <linearGradient
                        id="winGrad"
                        x1="0"
                        y1="0"
                        x2="48"
                        y2="48"
                      >
                        <stop stopColor="#22c55e" />
                        <stop offset="1" stopColor="#16a34a" />
                      </linearGradient>
                    </defs>
                  </svg>
                ) : (
                  <svg viewBox="0 0 48 48" fill="none">
                    <circle cx="24" cy="24" r="22" fill="url(#loseGrad)" />
                    <path
                      d="M16 16l16 16M32 16l-16 16"
                      stroke="#fff"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient
                        id="loseGrad"
                        x1="0"
                        y1="0"
                        x2="48"
                        y2="48"
                      >
                        <stop stopColor="#ef4444" />
                        <stop offset="1" stopColor="#b91c1c" />
                      </linearGradient>
                    </defs>
                  </svg>
                )}
              </div>
              <strong>
                {gameStatus === "won"
                  ? "Setor protegido!"
                  : "Defesa comprometida"}
              </strong>
              <div className="typingSpaceResultStats">
                <div className="typingSpaceResultStat">
                  <span className="typingSpaceResultStatLabel">Pontuação</span>
                  <div className="typingSpaceResultStatValue">
                    {Math.floor(score / 10)}
                  </div>
                </div>
                <div className="typingSpaceResultStat">
                  <span className="typingSpaceResultStatLabel">Velocidade</span>
                  <div
                    className={`typingSpaceResultStatValue ${
                      wpm < passMinWpm ? "text-red-400" : "text-green-400"
                    }`}
                  >
                    {wpm} <small>PPM</small>
                  </div>
                  {wpm < passMinWpm && (
                    <div className="typingSpaceResultStatGap">
                      Faltam {passMinWpm - wpm} PPM
                    </div>
                  )}
                </div>
                <div className="typingSpaceResultStat">
                  <span className="typingSpaceResultStatLabel">Precisão</span>
                  <div
                    className={`typingSpaceResultStatValue ${
                      accuracy < passMinAccuracy
                        ? "text-red-400"
                        : "text-green-400"
                    }`}
                  >
                    {accuracy}% <small>%</small>
                  </div>
                  {accuracy < passMinAccuracy && (
                    <div className="typingSpaceResultStatGap">
                      Faltam {passMinAccuracy - accuracy}%
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (gameStatus === "won") {
                    const currentIndex = TYPING_SPACE_MISSIONS.findIndex(
                      (m) => m.id === activeMission.id
                    );
                    const nextMission = TYPING_SPACE_MISSIONS[currentIndex + 1];
                    if (nextMission) {
                      startMission(nextMission);
                    } else {
                      setActiveMissionInstance(null);
                    }
                  } else {
                    startMission(activeMission);
                  }
                }}
              >
                {gameStatus === "won" ? "Próxima missão" : "Tentar novamente"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  const renderScores = () => (
    <div className="max-w-4xl mx-auto p-6 md:p-10 animate-fade-in pb-20">
      {rankingTab === "turma" && isProfessor && turmas.length > 0 && (
        <div className="mb-6 flex justify-end">
          <select
            value={selectedTurmaId}
            onChange={(event) => setSelectedTurmaId(event.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-bold text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white outline-none focus:border-[#ffcc02]"
          >
            {turmas.map((turma) => (
              <option key={turma.id} value={turma.id}>
                {turma.nome}
              </option>
            ))}
          </select>
        </div>
      )}
      {loadingScores ? (
        <div className="flex justify-center items-center min-h-[280px] text-[#ffcc02]">
          <Icon fafa="spinner" width={32} className="animate-spin" />
        </div>
      ) : scores[rankingTab].length === 0 ? (
        <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center text-gray-500 font-medium shadow-sm">
          Nenhuma missão registrada neste game.
        </div>
      ) : (
        <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
          <TypingRankingScrollArea variant="game">
            <table className="w-full text-left">
              <thead className="text-xs uppercase text-gray-400 bg-gray-50 dark:bg-[#18181b] border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 w-16 text-center">Pos</th>
                  <th className="px-6 py-3">Usuário</th>
                  <th className="px-6 py-3 text-right">Pontos</th>
                  <th className="px-6 py-3 hidden sm:table-cell text-right">
                    Missões
                  </th>
                  <th className="px-6 py-3 text-right">PPM</th>
                  <th className="px-6 py-3 text-right">Precisão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                {scores[rankingTab].map((item, index) => {
                  const isMe =
                    item.user_id === user.id ||
                    item.name === (user.name || user.username);
                  return (
                    <tr
                      key={item.user_id || item.id || index}
                      className={`hover:bg-gray-50/50 dark:hover:bg-[#202024] transition-colors ${
                        isMe ? "bg-[#ffcc02]/20" : ""
                      }`}
                    >
                      <td className="px-6 py-4 text-center">
                        {index === 0 ? (
                          <span className="text-xl">🥇</span>
                        ) : index === 1 ? (
                          <span className="text-xl">🥈</span>
                        ) : index === 2 ? (
                          <span className="text-xl">🥉</span>
                        ) : (
                          <span className="font-bold text-gray-400 dark:text-gray-500">
                            {index + 1}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900 dark:text-gray-100">
                        {item.name ||
                          item.missionTitle ||
                          `Registro ${index + 1}`}
                        {isMe && (
                          <span className="ml-2 text-[10px] bg-[#ffcc02] text-black px-2 py-0.5 rounded uppercase">
                            Você
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-black text-[#ffcc02]">
                        {item.points || item.score || 0}
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell text-right text-gray-500 dark:text-gray-400 font-bold">
                        {item.missions_completed || 1}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300 font-black">
                        {item.best_wpm || item.wpm || 0}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300 font-black">
                        {Math.floor(item.best_accuracy || item.accuracy || 0)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TypingRankingScrollArea>
        </div>
      )}
    </div>
  );

  return (
    <div className="typingSpaceGame">
      {view === "home" && renderSoloHome()}
      {view === "solo" && renderSoloArena()}
      {view === "scores" && renderScores()}
    </div>
  );
};
