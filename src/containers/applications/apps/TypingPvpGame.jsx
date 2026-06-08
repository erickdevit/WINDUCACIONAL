import React, { useState, useEffect, useRef, useMemo } from "react";
import { Icon } from "../../../utils/general";
import { api } from "../../../lib/api";
import shipSprite from "./assets/typingSpace/ship.png";
import orbitaBackground from "./assets/typingSpace/backgrounds/orbita-inicial.png";
import {
  areTypingCharactersEquivalent,
  composeDeadKeyMark,
  resolveDeadKeyMarkFromEvent,
} from "./typingInput";
import {
  buildTypingPvpText,
  calculateTypingGameAccuracy,
  calculateTypingGameWpm,
  getTypingSpaceWordClassName,
} from "./typingGameData";

// PVP Constants
const PVP_LANES = { P1: 25, P2: 75 };
const TICK_INTERVAL = 70;
const SPAWN_INTERVAL = 5;
const SHIP_Y = 91.5;
const LETTER_PITCH_PX = 30;
const LETTER_WIDTH_PX = 26;
const SHOT_MIN_MS = 90;
const SHOT_MAX_MS = 150;
const SHIP_MUZZLE_X = 0.5;
const SHIP_MUZZLE_Y = 0.16;
const WORD_SPAWN_DELAY_Y = 12;
const WORD_DESPAWN_Y = 78;
const MAX_LIVES = 7;
const toPercentMultiplier = (value) => Math.max(0, Number(value) || 0) / 100;
const toAccelerationMultiplier = (value) =>
  1 + Math.max(0, Number(value) || 0) / 100;
const normalizePvpScore = (value) => {
  const score = Number(value);
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.trunc(score));
};

let pendingDeadMark = "";
let pendingDeadMarkAllowsExpectedFallback = false;

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

const getLetterPosition = (word, letterIndex, fieldRect) => {
  const centerX = (word.x / 100) * fieldRect.width;
  const centerY = (word.y / 100) * fieldRect.height;
  const pitchPx = Math.min(34, Math.max(24, LETTER_PITCH_PX));
  const wordHalfWidth = ((word.word.length - 1) * pitchPx) / 2;
  const letterOffset =
    letterIndex * pitchPx - wordHalfWidth + LETTER_WIDTH_PX / 2;
  return { x: centerX + letterOffset, y: centerY + 18 };
};

const getGameRhythmColor = (ratio) => {
  if (ratio >= 0.78) return "#22c55e";
  if (ratio >= 0.52) return "#ffcc02";
  return "#f97316";
};

const createFallingWordPvp = (
  wordString,
  index,
  owner,
  myIndex,
  seed,
  baseSpeed
) => {
  const laneX =
    owner === 0
      ? 10 + ((seed + index * 17) % 35) // 10% - 45% (Left)
      : 55 + ((seed + index * 17) % 35); // 55% - 90% (Right)

  return {
    id: `${owner}-${index}-${seed}`,
    word: wordString,
    typed: 0,
    x: laneX,
    y: -5,
    speed:
      baseSpeed *
      (0.9 + Math.min(0.36, wordString.length * 0.018) + (index % 4) * 0.035),
    owner,
    index,
  };
};

export const TypingPvpGame = ({
  user,
  gameTab,
  rankingTab = "global",
  isProfessor = false,
  turmas = [],
  selectedTurmaId = "",
  onSelectedTurmaChange = () => {},
  gameSpeed = 100,
  gameSpeedBoost = 3,
  pendingChallenge = null,
}) => {
  const [lobbyPlayers, setLobbyPlayers] = useState([]);
  const [challengeReceived, setChallengeReceived] = useState(null);
  const [isWaitingRandom, setIsWaitingRandom] = useState(false);
  const [gameState, setGameState] = useState("lobby"); // lobby, playing, finished
  const [roomId, setRoomId] = useState(null);
  const [players, setPlayers] = useState([]); // [me, opponent]
  const [myIndex, setMyIndex] = useState(0); // 0 or 1
  const [matchWinner, setMatchWinner] = useState(null);
  const [isChallenging, setIsChallenging] = useState(false);
  const [challengeTargetName, setChallengeTargetName] = useState("");
  const [pvpNotification, setPvpNotification] = useState(null);
  const [pvpScores, setPvpScores] = useState([]);
  const [wordsArray, setWordsArray] = useState([]);
  const [myWordIndex, setMyWordIndex] = useState(0);
  const [opponentWordIndex, setOpponentWordIndex] = useState(0);
  const [myWordsCompleted, setMyWordsCompleted] = useState(0);
  const [opponentWordsCompleted, setOpponentWordsCompleted] = useState(0);
  const gameBaseSpeed = toPercentMultiplier(gameSpeed);
  const gameAccelerationMultiplier = toAccelerationMultiplier(gameSpeedBoost);

  const myWordsCompletedRef = useRef(0);
  const oppWordsCompletedRef = useRef(0);
  const finishRequestRef = useRef(false);

  const setMyCompletedScore = (value) => {
    const nextScore = normalizePvpScore(value);
    myWordsCompletedRef.current = nextScore;
    setMyWordsCompleted(nextScore);
    return nextScore;
  };

  const setOpponentCompletedScore = (value) => {
    const nextScore = normalizePvpScore(value);
    oppWordsCompletedRef.current = nextScore;
    setOpponentWordsCompleted(nextScore);
    return nextScore;
  };

  const buildMatchFinishScores = (resultType) => {
    const myScore = normalizePvpScore(myWordsCompletedRef.current);
    const opponentScore = normalizePvpScore(oppWordsCompletedRef.current);

    return resultType === "win"
      ? { winnerScore: myScore, loserScore: opponentScore }
      : { winnerScore: opponentScore, loserScore: myScore };
  };

  // Game state
  const [fallingWords, setFallingWords] = useState([]);
  const [myShipX, setMyShipX] = useState(PVP_LANES.P1);
  const [opponentShipX, setOpponentShipX] = useState(PVP_LANES.P2);

  const [myLives, setMyLives] = useState(MAX_LIVES);
  const [opponentLives, setOpponentLives] = useState(MAX_LIVES);

  const [hits, setHits] = useState(0);
  const [errors, setErrors] = useState(0);
  const [opponentHits, setOpponentHits] = useState(0);
  const [opponentErrors, setOpponentErrors] = useState(0);

  const [startedAt, setStartedAt] = useState(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  const [speedBoost, setSpeedBoost] = useState(1);
  const [opponentSpeedBoost, setOpponentSpeedBoost] = useState(1);

  const [shots, setShots] = useState([]);
  const [explosions, setExplosions] = useState([]);
  const [opponentShots, setOpponentShots] = useState([]);
  const [opponentExplosions, setOpponentExplosions] = useState([]);
  const [combo, setCombo] = useState(0);
  const [missionSeed, setMissionSeed] = useState(0);
  const [feedback, setFeedback] = useState(null);

  const fieldRef = useRef(null);
  const arenaRef = useRef(null);
  const sseRef = useRef(null);
  const pendingChallengeRef = useRef(null);

  const targetWord = useMemo(() => {
    return (
      [...fallingWords]
        .filter((w) => w.owner === myIndex)
        .sort((a, b) => b.y - a.y || a.id.localeCompare(b.id))[0] || null
    );
  }, [fallingWords, myIndex]);

  const myWpm = calculateTypingGameWpm(hits, elapsedMs);
  const myAccuracy = calculateTypingGameAccuracy(hits, errors);
  const oppWpm = calculateTypingGameWpm(opponentHits, elapsedMs);
  const oppAccuracy = calculateTypingGameAccuracy(opponentHits, opponentErrors);

  useEffect(() => {
    if (!feedback) return undefined;
    const timeout = setTimeout(() => setFeedback(null), 650);
    return () => clearTimeout(timeout);
  }, [feedback]);

  useEffect(() => {
    if (gameTab === "games-pvp-scores") {
      fetchScores();
    } else {
      fetchLobby();
      const interval = setInterval(fetchLobby, 5000);
      return () => clearInterval(interval);
    }
  }, [gameTab, rankingTab, selectedTurmaId]);

  useEffect(() => {
    if (!pendingChallenge?.id) return;
    if (pendingChallengeRef.current === pendingChallenge.id) return;
    pendingChallengeRef.current = pendingChallenge.id;
    setGameState("lobby");
    setChallengeReceived(pendingChallenge);
  }, [pendingChallenge]);

  useEffect(() => {
    if (typeof EventSource !== "undefined" && !sseRef.current) {
      const source = new EventSource("/api/typing-pvp/stream", {
        withCredentials: true,
      });
      source.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleServerMessage(data);
        } catch (err) {}
      };
      sseRef.current = source;
    }
    return () => {
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
    };
  }, []);

  const handleServerMessage = (msg) => {
    if (msg.type === "challenge_received") {
      setChallengeReceived(msg.challenger);
    } else if (msg.type === "challenge_rejected") {
      setIsChallenging(false);
      setPvpNotification({ type: "rejected" });
    } else if (msg.type === "match_started") {
      setRoomId(msg.roomId);
      setPlayers(msg.players);
      setMyIndex(msg.players[0].id === user.id ? 0 : 1);
      setMissionSeed(msg.seed);
      setChallengeReceived(null);
      setIsWaitingRandom(false);
      setIsChallenging(false);
      startGame(msg.seed, msg.players[0].id === user.id ? 0 : 1);
    } else if (msg.type === "sync") {
      if (msg.userId !== user.id) {
        setOpponentShipX(msg.state.shipX);
        if (msg.state.hits !== undefined) setOpponentHits(msg.state.hits);
        if (msg.state.errors !== undefined) setOpponentErrors(msg.state.errors);
        if (msg.state.lives !== undefined) setOpponentLives(msg.state.lives);
        if (msg.state.speedBoost !== undefined)
          setOpponentSpeedBoost(msg.state.speedBoost);
        if (msg.state.wordsCompleted !== undefined) {
          setOpponentCompletedScore(msg.state.wordsCompleted);
        }

        if (msg.state.targetWordId && msg.state.targetWordTyped !== undefined) {
          setFallingWords((current) => {
            const updated = current.map((w) =>
              w.id === msg.state.targetWordId
                ? { ...w, typed: msg.state.targetWordTyped }
                : w
            );
            const target = updated.find((w) => w.id === msg.state.targetWordId);
            if (
              target &&
              target.owner !== myIndex &&
              target.typed >= target.word.length
            ) {
              return updated.filter((w) => w.id !== msg.state.targetWordId);
            }
            return updated;
          });
        }
        if (msg.state.shot) {
          const fieldWidth = fieldRef.current
            ? fieldRef.current.getBoundingClientRect().width
            : 0;
          const mirroredShot = {
            ...msg.state.shot,
            // Objective coordinates, no mirroring needed
            x: msg.state.shot.x,
            targetX: msg.state.shot.targetX,
            angle: msg.state.shot.angle,
          };

          setOpponentShots((curr) => [...curr.slice(-8), mirroredShot]);
          const exX = fieldWidth
            ? (mirroredShot.targetX / fieldWidth) * 100
            : 50;
          const exY = fieldRef.current
            ? (msg.state.shot.targetY /
                fieldRef.current.getBoundingClientRect().height) *
              100
            : 50;
          setOpponentExplosions((curr) => [
            ...curr.slice(-10),
            {
              id: msg.state.shot.id + "-boom",
              x: exX,
              y: exY,
              letter: msg.state.shot.letter,
            },
          ]);
        }
      }
    } else if (msg.type === "opponent_disconnected") {
      setPvpNotification({ type: "disconnected" });
      setGameState("lobby");
    } else if (msg.type === "match_finished") {
      applyMatchFinished(msg);
    }
  };

  const applyMatchFinished = (match) => {
    const winnerScore = Number(match?.winnerScore) || 0;
    const loserScore = Number(match?.loserScore) || 0;
    const winnerId = match?.winnerId || null;

    setGameState("finished");
    setMatchWinner(winnerId);

    if (winnerId === user.id) {
      setMyCompletedScore(winnerScore);
      setOpponentCompletedScore(loserScore);
      return;
    }

    setMyCompletedScore(loserScore);
    setOpponentCompletedScore(winnerScore);
  };

  const requestMatchFinish = async (resultType, scores) => {
    if (finishRequestRef.current) return;
    finishRequestRef.current = true;

    const payload = {
      winnerScore: Number(scores?.winnerScore) || 0,
      loserScore: Number(scores?.loserScore) || 0,
    };

    try {
      const result =
        resultType === "win"
          ? await api.winPvpMatch(payload)
          : await api.losePvpMatch(payload);

      if (result?.match) {
        applyMatchFinished(result.match);
      }
    } catch (error) {
      finishRequestRef.current = false;
      setPvpNotification({
        type: "error",
        message:
          error.message || "Não foi possível salvar o placar final do duelo.",
      });
    }
  };

  const fetchScores = async () => {
    try {
      const res = await api.getPvpScores({
        scope: rankingTab,
        turmaId:
          rankingTab === "turma" && isProfessor ? selectedTurmaId : undefined,
      });
      setPvpScores(res.matches || []);
    } catch (e) {}
  };

  const fetchLobby = async () => {
    try {
      const res = await api.getTypingPvpLobby();
      setLobbyPlayers(res.players || []);
    } catch (e) {}
  };

  const challengePlayer = async (targetId, targetName) => {
    try {
      setChallengeTargetName(targetName);
      setIsChallenging(true);
      await api.challengePvpPlayer(targetId);
    } catch (e) {
      setIsChallenging(false);
      setPvpNotification({
        type: "error",
        message: e.message || "Erro ao desafiar.",
      });
    }
  };

  const acceptChallenge = async () => {
    if (!challengeReceived) return;
    try {
      await api.acceptPvpChallenge(challengeReceived.id);
      setChallengeReceived(null);
    } catch (e) {
      setPvpNotification({
        type: "error",
        message: e.message || "Erro ao aceitar desafio.",
      });
    }
  };

  const rejectChallenge = async () => {
    if (!challengeReceived) return;
    try {
      await api.rejectPvpChallenge(challengeReceived.id);
      setChallengeReceived(null);
    } catch (e) {}
  };

  const toggleRandom = async () => {
    try {
      if (isWaitingRandom) {
        await api.cancelPvpRandom();
        setIsWaitingRandom(false);
      } else {
        const res = await api.joinPvpRandom();
        if (res.status === "waiting") {
          setIsWaitingRandom(true);
        }
      }
    } catch (e) {}
  };

  const startGame = (seed, myIdx) => {
    setGameState("playing");
    setMatchWinner(null);
    finishRequestRef.current = false;
    pendingDeadMark = "";
    pendingDeadMarkAllowsExpectedFallback = false;
    setMyCompletedScore(0);
    setOpponentCompletedScore(0);
    setPvpNotification(null);
    setHits(0);
    setErrors(0);
    setMyLives(MAX_LIVES);
    setOpponentLives(MAX_LIVES);
    setOpponentHits(0);
    setOpponentErrors(0);
    setShots([]);
    setExplosions([]);
    setOpponentShots([]);
    setOpponentExplosions([]);
    setMyShipX(myIdx === 0 ? PVP_LANES.P1 : PVP_LANES.P2);
    setOpponentShipX(myIdx === 0 ? PVP_LANES.P2 : PVP_LANES.P1);
    setSpeedBoost(1);
    setOpponentSpeedBoost(1);
    setStartedAt(Date.now());
    setElapsedMs(0);

    const pvpText = buildTypingPvpText(500);
    let allWords = pvpText.split(/\s+/).filter((w) => w.length >= 2);

    let s = seed;
    for (let i = allWords.length - 1; i > 0; i--) {
      s = (s * 9301 + 49297) % 233280;
      const j = Math.floor((s / 233280) * (i + 1));
      [allWords[i], allWords[j]] = [allWords[j], allWords[i]];
    }

    allWords = allWords.slice(0, 150);
    allWords.sort((a, b) => a.length - b.length);
    const finalWords = allWords;
    setWordsArray(finalWords);

    const initialWords = [];
    initialWords.push(
      createFallingWordPvp(finalWords[0], 0, 0, myIdx, seed, gameBaseSpeed)
    );
    initialWords.push(
      createFallingWordPvp(finalWords[0], 0, 1, myIdx, seed, gameBaseSpeed)
    );

    setMyWordIndex(1);
    setOpponentWordIndex(1);
    setFallingWords(initialWords);
    if (arenaRef.current) arenaRef.current.focus();
  };

  useEffect(() => {
    if (gameState !== "playing") return;
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 120);
    return () => clearInterval(interval);
  }, [gameState, startedAt]);

  useEffect(() => {
    if (gameState !== "playing") return;
    const interval = setInterval(() => {
      setFallingWords((current) => {
        let myMissed = 0;
        let oppMissed = 0;
        const next = current
          .map((word) => {
            const boost =
              word.owner === myIndex ? speedBoost : opponentSpeedBoost;
            return { ...word, y: word.y + word.speed * boost };
          })
          .filter((word) => {
            const keep = word.y < WORD_DESPAWN_Y;
            if (!keep) {
              if (word.owner === myIndex) myMissed++;
              else oppMissed++;
            }
            return keep;
          });

        if (myMissed > 0) {
          setErrors((v) => v + myMissed);
          setMyLives((v) => {
            const newLives = Math.max(0, v - myMissed);
            if (newLives === 0 && !matchWinner)
              requestMatchFinish("lose", buildMatchFinishScores("lose"));
            return newLives;
          });
          setCombo(0);

          api
            .syncPvpState({
              shipX: myShipX,
              hits,
              errors: errors + myMissed,
              lives: Math.max(0, myLives - myMissed),
              speedBoost,
              targetWordId: targetWord ? targetWord.id : null,
              targetWordTyped: targetWord ? targetWord.typed : null,
              wordsCompleted: myWordsCompleted,
            })
            .catch(() => {});
        }
        if (oppMissed > 0) {
          setOpponentErrors((v) => v + oppMissed);
          setOpponentLives((v) => Math.max(0, v - oppMissed));
        }

        return next;
      });
    }, TICK_INTERVAL);
    return () => clearInterval(interval);
  }, [gameState, myIndex, speedBoost, opponentSpeedBoost, matchWinner]);

  useEffect(() => {
    if (gameState !== "playing") return;
    const spawnIfNeeded = () => {
      setFallingWords((current) => {
        let newWords = [...current];
        let myAdded = false;
        let oppAdded = false;

        if (myWordIndex < wordsArray.length) {
          const myLastWord = current
            .filter((w) => w.owner === myIndex)
            .slice(-1)[0];
          if (!myLastWord || myLastWord.y >= WORD_SPAWN_DELAY_Y) {
            newWords.push(
              createFallingWordPvp(
                wordsArray[myWordIndex],
                myWordIndex,
                myIndex,
                myIndex,
                missionSeed,
                gameBaseSpeed
              )
            );
            myAdded = true;
          }
        }

        if (opponentWordIndex < wordsArray.length) {
          const oppLastWord = current
            .filter((w) => w.owner !== myIndex)
            .slice(-1)[0];
          if (!oppLastWord || oppLastWord.y >= WORD_SPAWN_DELAY_Y) {
            newWords.push(
              createFallingWordPvp(
                wordsArray[opponentWordIndex],
                opponentWordIndex,
                myIndex === 0 ? 1 : 0,
                myIndex,
                missionSeed,
                gameBaseSpeed
              )
            );
            oppAdded = true;
          }
        }

        if (myAdded) setMyWordIndex((v) => v + 1);
        if (oppAdded) setOpponentWordIndex((v) => v + 1);

        return newWords;
      });
    };
    const interval = setInterval(spawnIfNeeded, SPAWN_INTERVAL);
    return () => clearInterval(interval);
  }, [
    gameState,
    myWordIndex,
    opponentWordIndex,
    wordsArray,
    missionSeed,
    myIndex,
    gameBaseSpeed,
  ]);

  useEffect(() => {
    if (gameState !== "playing") return;
    const defaultX = myIndex === 0 ? PVP_LANES.P1 : PVP_LANES.P2;
    const targetX = targetWord ? targetWord.x : defaultX;
    const interval = setInterval(() => {
      setMyShipX((curr) => curr + (targetX - curr) * 0.16);
    }, 32);
    return () => clearInterval(interval);
  }, [gameState, targetWord, myIndex]);

  useEffect(() => {
    if (gameState !== "playing") return;
    const interval = setInterval(() => {
      api
        .syncPvpState({
          shipX: myShipX,
          hits,
          errors,
          lives: myLives,
          speedBoost,
          targetWordId: targetWord ? targetWord.id : null,
          targetWordTyped: targetWord ? targetWord.typed : null,
          wordsCompleted: myWordsCompleted,
        })
        .catch(() => {});
    }, 200);
    return () => clearInterval(interval);
  }, [
    gameState,
    myShipX,
    hits,
    errors,
    myLives,
    speedBoost,
    targetWord,
    myWordsCompleted,
  ]);

  useEffect(() => {
    if (
      gameState !== "playing" ||
      matchWinner ||
      opponentLives > 0 ||
      myLives <= 0
    ) {
      return;
    }

    requestMatchFinish("win", buildMatchFinishScores("win"));
  }, [gameState, matchWinner, opponentLives, myLives]);

  useEffect(() => {
    if (gameState !== "playing") return;
    const handleKeyDown = (event) => {
      const expected = targetWord ? targetWord.word[targetWord.typed] : "";
      const key = resolveGameKey(event, expected);
      if (!key) return;
      event.preventDefault();

      if (!targetWord) return;

      if (!areTypingCharactersEquivalent(key, expected)) {
        setErrors((v) => v + 1);
        setMyLives((v) => {
          const newLives = Math.max(0, v - 1);
          if (newLives === 0 && !matchWinner)
            requestMatchFinish("lose", buildMatchFinishScores("lose"));
          return newLives;
        });
        setCombo(0);
        setFeedback({
          type: "danger",
          text: `Tecla correta: ${expected.toUpperCase()}`,
        });

        api
          .syncPvpState({
            shipX: myShipX,
            hits,
            errors: errors + 1,
            lives: Math.max(0, myLives - 1),
            speedBoost,
            targetWordId: targetWord.id,
            targetWordTyped: targetWord.typed,
            wordsCompleted: myWordsCompleted,
          })
          .catch(() => {});
        return;
      }

      const fieldEl = fieldRef.current;
      const fieldRect = fieldEl?.getBoundingClientRect();
      const shipPxX = fieldRect ? (myShipX / 100) * fieldRect.width : 0;
      const shipPxY = fieldRect ? (SHIP_Y / 100) * fieldRect.height : 0;

      const targetPoint = fieldRect
        ? getLetterPosition(targetWord, targetWord.typed, fieldRect)
        : { x: shipPxX, y: shipPxY - 140 };
      const dx = targetPoint.x - shipPxX;
      const dy = targetPoint.y - shipPxY;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      const distance = Math.max(24, Math.hypot(dx, dy));
      const duration = Math.max(
        SHOT_MIN_MS,
        Math.min(SHOT_MAX_MS, Math.round(distance * 0.62))
      );

      const shotId = `shot-${Date.now()}`;
      const newShot = {
        id: shotId,
        x: shipPxX,
        y: shipPxY,
        angle,
        distance,
        duration,
        letter: expected.toUpperCase(),
        targetX: targetPoint.x,
        targetY: targetPoint.y,
      };

      setShots((curr) => [...curr.slice(-8), newShot]);
      const exX = fieldRect
        ? (targetPoint.x / fieldRect.width) * 100
        : targetWord.x;
      const exY = fieldRect
        ? (targetPoint.y / fieldRect.height) * 100
        : targetWord.y;
      setExplosions((curr) => [
        ...curr.slice(-10),
        {
          id: shotId + "-boom",
          x: exX,
          y: exY,
          letter: expected.toUpperCase(),
        },
      ]);

      setHits((v) => v + 1);
      setCombo((v) => v + 1);

      const wordCompleted = targetWord.typed + 1 >= targetWord.word.length;
      setFallingWords((current) =>
        current.flatMap((word) => {
          if (word.id !== targetWord.id) return [word];
          const typed = word.typed + 1;
          if (typed >= word.word.length) {
            return [];
          }
          return [{ ...word, typed }];
        })
      );

      if (wordCompleted) {
        const nextWordsCompleted = setMyCompletedScore(
          myWordsCompletedRef.current + 1
        );

        const newSpeedBoost = Math.min(
          speedBoost * gameAccelerationMultiplier,
          2.5
        );
        setSpeedBoost(newSpeedBoost);

        if (nextWordsCompleted >= 150 && !matchWinner) {
          requestMatchFinish("win", buildMatchFinishScores("win"));
        }
      }

      api
        .syncPvpState({
          shipX: myShipX,
          hits: hits + 1,
          errors,
          lives: myLives,
          speedBoost: wordCompleted
            ? Math.min(speedBoost * gameAccelerationMultiplier, 2.5)
            : speedBoost,
          targetWordId: targetWord.id,
          targetWordTyped: targetWord.typed + 1,
          shot: newShot,
          wordsCompleted: wordCompleted
            ? myWordsCompletedRef.current
            : myWordsCompleted,
        })
        .catch(() => {});
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    gameState,
    targetWord,
    myShipX,
    hits,
    errors,
    myLives,
    speedBoost,
    myWordIndex,
    wordsArray,
    matchWinner,
    myWordsCompleted,
    opponentWordsCompleted,
    gameAccelerationMultiplier,
  ]);

  useEffect(() => {
    if (
      shots.length === 0 &&
      explosions.length === 0 &&
      opponentShots.length === 0 &&
      opponentExplosions.length === 0
    )
      return;
    const timeout = setTimeout(() => {
      setShots([]);
      setExplosions([]);
      setOpponentShots([]);
      setOpponentExplosions([]);
    }, 150);
    return () => clearTimeout(timeout);
  }, [explosions, shots, opponentExplosions, opponentShots]);

  const quitGame = async () => {
    await api.leavePvp().catch(() => {});
    setGameState("lobby");
  };

  const renderSideHud = (isMe) => {
    const playerIndex = isMe ? myIndex : myIndex === 0 ? 1 : 0;
    const isLeft = playerIndex === 0;
    const wpm = isMe ? myWpm : oppWpm;
    const acc = isMe ? myAccuracy : oppAccuracy;
    const lvls = isMe ? myLives : opponentLives;

    const wpmRatio = Math.min(1, Math.max(0, wpm / 60));
    const accRatio = Math.min(1, Math.max(0, acc / 100));
    const wpmColor = getGameRhythmColor(wpmRatio);
    const accColor = getGameRhythmColor(accRatio);

    return (
      <div
        style={{
          position: "absolute",
          bottom: "24px",
          [isLeft ? "left" : "right"]: "24px",
          display: "flex",
          flexDirection: "column",
          alignItems: isLeft ? "flex-start" : "flex-end",
          gap: "20px",
          zIndex: 8,
          pointerEvents: "none",
        }}
      >
        <div
          className="typingSpaceGauges"
          style={{
            gap: "16px",
            flexDirection: "column",
            alignItems: isLeft ? "flex-start" : "flex-end",
          }}
        >
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
            <div className="typingSpaceGaugeInner" style={{ color: wpmColor }}>
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
            <div className="typingSpaceGaugeInner" style={{ color: accColor }}>
              <span className="typingSpaceGaugeValue">{acc}</span>
              <span className="typingSpaceGaugeLabel">PRE</span>
            </div>
          </div>
        </div>
        <div className="typingSpaceLives">
          <div className="typingSpaceLivesDots">
            {Array.from({ length: MAX_LIVES }, (_, index) => (
              <span
                key={index}
                className={`typingSpaceLivesDot ${
                  index < lvls ? "active" : ""
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (gameTab === "games-pvp-scores") {
    return (
      <div className="max-w-4xl mx-auto mt-5 p-6 md:p-10 animate-fade-in pb-20">
        {rankingTab === "turma" && isProfessor && turmas.length > 0 && (
          <div className="mb-6 flex justify-end">
            <select
              value={selectedTurmaId}
              onChange={(event) => onSelectedTurmaChange(event.target.value)}
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
        <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
          <header className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#18181b]">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Histórico de Duelos
            </h2>
          </header>
          <div className="divide-y divide-transparent">
            {pvpScores.length === 0 ? (
              <div className="p-12 text-center text-gray-500 font-medium">
                Nenhum duelo registrado para esta turma.
              </div>
            ) : (
              pvpScores.map((match) => {
                const amIWinner = match.winner_id === user.id;
                const amILoser = match.loser_id === user.id;
                return (
                  <div
                    key={match.id}
                    className="flex flex-col px-6 py-5 transition-colors odd:bg-transparent even:bg-gray-50/50 dark:even:bg-[#1a1a1e]"
                  >
                    <div className="flex justify-center items-center gap-4 text-center">
                      <div className="flex-1 text-right flex items-center justify-end gap-2">
                        <span className="text-2xl" title="Vencedor">
                          👑
                        </span>
                        <span
                          className={`font-black text-2xl uppercase tracking-wider ${
                            amIWinner
                              ? "text-[#ffcc02] drop-shadow-md"
                              : "text-gray-900 dark:text-gray-100"
                          }`}
                        >
                          {match.winner_name || "Desconhecido"}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 px-5 py-2 bg-black/5 dark:bg-black/30 rounded-2xl shadow-inner border border-gray-200 dark:border-gray-800">
                        <span className="font-black text-2xl text-green-600 dark:text-green-400">
                          {match.winner_score || 0}
                        </span>
                        <span className="text-gray-400 font-bold text-sm">
                          X
                        </span>
                        <span className="font-black text-2xl text-red-500 dark:text-red-400">
                          {match.loser_score || 0}
                        </span>
                      </div>

                      <div className="flex-1 text-left flex items-center justify-start gap-2">
                        <span
                          className={`font-black text-2xl uppercase tracking-wider ${
                            amILoser
                              ? "text-gray-500 dark:text-gray-400"
                              : "text-gray-600 dark:text-gray-500"
                          }`}
                        >
                          {match.loser_name || "Desconhecido"}
                        </span>
                      </div>
                    </div>

                    <div className="text-center mt-4">
                      <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest bg-gray-100 dark:bg-gray-800/50 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700/50">
                        {new Date(match.created_at).toLocaleString("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  if (gameState === "lobby") {
    return (
      <div className="max-w-4xl mx-auto mt-5 p-6 md:p-10 animate-fade-in pb-20">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Arena PVP
            </h2>
          </div>
          <button
            onClick={toggleRandom}
            className={`px-6 py-2.5 rounded-lg font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm ${
              isWaitingRandom
                ? "bg-orange-500 hover:bg-orange-600"
                : "bg-purple-600 hover:bg-purple-700"
            }`}
          >
            {isWaitingRandom ? "Buscando..." : "Rodada aleatória"}
          </button>
        </div>

        <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="text-xs uppercase text-gray-400 bg-gray-50 dark:bg-[#18181b] border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3">Colega</th>
                <th className="px-6 py-3 w-32 text-center">Status</th>
                <th className="px-6 py-3 w-40 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
              {lobbyPlayers.length === 0 ? (
                <tr>
                  <td
                    colSpan="3"
                    className="p-12 text-center text-gray-500 font-medium"
                  >
                    Nenhum colega online no momento.
                  </td>
                </tr>
              ) : (
                lobbyPlayers.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-gray-50/50 dark:hover:bg-[#202024] transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center border border-gray-200 dark:border-gray-700">
                          <span className="font-bold text-gray-400 text-xs">
                            {p.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-bold text-gray-900 dark:text-gray-100">
                          {p.username}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        Online
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => challengePlayer(p.id, p.username)}
                        className="bg-[#ffcc02] hover:brightness-110 text-black px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm"
                      >
                        Desafiar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {challengeReceived && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-[#1c1c1f] w-[400px] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-bounce-in">
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-blue-500/20">
                  <Icon src="win/user" width={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  Desafio de Duelo!
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6 px-4">
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {challengeReceived.username}
                  </span>{" "}
                  está te desafiando para uma batalha de digitação.
                </p>
                <div className="flex gap-3 px-2">
                  <button
                    onClick={acceptChallenge}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Aceitar
                  </button>
                  <button
                    onClick={rejectChallenge}
                    className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                  >
                    Recusar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isChallenging && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-[#1c1c1f] w-[400px] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-bounce-in">
              <div className="p-8 text-center">
                <div className="relative w-20 h-20 mx-auto mb-6">
                  <div className="absolute inset-0 border-4 border-blue-600/20 rounded-full" />
                  <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center text-blue-600">
                    <Icon src="win/user" width={32} />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Aguardando oponente
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-8 px-4">
                  Desafio enviado para{" "}
                  <span className="font-bold">{challengeTargetName}</span>.
                  Aguarde enquanto o colega aceita o convite.
                </p>
                <button
                  onClick={() => setIsChallenging(false)}
                  className="text-gray-400 hover:text-red-500 font-bold text-sm transition-colors"
                >
                  Cancelar desafio
                </button>
              </div>
            </div>
          </div>
        )}

        {pvpNotification && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-[#1c1c1f] w-[380px] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-bounce-in">
              <div className="p-6 text-center">
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${
                    pvpNotification.type === "rejected"
                      ? "bg-orange-100 text-orange-600"
                      : pvpNotification.type === "disconnected"
                      ? "bg-red-100 text-red-600"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  <Icon
                    src={
                      pvpNotification.type === "rejected"
                        ? "win/info"
                        : "win/info"
                    }
                    width={28}
                  />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {pvpNotification.type === "rejected"
                    ? "Desafio Recusado"
                    : pvpNotification.type === "disconnected"
                    ? "Conexão Perdida"
                    : "Aviso"}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  {pvpNotification.type === "rejected"
                    ? "Seu desafio foi recusado pelo oponente no momento."
                    : pvpNotification.type === "disconnected"
                    ? "O oponente desconectou e a partida foi encerrada."
                    : pvpNotification.message}
                </p>
                <button
                  onClick={() => setPvpNotification(null)}
                  className="w-full bg-[#ffcc02] hover:brightness-110 text-black py-2.5 rounded-lg font-bold transition-all shadow-sm"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-5 flex flex-col items-center justify-center min-h-[calc(100vh-120px)] p-6">
      <div className="w-[900px] flex justify-end mb-4">
        <button
          onClick={quitGame}
          className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg font-bold transition-colors shadow-sm"
        >
          Desistir
        </button>
      </div>
      <div
        ref={arenaRef}
        className="typingSpaceArena"
        tabIndex={0}
        role="application"
      >
        <div
          className="typingSpaceBackdrop typingSpaceBackdrop--arena"
          aria-hidden="true"
        >
          <div className="typingSpaceBackdropStars" />
          <img
            src={orbitaBackground}
            alt=""
            className="typingSpaceBackdropLayer typingSpaceBackdropImage"
          />
        </div>
        <div className="typingSpaceField" ref={fieldRef}>
          {fallingWords.map((item) => (
            <div
              key={item.id}
              className={`typingSpaceWord ${
                targetWord?.id === item.id ? "isTarget" : ""
              } ${getTypingSpaceWordClassName(item.word)}`}
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                opacity: item.owner !== myIndex ? 0.6 : 1,
              }}
            >
              {item.word.split("").map((letter, index) => (
                <span
                  key={`${item.id}-${index}`}
                  className={[
                    index < item.typed ? "isDestroyed" : "",
                    index === item.typed && item.owner === myIndex
                      ? "isNext"
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

          {/* Opponent Ship */}
          <div
            className="typingSpaceShip"
            aria-hidden="true"
            style={{ left: `${opponentShipX}%`, opacity: 0.7 }}
          >
            <img
              src={shipSprite}
              alt=""
              className="typingSpaceShipSprite"
              style={{ filter: myIndex === 1 ? "hue-rotate(90deg)" : "none" }}
            />
            <span />
          </div>
          {/* My Ship */}
          <div
            className="typingSpaceShip"
            aria-hidden="true"
            style={{ left: `${myShipX}%` }}
          >
            <img
              src={shipSprite}
              alt=""
              className="typingSpaceShipSprite"
              style={{ filter: myIndex === 0 ? "hue-rotate(90deg)" : "none" }}
            />
            <span />
          </div>

          {/* Shots & Explosions */}
          {shots.concat(opponentShots).map((shot) => (
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
          ))}
          {explosions.concat(opponentExplosions).map((explosion) => (
            <span
              key={explosion.id}
              className="typingSpaceExplosion"
              style={{ left: `${explosion.x}%`, top: `${explosion.y}%` }}
            >
              {explosion.letter}
            </span>
          ))}

          {feedback && (
            <div className={`typingSpaceFeedback ${feedback.type}`}>
              {feedback.text}
            </div>
          )}

          {renderSideHud(true)}
          {renderSideHud(false)}

          {matchWinner && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-[100] backdrop-blur-sm animate-fade-in">
              <div
                className={`p-10 rounded-2xl shadow-2xl border text-center animate-bounce-in max-w-md w-full mx-4 ${
                  matchWinner === user.id
                    ? "bg-gradient-to-b from-green-900/40 to-[#18181b] border-green-500/30"
                    : "bg-gradient-to-b from-red-900/40 to-[#18181b] border-red-500/30"
                }`}
              >
                <div
                  className={`w-24 h-24 mx-auto mb-6 flex items-center justify-center rounded-full shadow-xl ${
                    matchWinner === user.id
                      ? "bg-green-500/20 text-green-400"
                      : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {matchWinner === user.id ? (
                    <svg
                      className="w-12 h-12"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-12 h-12"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  )}
                </div>

                <h2
                  className={`text-4xl font-black mb-2 tracking-tight ${
                    matchWinner === user.id ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {matchWinner === user.id ? "VITÓRIA!" : "DERROTA!"}
                </h2>

                <p className="text-gray-400 font-medium mb-6">
                  {matchWinner === user.id
                    ? "Você superou seu oponente na batalha."
                    : "Seu oponente foi mais rápido dessa vez."}
                </p>

                <div className="flex justify-center gap-6 mb-8 text-sm">
                  <div className="flex flex-col items-center">
                    <span className="text-gray-400 font-bold uppercase mb-1">
                      Seus Pontos
                    </span>
                    <span
                      className={`text-2xl font-black ${
                        matchWinner === user.id
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {myWordsCompleted}
                    </span>
                  </div>
                  <div className="w-px bg-gray-700/50"></div>
                  <div className="flex flex-col items-center">
                    <span className="text-gray-400 font-bold uppercase mb-1">
                      Oponente
                    </span>
                    <span
                      className={`text-2xl font-black ${
                        matchWinner !== user.id
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {opponentWordsCompleted}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {matchWinner !== user.id && (
                    <button
                      onClick={() => {
                        const opponent = players.find((p) => p.id !== user.id);
                        if (opponent) {
                          setGameState("lobby");
                          challengePlayer(opponent.id, opponent.username);
                        }
                      }}
                      className="w-full bg-[#ffcc02] hover:brightness-110 text-black py-3 rounded-xl font-bold transition-all shadow-sm"
                    >
                      Pedir Revanche
                    </button>
                  )}
                  <button
                    onClick={() => setGameState("lobby")}
                    className={`w-full py-3 rounded-xl font-bold transition-all ${
                      matchWinner === user.id
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    Voltar ao Lobby
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
