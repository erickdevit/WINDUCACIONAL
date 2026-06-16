import "./typing.scss";
import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { Icon } from "../../../../utils/general";
import { AppWindow } from "../../../../components/shared/AppWindow";
import { api } from "../../../../lib/api";
import { TYPING_LESSONS } from "../assets/typingLessons";
import {
  PASS_MIN_ACCURACY,
  PASS_MIN_WPM,
  useTypingGameSettings,
  useTypingSettings,
} from "../typingSettings";
import {
  areTypingCharactersEquivalent,
  normalizeTypingInputValue,
  resolveDeadKeyMarkFromEvent,
} from "../typingInput";
import { TypingRankingScrollArea } from "../TypingRankingScrollArea";
import { TypingSpaceGame } from "../TypingSpaceGame";
import { TypingPvpGame } from "../TypingPvpGame";
import SimulatedKeyboard from "./SimulatedKeyboard";

const COMBO_REWARDS = {
  8: "Aquecendo",
  16: "No ritmo",
  24: "Sequência limpa",
  32: "Turbo",
  40: "Modo foco",
};
const RESULT_PARTICLES = Array.from({ length: 18 }, (_, index) => index);
const FAILURE_SPARKS = Array.from({ length: 12 }, (_, index) => index);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getVariantStorageKey = (username) => `typingLessonVariants_${username}`;

const getLessonVariantIndex = (lesson, variantMap) => {
  const savedIndex = Number(variantMap?.[lesson.id] || 0);
  const limit = lesson.variants.length || 1;
  return ((savedIndex % limit) + limit) % limit;
};

const createLessonSession = (lesson, variantMap) => {
  const variantIndex = getLessonVariantIndex(lesson, variantMap);
  return {
    ...lesson,
    text: lesson.variants[variantIndex],
    variantIndex,
    variantCount: lesson.variants.length,
  };
};

const calculateLiveWpm = (typedValue, referenceText, elapsedTime) => {
  if (!typedValue || !referenceText || elapsedTime <= 0) return 0;
  const timeMins = Math.max(0.01, elapsedTime / 60000);
  let uncorrectedErrors = 0;
  for (let i = 0; i < typedValue.length; i++) {
    if (!areTypingCharactersEquivalent(typedValue[i], referenceText[i])) {
      uncorrectedErrors++;
    }
  }
  const grossWpm = typedValue.length / 5 / timeMins;
  return Math.max(0, Math.round(grossWpm - uncorrectedErrors / timeMins));
};

const calculateMomentum = ({
  accuracyValue,
  comboValue,
  progressValue,
  lessonLength,
  liveWpm,
  passMinWpm = PASS_MIN_WPM,
  passMinAccuracy = PASS_MIN_ACCURACY,
}) => {
  if (!lessonLength) return 0;
  const speedRatio = clamp(liveWpm / passMinWpm, 0, 1.35);
  const accuracyRatio = clamp(accuracyValue / passMinAccuracy, 0, 1.1);
  const comboRatio = clamp(comboValue / 24, 0, 1);
  const progressRatio = clamp(progressValue / lessonLength, 0, 1);

  return Math.round(
    clamp(
      speedRatio * 34 +
        accuracyRatio * 34 +
        comboRatio * 20 +
        progressRatio * 12,
      0,
      100
    )
  );
};

const getRhythmColor = (ratio) => {
  if (ratio >= 0.78) return "#22c55e";
  if (ratio >= 0.52) return "#ffcc02";
  return "#f97316";
};

export const TypingApp = () => {
  const wnapp = useSelector((state) => state.apps.typing || {});
  const user = useSelector((state) => state.setting.person);
  const isProfessor = user.role === "professor";
  const isStaff = user.role !== "aluno";

  const [view, setView] = useState("menu");
  const [currentLesson, setCurrentLesson] = useState(null);
  const [userInput, setUserInput] = useState("");
  const [startTime, setStartTime] = useState(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [totalErrors, setTotalErrors] = useState(0);
  const [totalKeystrokes, setTotalKeystrokes] = useState(0);
  const [finished, setFinished] = useState(false);
  const [passed, setPassed] = useState(false);
  const [ranking, setRanking] = useState({ global: [], turma: [] });
  const [rankingTab, setRankingTab] = useState("global");
  const [selectedTurmaId, setSelectedTurmaId] = useState(user?.turmaId || "");
  const [turmas, setTurmas] = useState([]);
  const [focusLost, setFocusLost] = useState(false);
  const [loadingRanking, setLoadingRanking] = useState(false);
  const [completedLessons, setCompletedLessons] = useState([]);
  const [lessonVariants, setLessonVariants] = useState({});
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [momentum, setMomentum] = useState(0);
  const [feedbackPulse, setFeedbackPulse] = useState(null);
  const [penaltyFlash, setPenaltyFlash] = useState(false);
  const [typedLetterColors, setTypedLetterColors] = useState({});
  const [selectedResetTurmaId, setSelectedResetTurmaId] = useState("");
  const [selectedGameResetTurmaId, setSelectedGameResetTurmaId] = useState("");
  const [resetRankingStatus, setResetRankingStatus] = useState(null);
  const [resetGameRankingStatus, setResetGameRankingStatus] = useState(null);
  const [resettingRanking, setResettingRanking] = useState(false);
  const [resettingGameRanking, setResettingGameRanking] = useState(false);
  const typingSettings = useTypingSettings({
    studentType: "normal",
    isProfessor: isStaff,
  });
  const typingGameSettings = useTypingGameSettings({
    studentType: "normal",
    isProfessor: isStaff,
  });
  const passMinWpm = typingSettings.settings.passMinWpm;
  const passMinAccuracy = typingSettings.settings.passMinAccuracy;
  const gamePassMinWpm = typingGameSettings.settings.passMinWpm;
  const gamePassMinAccuracy = typingGameSettings.settings.passMinAccuracy;
  const maxGameLives = typingGameSettings.settings.maxLives;
  const gameSpeed = typingGameSettings.settings.gameSpeed;
  const gameSpeedBoost = typingGameSettings.settings.gameSpeedBoost;

  const inputRef = useRef(null);
  const pendingDeadKeyRef = useRef("");
  const lastRoutePayloadRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem(
      `completedTypingLessons_${user.username}`
    );
    if (saved) {
      try {
        setCompletedLessons(JSON.parse(saved));
      } catch (e) {}
    }
  }, [user.username]);

  useEffect(() => {
    const saved = localStorage.getItem(getVariantStorageKey(user.username));
    if (saved) {
      try {
        setLessonVariants(JSON.parse(saved));
        return;
      } catch (e) {}
    }
    setLessonVariants({});
  }, [user.username]);

  useEffect(() => {
    if (view === "config" && !isProfessor) {
      setView("menu");
    }
  }, [isProfessor, view]);

  useEffect(() => {
    const payload = wnapp.payload;
    if (!payload || payload.kind !== "typing-pvp") return;
    const payloadKey =
      payload.challenge?.id || payload.challenge?.username || payload.view;
    if (lastRoutePayloadRef.current === payloadKey) return;
    lastRoutePayloadRef.current = payloadKey;
    if (payload.view === "games-pvp") {
      setView("games-pvp");
    }
  }, [wnapp.payload]);

  useEffect(() => {
    let interval;
    if (startTime && !finished) {
      interval = setInterval(() => {
        setElapsedMs(Date.now() - startTime);
      }, 30);
    }
    return () => clearInterval(interval);
  }, [startTime, finished]);

  const fetchTurmas = async () => {
    try {
      const data = await api.getTurmas("normal");
      setTurmas(data.turmas || []);
      if (!selectedTurmaId && data.turmas?.length > 0) {
        setSelectedTurmaId(data.turmas[0].id);
      }
      if (!selectedResetTurmaId && data.turmas?.length > 0) {
        setSelectedResetTurmaId(data.turmas[0].id);
      }
      if (!selectedGameResetTurmaId && data.turmas?.length > 0) {
        setSelectedGameResetTurmaId(data.turmas[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch turmas:", error);
    }
  };

  useEffect(() => {
    if (view === "lesson" && inputRef.current) {
      inputRef.current.focus();
    }
    if (view === "ranking") {
      fetchRanking();
    }
    if (
      (!isStaff && user.turmaId) ||
      isStaff
    ) {
      fetchTurmas();
    }
    if (view === "ranking" || view === "config" || view.startsWith("games")) {
      fetchTurmas();
    }
  }, [view, rankingTab, selectedTurmaId]);

  useEffect(() => {
    if (!feedbackPulse) return undefined;
    const timeoutId = setTimeout(() => setFeedbackPulse(null), 950);
    return () => clearTimeout(timeoutId);
  }, [feedbackPulse]);

  useEffect(() => {
    if (!penaltyFlash) return undefined;
    const timeoutId = setTimeout(() => setPenaltyFlash(false), 260);
    return () => clearTimeout(timeoutId);
  }, [penaltyFlash]);

  useEffect(() => {
    if (!currentLesson || finished || view !== "lesson") return;
    const liveWpm =
      startTime && elapsedMs > 0
        ? calculateLiveWpm(userInput, currentLesson.text, elapsedMs)
        : wpm;
    setMomentum(
      calculateMomentum({
        accuracyValue: accuracy,
        comboValue: combo,
        progressValue: userInput.length,
        lessonLength: currentLesson.text.length,
        liveWpm,
        passMinWpm,
        passMinAccuracy,
      })
    );
  }, [passMinWpm, passMinAccuracy]);

  const fetchRanking = async () => {
    setLoadingRanking(true);
    try {
      const globalData = await api.getTypingGlobalRanking("normal");
      let turmaData;

      if (rankingTab === "turma") {
        const turmaId = isStaff ? selectedTurmaId : user.turmaId;
        if ((user.role === "professor" || Boolean(user.turmaId)) && turmaId) {
          turmaData = await api.getTypingTurmaRankingById(turmaId, "normal");
        }
      }

      setRanking({
        global: globalData.ranking || [],
        turma: turmaData?.ranking || [],
      });
    } catch (error) {
      console.error("Failed to fetch ranking:", error);
    } finally {
      setLoadingRanking(false);
    }
  };

  const handleResetTurmaRanking = async (event) => {
    event.preventDefault();
    const selectedTurma = turmas.find(
      (turma) => turma.id === selectedResetTurmaId
    );
    if (!selectedTurma) {
      setResetRankingStatus({
        type: "error",
        text: "Selecione uma turma para zerar o ranking.",
      });
      return;
    }

    if (
      !confirm(
        `Zerar o ranking da turma ${selectedTurma.nome} (${selectedTurma.code})? Essa ação remove as pontuações registradas dessa turma.`
      )
    ) {
      return;
    }

    setResettingRanking(true);
    setResetRankingStatus(null);
    try {
      const result = await api.resetTypingTurmaRanking(
        selectedTurma.code,
        "normal"
      );
      setResetRankingStatus({
        type: "success",
        text: `Ranking da turma ${
          result.turma?.nome || selectedTurma.nome
        } zerado. ${result.deletedScores || 0} registros removidos.`,
      });
      fetchRanking();
    } catch (error) {
      setResetRankingStatus({
        type: "error",
        text: error.message || "Não foi possível zerar o ranking da turma.",
      });
    } finally {
      setResettingRanking(false);
    }
  };

  const handleResetGameTurmaRanking = async (event) => {
    event.preventDefault();
    const selectedTurma = turmas.find(
      (turma) => turma.id === selectedGameResetTurmaId
    );
    if (!selectedTurma) {
      setResetGameRankingStatus({
        type: "error",
        text: "Selecione uma turma para zerar o ranking do game.",
      });
      return;
    }

    if (
      !confirm(
        `Zerar o ranking do game da turma ${selectedTurma.nome} (${selectedTurma.code})? Essa ação remove as pontuações do game registradas dessa turma.`
      )
    ) {
      return;
    }

    setResettingGameRanking(true);
    setResetGameRankingStatus(null);
    try {
      const result = await api.resetTypingGameTurmaRanking(
        selectedTurma.code,
        "normal"
      );
      setResetGameRankingStatus({
        type: "success",
        text: `Ranking do game da turma ${
          result.turma?.nome || selectedTurma.nome
        } zerado. ${result.deletedScores || 0} registros removidos.`,
      });
    } catch (error) {
      setResetGameRankingStatus({
        type: "error",
        text:
          error.message || "Não foi possível zerar o ranking do game da turma.",
      });
    } finally {
      setResettingGameRanking(false);
    }
  };

  const persistLessonVariants = (nextVariants) => {
    localStorage.setItem(
      getVariantStorageKey(user.username),
      JSON.stringify(nextVariants)
    );
  };

  const updateLessonVariant = (lessonId, updater) => {
    setLessonVariants((prev) => {
      const lesson = TYPING_LESSONS.find((item) => item.id === lessonId);
      if (!lesson) return prev;

      const currentIndex = getLessonVariantIndex(lesson, prev);
      const nextIndex = updater(currentIndex, lesson.variants.length);
      const next = { ...prev, [lessonId]: nextIndex };
      persistLessonVariants(next);
      return next;
    });
  };

  const launchLesson = (lesson) => {
    const activeLesson = createLessonSession(lesson, lessonVariants);
    pendingDeadKeyRef.current = "";
    setCurrentLesson(activeLesson);
    setUserInput("");
    setStartTime(null);
    setElapsedMs(0);
    setWpm(0);
    setAccuracy(100);
    setTotalErrors(0);
    setTotalKeystrokes(0);
    setFinished(false);
    setPassed(false);
    setFocusLost(false);
    setCombo(0);
    setBestCombo(0);
    setMomentum(0);
    setFeedbackPulse(null);
    setPenaltyFlash(false);
    setTypedLetterColors({});
    setView("lesson");
  };

  const showPulse = (type, message, comboValue = null) => {
    setFeedbackPulse({
      id: `${type}-${Date.now()}`,
      type,
      message,
      combo: comboValue,
    });
  };

  const handleFocus = () => {
    setFocusLost(false);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleBlur = () => {
    if (!finished && view === "lesson") setFocusLost(true);
  };

  const registerDeadKeyMark = (event) => {
    const mark = resolveDeadKeyMarkFromEvent(event);
    if (!mark) return;
    pendingDeadKeyRef.current = mark;
  };

  const handleInputChange = (e) => {
    if (finished || view !== "lesson") return;

    const normalizedInput = normalizeTypingInputValue({
      nextValue: e.target.value,
      previousValue: userInput,
      pendingMark: pendingDeadKeyRef.current,
      referenceText: currentLesson.text,
    });
    pendingDeadKeyRef.current = normalizedInput.pendingMark;
    if (normalizedInput.ignored) {
      e.target.value = userInput;
      return;
    }

    const val = normalizedInput.value;
    const effectiveStartTime =
      startTime || (val.length > 0 ? Date.now() : null);

    if (!startTime && effectiveStartTime) {
      setStartTime(effectiveStartTime);
    }

    if (val.length <= currentLesson.text.length) {
      let newErrors = totalErrors;
      let newKeystrokes = totalKeystrokes;
      let nextCombo = combo;
      let highestCombo = bestCombo;
      let mistakeAdded = false;
      let comboReward = null;
      const correctAddedIndexes = [];

      if (val.length > userInput.length) {
        const addedChars = val.slice(userInput.length);
        let errorsAdded = 0;
        for (let i = 0; i < addedChars.length; i++) {
          const charIndex = userInput.length + i;
          if (
            !areTypingCharactersEquivalent(
              addedChars[i],
              currentLesson.text[charIndex]
            )
          ) {
            errorsAdded++;
            mistakeAdded = true;
            nextCombo = 0;
          } else {
            correctAddedIndexes.push(charIndex);
            nextCombo += 1;
            highestCombo = Math.max(highestCombo, nextCombo);
            if (COMBO_REWARDS[nextCombo]) {
              comboReward = COMBO_REWARDS[nextCombo];
            }
          }
        }
        newKeystrokes += addedChars.length;
        newErrors += errorsAdded;
        setTotalKeystrokes(newKeystrokes);
        setTotalErrors(newErrors);
      }

      setUserInput(val);

      const acc =
        newKeystrokes === 0
          ? 100
          : Math.max(
              0,
              Math.floor(((newKeystrokes - newErrors) / newKeystrokes) * 100)
            );
      setAccuracy(acc);
      setCombo(nextCombo);
      setBestCombo(highestCombo);

      const liveElapsedMs = effectiveStartTime
        ? Date.now() - effectiveStartTime
        : 0;
      const liveWpm = calculateLiveWpm(val, currentLesson.text, liveElapsedMs);
      const nextMomentum = calculateMomentum({
        accuracyValue: acc,
        comboValue: nextCombo,
        progressValue: val.length,
        lessonLength: currentLesson.text.length,
        liveWpm,
        passMinWpm,
        passMinAccuracy,
      });
      setMomentum(nextMomentum);
      setTypedLetterColors((prev) => {
        const next = {};
        Object.entries(prev).forEach(([index, color]) => {
          if (Number(index) < val.length) next[index] = color;
        });
        const typedColor = getRhythmColor(clamp(nextMomentum / 100, 0, 1));
        correctAddedIndexes.forEach((index) => {
          next[index] = typedColor;
        });
        return next;
      });

      if (mistakeAdded) {
        setPenaltyFlash(true);
        showPulse(
          "warning",
          nextCombo === 0 ? "Erro detectado" : "Combo quebrado",
          highestCombo
        );
      } else if (comboReward) {
        showPulse("reward", comboReward, nextCombo);
      }

      if (val.length === currentLesson.text.length) {
        finishLesson(
          val,
          newKeystrokes,
          newErrors,
          acc,
          highestCombo,
          effectiveStartTime
        );
      }
    }
  };

  const finishLesson = (
    finalVal,
    finalKeystrokes,
    finalErrors,
    finalAcc,
    finalBestCombo,
    effectiveStartTime
  ) => {
    setFinished(true);
    const finalMs = effectiveStartTime ? Date.now() - effectiveStartTime : 0;
    setElapsedMs(finalMs);

    const timeElapsedMins = Math.max(0.01, finalMs / 60000);
    let uncorrectedErrors = 0;
    for (let i = 0; i < finalVal.length; i++) {
      if (!areTypingCharactersEquivalent(finalVal[i], currentLesson.text[i])) {
        uncorrectedErrors++;
      }
    }

    const grossWpm = finalVal.length / 5 / timeElapsedMins;
    const netWpm = Math.max(
      0,
      Math.round(grossWpm - uncorrectedErrors / timeElapsedMins)
    );

    setWpm(netWpm);
    setAccuracy(finalAcc);
    setBestCombo(Math.max(bestCombo, finalBestCombo || 0));

    const isPass = netWpm >= passMinWpm && finalAcc >= passMinAccuracy;
    setPassed(isPass);
    saveScore(netWpm, finalAcc, finalMs);
    setMomentum(
      calculateMomentum({
        accuracyValue: finalAcc,
        comboValue: finalBestCombo || bestCombo,
        progressValue: finalVal.length,
        lessonLength: currentLesson.text.length,
        liveWpm: netWpm,
        passMinWpm,
        passMinAccuracy,
      })
    );

    if (isPass) {
      setCompletedLessons((prev) => {
        if (!prev.includes(currentLesson.id)) {
          const next = [...prev, currentLesson.id];
          localStorage.setItem(
            `completedTypingLessons_${user.username}`,
            JSON.stringify(next)
          );
          return next;
        }
        return prev;
      });
      updateLessonVariant(currentLesson.id, () => 0);
      showPulse("reward", "Fase aprovada", finalBestCombo || bestCombo);
    } else {
      updateLessonVariant(
        currentLesson.id,
        (currentIndex, variantCount) => (currentIndex + 1) % variantCount
      );
      showPulse(
        "warning",
        "Nova variação liberada",
        finalBestCombo || bestCombo
      );
    }
  };

  const saveScore = async (finalWpm, finalAcc, finalMs) => {
    if (isStaff) return;
    try {
      await api.saveTypingScore({
        lessonId: currentLesson.id,
        wpm: finalWpm,
        accuracy: finalAcc,
        timeMs: finalMs,
      });
    } catch (error) {
      console.error("Failed to save score:", error);
    }
  };

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);

    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, "0")}.${milliseconds
        .toString()
        .padStart(2, "0")}`;
    }
    return `${seconds}.${milliseconds.toString().padStart(2, "0")}s`;
  };

  const displayWpm =
    startTime && !finished && elapsedMs > 0
      ? calculateLiveWpm(userInput, currentLesson.text, elapsedMs)
      : wpm;

  const renderText = () => {
    if (!currentLesson) return null;

    const chars = currentLesson.text.split("");
    const performanceRatio = clamp(momentum / 100, 0, 1);

    return chars.map((char, i) => {
      let className =
        "relative inline-block transition-[color,transform,filter] duration-150 ";
      let style = undefined;
      const typedChar = userInput[i];
      const isCurrent = i === userInput.length;
      const isLastTyped = i === userInput.length - 1;
      const storedColor = typedLetterColors[i];
      const isTypedCorrect =
        typedChar != null && areTypingCharactersEquivalent(typedChar, char);
      const isTypedWrong = typedChar != null && !isTypedCorrect;

      if (isTypedWrong) {
        style = {
          color: "#ef4444",
          opacity: 1,
          filter: "drop-shadow(0 0 10px rgba(239, 68, 68, 0.24))",
        };
        className += "typingErrorTrail";
        if (char === " ") {
          className += " bg-red-500/20 px-[2px] rounded-sm";
        }
      } else if (isCurrent && !finished) {
        style = {
          color: getRhythmColor(performanceRatio),
          opacity: 0.95,
          filter: "drop-shadow(0 0 12px rgba(255, 204, 2, 0.22))",
        };
        className += "typingPromptGlow";
      } else if (isTypedCorrect && storedColor) {
        style = {
          color: storedColor,
          opacity: 0.95,
          filter: "drop-shadow(0 0 8px rgba(255, 204, 2, 0.14))",
        };
        className += "typingPromptGlow";
      } else if (isTypedCorrect) {
        className += "text-gray-900 dark:text-white";
      } else if (typedChar == null) {
        className += "text-gray-300 dark:text-gray-600";
      } else {
        className += "text-gray-400 dark:text-gray-500";
      }

      if (isLastTyped && !finished) {
        className += " typingLastTyped";
      }

      return (
        <React.Fragment key={i}>
          {isCurrent && !finished && !focusLost && (
            <span className="typingTextCursor" aria-hidden="true" />
          )}
          <span className={className} style={style}>
            {char === " " ? "\u00A0" : char}
          </span>
        </React.Fragment>
      );
    });
  };

  const currentLessonIndex = currentLesson
    ? TYPING_LESSONS.findIndex((lesson) => lesson.id === currentLesson.id)
    : -1;
  const nextLesson =
    currentLessonIndex >= 0 ? TYPING_LESSONS[currentLessonIndex + 1] : null;
  const wpmGap = Math.max(0, passMinWpm - wpm);
  const accuracyGap = Math.max(0, passMinAccuracy - accuracy);
  const nextVariantLabel = currentLesson
    ? `${(getLessonVariantIndex(currentLesson, lessonVariants) || 0) + 1}/${
        currentLesson.variantCount
      }`
    : "1/1";
  const handleResultPrimaryAction = () => {
    if (passed) {
      if (nextLesson) {
        launchLesson(nextLesson);
      } else {
        setView("menu");
      }
      return;
    }
    launchLesson(currentLesson);
  };

  if (!wnapp || typeof wnapp.hide === "undefined") return null;

  return (
    <AppWindow
      wnapp={wnapp}
      app="TYPINGAPP"
      icon={wnapp.icon}
      name="Digitação"
      className="typingApp flex flex-col font-sans"
      toolbarProps={{}}
      rootProps={{}}
      windowScreenClassName="flex flex-col bg-white dark:bg-[#121212] transition-colors h-full"
      restWindowClassName="flex-grow overflow-y-auto relative typingLessonsScroll"
      screenTop={
        <div className="flex items-center justify-between px-8 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#18181b] z-10">
          <div className="flex space-x-2">
            <button
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
                view === "menu"
                  ? "bg-[#ffcc02] text-black"
                  : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700"
              }`}
              onClick={() => setView("menu")}
            >
              Lições
            </button>
            <button
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
                view === "ranking"
                  ? "bg-[#ffcc02] text-black"
                  : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700"
              }`}
              onClick={() => setView("ranking")}
            >
              Ranking
            </button>
            <button
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
                view.startsWith("games")
                  ? "bg-[#ffcc02] text-black"
                  : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700"
              }`}
              onClick={() => setView("games-solo")}
            >
              Games
            </button>
            {view.startsWith("games") && (
              <div className="flex items-center space-x-2 ml-1 pl-3 border-l border-gray-300 dark:border-gray-700">
                <button
                  className={`px-3 py-1.5 text-xs font-bold rounded-md tracking-wider transition-colors ${
                    view === "games-solo"
                      ? "bg-[#ffcc02] text-black"
                      : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setView("games-solo")}
                >
                  Solo
                </button>
                <button
                  className={`px-3 py-1.5 text-xs font-bold rounded-md tracking-wider transition-colors ${
                    view === "games-pvp"
                      ? "bg-[#ffcc02] text-black"
                      : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setView("games-pvp")}
                >
                  Duelos
                </button>
                <button
                  className={`px-3 py-1.5 text-xs font-bold rounded-md tracking-wider transition-colors ${
                    view === "games-pvp-scores"
                      ? "bg-[#ffcc02] text-black"
                      : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setView("games-pvp-scores")}
                >
                  Placar de Duelos
                </button>
                <button
                  className={`px-3 py-1.5 text-xs font-bold rounded-md tracking-wider transition-colors ${
                    view === "games-scores"
                      ? "bg-[#ffcc02] text-black"
                      : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setView("games-scores")}
                >
                  Ranking do Game
                </button>
              </div>
            )}
            {isProfessor && (
              <button
                className={`ml-2 px-3 py-2 text-sm font-bold rounded-lg transition-colors flex items-center justify-center ${
                  view === "config"
                    ? "bg-[#ffcc02] text-black"
                    : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700"
                }`}
                onClick={() => setView("config")}
                title="Configurações"
                aria-label="Configurações"
              >
                <Icon fafa="faCog" width={14} />
              </button>
            )}
          </div>

          {(view === "ranking" ||
            view === "games-scores" ||
            view === "games-pvp-scores") && (
            <div className="absolute left-1/2 -translate-x-1/2 flex bg-gray-900 dark:bg-black rounded-lg p-1">
              <button
                className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${
                  rankingTab === "global"
                    ? "bg-[#ffcc02] text-black"
                    : "bg-transparent text-white hover:bg-white/10"
                }`}
                onClick={() => setRankingTab("global")}
              >
                Global
              </button>
              {(user.role === "professor" || Boolean(user.turmaId)) && (
              <button
                className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${
                  rankingTab === "turma"
                    ? "bg-[#ffcc02] text-black"
                    : "bg-transparent text-white hover:bg-white/10"
                }`}
                onClick={() => setRankingTab("turma")}
              >
                Por Turma
              </button>
            )}
            </div>
          )}

          <div className="flex items-center space-x-4">
            {isProfessor && (
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#ffcc02] border border-[#ffcc02] px-2 py-1 rounded-full">
                Professor
              </span>
            )}
            <div className="text-sm font-semibold text-gray-600 dark:text-gray-400">
              {user.username}
            </div>
          </div>
        </div>
      }
    >
      <div onClick={handleFocus}>
        {view === "menu" && (
          <div className="max-w-6xl mx-auto p-10 animate-fade-in pb-20">
            <div className="mb-8 border-b border-gray-200 dark:border-gray-800 pb-6 flex flex-col md:flex-row md:items-end justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                  Cursos de Digitação
                </h1>
                <p className="text-gray-500 text-sm mt-2 font-medium">
                  Meta para aprovação: Mínimo de{" "}
                  <span className="font-bold text-gray-700 dark:text-gray-300">
                    {passMinWpm} PPM
                  </span>{" "}
                  e{" "}
                  <span className="font-bold text-gray-700 dark:text-gray-300">
                    {passMinAccuracy}%
                  </span>{" "}
                  de Precisão.
                </p>
              </div>
              <div className="mt-4 md:mt-0 text-sm font-bold text-green-600 dark:text-green-500 bg-green-50 dark:bg-green-900/10 px-3 py-1.5 rounded-lg border border-green-200 dark:border-green-800/50">
                {completedLessons.length} / {TYPING_LESSONS.length} Concluídas
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {TYPING_LESSONS.map((lesson, i) => {
                const isCompleted = completedLessons.includes(lesson.id);
                const isLocked =
                  i !== 0 &&
                  !completedLessons.includes(TYPING_LESSONS[i - 1].id) &&
                  !isStaff;
                const activeVariantIndex = getLessonVariantIndex(
                  lesson,
                  lessonVariants
                );
                const previewText = lesson.variants[activeVariantIndex];

                return (
                  <div
                    key={lesson.id}
                    className={`relative p-5 rounded-xl border-2 transition-colors ${
                      isLocked
                        ? "bg-gray-50 dark:bg-[#151515] border-gray-100 dark:border-gray-900 opacity-60 cursor-not-allowed"
                        : isCompleted
                        ? "bg-green-50 dark:bg-green-900/10 border-green-500 hover:bg-green-100 dark:hover:bg-green-900/20 cursor-pointer"
                        : "bg-white dark:bg-[#18181b] border-gray-200 dark:border-gray-800 hover:border-[#ffcc02] dark:hover:border-[#ffcc02] cursor-pointer"
                    }`}
                    onClick={() => {
                      if (!isLocked) launchLesson(lesson);
                    }}
                  >
                    <div className="flex flex-col h-full justify-between relative z-10">
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center">
                            Lição {i + 1}
                            {isLocked && (
                              <Icon
                                fafa="lock"
                                width={10}
                                className="ml-2 text-gray-400"
                              />
                            )}
                          </span>
                          {isCompleted && (
                            <span className="bg-green-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded flex items-center">
                              <Icon fafa="check" width={10} className="mr-1" />
                              Concluída
                            </span>
                          )}
                        </div>
                        <h3
                          className={`font-bold text-lg mb-2 ${
                            isCompleted
                              ? "text-green-700 dark:text-green-400"
                              : isLocked
                              ? "text-gray-500 dark:text-gray-600"
                              : "text-gray-800 dark:text-gray-200"
                          }`}
                        >
                          {lesson.title}
                        </h3>
                        <div className="flex items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                          <span>8 variações</span>
                          <span>Ativa {activeVariantIndex + 1}/8</span>
                        </div>
                      </div>

                      <div
                        className={`mt-4 text-sm font-mono truncate p-2 rounded ${
                          isCompleted
                            ? "bg-green-100/50 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                            : isLocked
                            ? "bg-gray-200/50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-600"
                            : "bg-gray-100 dark:bg-[#202024] text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {previewText}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view.startsWith("games") &&
          view !== "games-pvp" &&
          view !== "games-pvp-scores" && (
            <TypingSpaceGame
              user={user}
              maxLives={maxGameLives}
              passMinWpm={gamePassMinWpm}
              passMinAccuracy={gamePassMinAccuracy}
              gameSpeed={gameSpeed}
              gameSpeedBoost={gameSpeedBoost}
              isProfessor={isStaff}
              turmaId={user?.turmaId}
              turmas={turmas}
              gameTab={view}
              rankingTab={rankingTab}
            />
          )}

        {(view === "games-pvp" || view === "games-pvp-scores") && (
          <TypingPvpGame
            user={user}
            gameTab={view}
            rankingTab={rankingTab}
            isProfessor={isStaff}
            turmas={turmas}
            selectedTurmaId={selectedTurmaId}
            onSelectedTurmaChange={setSelectedTurmaId}
            gameSpeed={gameSpeed}
            gameSpeedBoost={gameSpeedBoost}
            pendingChallenge={wnapp.payload?.challenge}
          />
        )}

        {view === "lesson" && currentLesson && (
          <div
            className={`absolute inset-0 flex flex-col p-2 md:p-4 overflow-hidden bg-white dark:bg-[#121212] transition-[transform,box-shadow] duration-200 ${
              penaltyFlash
                ? "typingPenaltyShake shadow-[inset_0_0_0_2px_rgba(239,68,68,0.35)]"
                : ""
            }`}
          >
            <input
              type="text"
              ref={inputRef}
              className="opacity-0 absolute w-[1px] h-[1px] -z-10"
              onBlur={handleBlur}
              onBeforeInput={registerDeadKeyMark}
              onKeyDown={registerDeadKeyMark}
              onChange={handleInputChange}
              value={userInput}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              autoFocus
            />

            <div className="w-full max-w-6xl mx-auto border-b border-gray-100 dark:border-gray-800 pb-4">
              <div className="flex justify-between items-center">
                <div className="text-left w-[250px]">
                  <div className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                    Lição em andamento
                  </div>
                  <div className="text-gray-900 dark:text-white font-bold text-lg flex items-center gap-3">
                    {currentLesson.title}
                    <span className="text-xs font-black text-[#ffcc02] bg-amber-100/20 border border-amber-500/30 px-2 py-0.5 rounded whitespace-nowrap">
                      Var {currentLesson.variantIndex + 1}/{currentLesson.variantCount}
                    </span>
                  </div>
                </div>

                <div className="text-center flex justify-center gap-4 flex-grow">
                  <div className="flex gap-4 md:gap-6 items-center">
                    <div className="flex flex-col items-center">
                      <span className="text-lg md:text-xl font-bold text-blue-600 dark:text-blue-400 font-mono leading-none">{formatTime(elapsedMs)}</span>
                      <span className="text-[9px] md:text-[10px] uppercase font-bold text-gray-400 mt-1">Tempo</span>
                    </div>
                    <div className="w-px h-6 bg-gray-200 dark:bg-gray-800"></div>
                    <div className="flex flex-col items-center">
                      <span className={`text-lg md:text-xl font-bold font-mono leading-none ${displayWpm >= passMinWpm ? "text-orange-600 dark:text-orange-400" : "text-red-500 dark:text-red-400"}`}>{displayWpm}</span>
                      <span className="text-[9px] md:text-[10px] uppercase font-bold text-gray-400 mt-1">PPM</span>
                    </div>
                    <div className="w-px h-6 bg-gray-200 dark:bg-gray-800"></div>
                    <div className="flex flex-col items-center">
                      <span className={`text-lg md:text-xl font-bold font-mono leading-none ${accuracy >= passMinAccuracy ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>{accuracy}%</span>
                      <span className="text-[9px] md:text-[10px] uppercase font-bold text-gray-400 mt-1">Precisão</span>
                    </div>
                    <div className="w-px h-6 bg-gray-200 dark:bg-gray-800 hidden sm:block"></div>
                    <div className="flex flex-col items-center hidden sm:flex">
                      <span className="text-lg md:text-xl font-bold text-purple-600 dark:text-purple-400 font-mono leading-none">{userInput.length}<span className="text-sm opacity-50">/{currentLesson.text.length}</span></span>
                      <span className="text-[9px] md:text-[10px] uppercase font-bold text-gray-400 mt-1">Progresso</span>
                    </div>
                  </div>
                </div>

                <div className="w-[250px] flex justify-end">
                  {isStaff && (
                    <span className="text-[10px] text-purple-500 font-bold uppercase border border-purple-500/30 px-2 py-1 rounded">
                      {isProfessor ? "Modo Professor" : "Modo Equipe"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col items-center justify-center w-full max-w-5xl mx-auto px-4 relative">
              <div className="h-8 md:h-12 flex items-end justify-center pointer-events-none">
                {feedbackPulse && !finished && (
                  <div key={feedbackPulse.id} className="typingFeedbackPop">
                    <div
                      className={`rounded-[1.8rem] px-8 py-5 text-center shadow-[0_24px_70px_rgba(17,24,39,0.28)] ${
                        feedbackPulse.type === "reward"
                          ? "bg-[#ffcc02] text-black"
                          : "bg-red-500 text-white"
                      }`}
                    >
                      <div className="text-sm font-black uppercase tracking-[0.28em]">
                        {feedbackPulse.message}
                      </div>
                      {feedbackPulse.type === "reward" &&
                      feedbackPulse.combo ? (
                        <div className="mt-2 text-4xl font-black leading-none">
                          x{feedbackPulse.combo}
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>

              {focusLost && !finished && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 dark:bg-[#121212]/80 cursor-pointer">
                  <div className="bg-gray-100 dark:bg-gray-800 px-6 py-3 rounded-full text-gray-600 dark:text-gray-300 font-bold flex items-center shadow-sm">
                    <Icon fafa="mouse-pointer" width={14} className="mr-3" />
                    Clique aqui para continuar a lição
                  </div>
                </div>
              )}

              <div
                className={`w-full text-center flex-1 min-h-0 flex flex-col justify-center transition-all duration-300 ${
                  focusLost && !finished ? "blur-sm opacity-50" : ""
                }`}
              >
                <div className="inline-block rounded-[2rem] px-4 py-4 md:px-6 md:py-6 border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-white via-white to-amber-50/50 dark:from-[#151515] dark:via-[#151515] dark:to-[#241d05] shadow-[0_18px_60px_rgba(17,24,39,0.08)] overflow-y-auto">
                  <div className="text-[1.8rem] md:text-[2.2rem] lg:text-[2.6rem] leading-[1.4] font-mono tracking-tight whitespace-pre-wrap select-none inline-block text-center">
                    {renderText()}
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`w-full max-w-5xl mx-auto flex-shrink-0 transition-all duration-500 ${
                finished
                  ? "opacity-0 translate-y-4 pointer-events-none absolute"
                  : "opacity-100 translate-y-0"
              }`}
            >
              <div className="pb-2 pt-2">
                <SimulatedKeyboard expectedKey={currentLesson.text[userInput.length] || null} />
              </div>
            </div>

            {finished && (
              <div
                className={`typingResultOverlay absolute inset-0 z-30 flex items-center justify-center p-4 ${
                  passed ? "isPass" : "isFail"
                }`}
              >
                <div
                  className={`typingResultCard relative max-w-md w-full overflow-hidden rounded-2xl border p-8 text-center ${
                    passed ? "isPass" : "isFail"
                  }`}
                >
                  <div
                    className={`typingResultIcon flex h-16 w-16 items-center justify-center rounded-full mx-auto mb-5 ${
                      passed ? "isPass" : "isFail"
                    }`}
                  >
                    <Icon fafa={passed ? "check" : "times"} width={28} />
                  </div>

                  <h3 className="text-2xl font-black text-gray-950 dark:text-white mb-2">
                    {passed ? "Lição Concluída!" : "Meta Não Atingida"}
                  </h3>

                  <div className="typingLessonResultStats">
                    <div className="typingLessonResultStat">
                      <span className="typingLessonResultStatLabel">
                        Velocidade
                      </span>
                      <div
                        className={`typingLessonResultStatValue ${
                          passed ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {wpm} <small>PPM</small>
                      </div>
                      {!passed && wpmGap > 0 && (
                        <div className="typingLessonResultStatGap">
                          Faltam {wpmGap} PPM
                        </div>
                      )}
                    </div>
                    <div className="typingLessonResultStat">
                      <span className="typingLessonResultStatLabel">
                        Precisão
                      </span>
                      <div
                        className={`typingLessonResultStatValue ${
                          passed ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {accuracy}% <small>%</small>
                      </div>
                      {!passed && accuracyGap > 0 && (
                        <div className="typingLessonResultStatGap">
                          Faltam {accuracyGap}%
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    className={`w-full py-3 font-black rounded-lg transition-all ${
                      passed
                        ? "bg-green-500 text-white hover:bg-green-600"
                        : "bg-[#ffcc02] text-black hover:brightness-110"
                    }`}
                    onClick={handleResultPrimaryAction}
                  >
                    {passed
                      ? nextLesson
                        ? "Próxima Lição"
                        : "Concluir"
                      : "Tentar Novamente"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {view === "config" && isProfessor && (
          <div className="max-w-4xl mx-auto p-6 md:p-10 animate-fade-in pb-20">
            <div className="mb-8 border-b border-gray-200 dark:border-gray-800 pb-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                Configurações de Digitação
              </h1>
              <p className="text-gray-500 text-sm mt-2 font-medium">
                Ajustes disponíveis somente para professor.
              </p>
            </div>

            <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Configurações das lições
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-5">
                Metas usadas somente nas lições tradicionais.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    PPM mínimo
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Velocidade mínima exigida para aprovar uma lição.
                  </p>
                  <div className="mt-4 flex items-center gap-4">
                    <input
                      type="range"
                      min="10"
                      max="120"
                      value={typingSettings.draftSettings.passMinWpm}
                      onChange={(event) =>
                        typingSettings.updateDraftSettings(
                          "passMinWpm",
                          event.target.value
                        )
                      }
                      className="w-full"
                    />
                    <input
                      type="number"
                      min="10"
                      max="120"
                      value={typingSettings.draftSettings.passMinWpm}
                      onChange={(event) =>
                        typingSettings.updateDraftSettings(
                          "passMinWpm",
                          event.target.value
                        )
                      }
                      className="w-20 rounded-lg border border-gray-300 bg-white px-3 py-2 text-center font-mono font-black text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Precisão mínima
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Percentual mínimo de acertos exigido para aprovar uma lição.
                  </p>
                  <div className="mt-4 flex items-center gap-4">
                    <input
                      type="range"
                      min="50"
                      max="100"
                      value={typingSettings.draftSettings.passMinAccuracy}
                      onChange={(event) =>
                        typingSettings.updateDraftSettings(
                          "passMinAccuracy",
                          event.target.value
                        )
                      }
                      className="w-full"
                    />
                    <div className="flex items-center rounded-lg border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900">
                      <input
                        type="number"
                        min="50"
                        max="100"
                        value={typingSettings.draftSettings.passMinAccuracy}
                        onChange={(event) =>
                          typingSettings.updateDraftSettings(
                            "passMinAccuracy",
                            event.target.value
                          )
                        }
                        className="w-20 rounded-l-lg bg-transparent px-3 py-2 text-center font-mono font-black text-gray-900 dark:text-white"
                      />
                      <span className="pr-3 font-black text-gray-500">%</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
                  {typingSettings.loading
                    ? "Carregando configuração salva..."
                    : `Meta ativa das lições: ${passMinWpm} PPM e ${passMinAccuracy}% de precisão.`}
                </p>
                <button
                  type="button"
                  disabled={typingSettings.saving || !typingSettings.dirty}
                  onClick={typingSettings.saveDraftSettings}
                  className="px-5 py-3 rounded-lg bg-[#ffcc02] text-black font-black hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {typingSettings.saving
                    ? "Salvando..."
                    : "Salvar configurações"}
                </button>
              </div>
              {typingSettings.status && (
                <div
                  className={`mt-4 rounded-lg px-4 py-3 text-sm font-bold ${
                    typingSettings.status.type === "success"
                      ? "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800"
                      : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
                  }`}
                >
                  {typingSettings.status.text}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Configurações do game
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-5">
                Metas e vidas usadas somente no game Defesa Orbital.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    PPM mínimo
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Velocidade mínima para entrar no ranking do game.
                  </p>
                  <div className="mt-4 flex items-center gap-4">
                    <input
                      type="range"
                      min="10"
                      max="120"
                      value={typingGameSettings.draftSettings.passMinWpm}
                      onChange={(event) =>
                        typingGameSettings.updateDraftSettings(
                          "passMinWpm",
                          event.target.value
                        )
                      }
                      className="w-full"
                    />
                    <input
                      type="number"
                      min="10"
                      max="120"
                      value={typingGameSettings.draftSettings.passMinWpm}
                      onChange={(event) =>
                        typingGameSettings.updateDraftSettings(
                          "passMinWpm",
                          event.target.value
                        )
                      }
                      className="w-20 rounded-lg border border-gray-300 bg-white px-3 py-2 text-center font-mono font-black text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Precisão mínima
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Percentual mínimo para entrar no ranking do game.
                  </p>
                  <div className="mt-4 flex items-center gap-4">
                    <input
                      type="range"
                      min="50"
                      max="100"
                      value={typingGameSettings.draftSettings.passMinAccuracy}
                      onChange={(event) =>
                        typingGameSettings.updateDraftSettings(
                          "passMinAccuracy",
                          event.target.value
                        )
                      }
                      className="w-full"
                    />
                    <div className="flex items-center rounded-lg border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900">
                      <input
                        type="number"
                        min="50"
                        max="100"
                        value={typingGameSettings.draftSettings.passMinAccuracy}
                        onChange={(event) =>
                          typingGameSettings.updateDraftSettings(
                            "passMinAccuracy",
                            event.target.value
                          )
                        }
                        className="w-20 rounded-l-lg bg-transparent px-3 py-2 text-center font-mono font-black text-gray-900 dark:text-white"
                      />
                      <span className="pr-3 font-black text-gray-500">%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Vidas
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Quantidade de erros permitidos no game.
                  </p>
                  <div className="mt-4 flex items-center gap-4">
                    <input
                      type="range"
                      min="3"
                      max="10"
                      value={typingGameSettings.draftSettings.maxLives}
                      onChange={(event) =>
                        typingGameSettings.updateDraftSettings(
                          "maxLives",
                          event.target.value
                        )
                      }
                      className="w-full"
                    />
                    <input
                      type="number"
                      min="3"
                      max="10"
                      value={typingGameSettings.draftSettings.maxLives}
                      onChange={(event) =>
                        typingGameSettings.updateDraftSettings(
                          "maxLives",
                          event.target.value
                        )
                      }
                      className="w-20 rounded-lg border border-gray-300 bg-white px-3 py-2 text-center font-mono font-black text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white">
                    Velocidade das palavras
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Percentual da velocidade inicial de descida no game.
                  </p>
                  <div className="mt-4 flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={typingGameSettings.draftSettings.gameSpeed}
                      onChange={(event) =>
                        typingGameSettings.updateDraftSettings(
                          "gameSpeed",
                          event.target.value
                        )
                      }
                      className="w-full"
                    />
                    <div className="flex items-center rounded-lg border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={typingGameSettings.draftSettings.gameSpeed}
                        onChange={(event) =>
                          typingGameSettings.updateDraftSettings(
                            "gameSpeed",
                            event.target.value
                          )
                        }
                        className="w-20 rounded-l-lg bg-transparent px-3 py-2 text-center font-mono font-black text-gray-900 dark:text-white"
                      />
                      <span className="pr-3 font-black text-gray-500">%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white">
                    Aceleração
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Percentual a mais por palavra destruída no game.
                  </p>
                  <div className="mt-4 flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={typingGameSettings.draftSettings.gameSpeedBoost}
                      onChange={(event) =>
                        typingGameSettings.updateDraftSettings(
                          "gameSpeedBoost",
                          event.target.value
                        )
                      }
                      className="w-full"
                    />
                    <div className="flex items-center rounded-lg border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={typingGameSettings.draftSettings.gameSpeedBoost}
                        onChange={(event) =>
                          typingGameSettings.updateDraftSettings(
                            "gameSpeedBoost",
                            event.target.value
                          )
                        }
                        className="w-20 rounded-l-lg bg-transparent px-3 py-2 text-center font-mono font-black text-gray-900 dark:text-white"
                      />
                      <span className="pr-3 font-black text-gray-500">%</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
                  {typingGameSettings.loading
                    ? "Carregando configuração salva do game..."
                    : `Meta ativa do game: ${gamePassMinWpm} PPM, ${gamePassMinAccuracy}% de precisão, ${maxGameLives} vidas, ${gameSpeed}% de velocidade e ${gameSpeedBoost}% de aceleração.`}
                </p>
                <button
                  type="button"
                  disabled={
                    typingGameSettings.saving || !typingGameSettings.dirty
                  }
                  onClick={typingGameSettings.saveDraftSettings}
                  className="px-5 py-3 rounded-lg bg-[#ffcc02] text-black font-black hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {typingGameSettings.saving
                    ? "Salvando..."
                    : "Salvar configurações do game"}
                </button>
              </div>
              {typingGameSettings.status && (
                <div
                  className={`mt-4 rounded-lg px-4 py-3 text-sm font-bold ${
                    typingGameSettings.status.type === "success"
                      ? "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800"
                      : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
                  }`}
                >
                  {typingGameSettings.status.text}
                </div>
              )}
            </div>

            <form
              className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm"
              onSubmit={handleResetTurmaRanking}
            >
              <div className="flex flex-col md:flex-row md:items-end gap-4">
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Zerar ranking de turma
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Selecione uma turma Normal para remover apenas as pontuações
                    vinculadas a ela.
                  </p>
                  <select
                    value={selectedResetTurmaId}
                    onChange={(event) => {
                      setSelectedResetTurmaId(event.target.value);
                      setResetRankingStatus(null);
                    }}
                    className="mt-4 w-full max-w-sm rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-black text-gray-900 outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  >
                    {turmas.length === 0 ? (
                      <option value="">Nenhuma turma Normal cadastrada</option>
                    ) : (
                      turmas.map((turma) => (
                        <option key={turma.id} value={turma.id}>
                          {turma.nome} ({turma.code})
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={resettingRanking || !selectedResetTurmaId}
                  className="px-5 py-3 rounded-lg bg-red-600 text-white font-black hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {resettingRanking ? "Zerando..." : "Zerar ranking"}
                </button>
              </div>
              {resetRankingStatus && (
                <div
                  className={`mt-4 rounded-lg px-4 py-3 text-sm font-bold ${
                    resetRankingStatus.type === "success"
                      ? "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800"
                      : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
                  }`}
                >
                  {resetRankingStatus.text}
                </div>
              )}
            </form>

            <form
              className="mt-4 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm"
              onSubmit={handleResetGameTurmaRanking}
            >
              <div className="flex flex-col md:flex-row md:items-end gap-4">
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Zerar ranking de turma do game
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Selecione uma turma Normal para remover apenas as pontuações
                    do game vinculadas a ela.
                  </p>
                  <select
                    value={selectedGameResetTurmaId}
                    onChange={(event) => {
                      setSelectedGameResetTurmaId(event.target.value);
                      setResetGameRankingStatus(null);
                    }}
                    className="mt-4 w-full max-w-sm rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-black text-gray-900 outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  >
                    {turmas.length === 0 ? (
                      <option value="">Nenhuma turma Normal cadastrada</option>
                    ) : (
                      turmas.map((turma) => (
                        <option key={turma.id} value={turma.id}>
                          {turma.nome} ({turma.code})
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={resettingGameRanking || !selectedGameResetTurmaId}
                  className="px-5 py-3 rounded-lg bg-red-600 text-white font-black hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {resettingGameRanking
                    ? "Zerando..."
                    : "Zerar ranking do game"}
                </button>
              </div>
              {resetGameRankingStatus && (
                <div
                  className={`mt-4 rounded-lg px-4 py-3 text-sm font-bold ${
                    resetGameRankingStatus.type === "success"
                      ? "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800"
                      : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
                  }`}
                >
                  {resetGameRankingStatus.text}
                </div>
              )}
            </form>
          </div>
        )}

        {view === "ranking" && (
          <div className="max-w-4xl mx-auto p-6 md:p-10 animate-fade-in pb-20">
            {loadingRanking ? (
              <div className="flex justify-center items-center min-h-[280px] text-[#ffcc02]">
                <Icon fafa="spinner" width={32} className="animate-spin" />
              </div>
            ) : (
              <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
                {rankingTab === "global" ? (
                  <TypingRankingScrollArea variant="normal">
                    <table className="w-full text-left">
                      <thead className="text-xs uppercase text-gray-400 bg-gray-50 dark:bg-[#18181b] border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
                        <tr>
                          <th className="px-6 py-3 w-16 text-center">Pos</th>
                          <th className="px-6 py-3">Usuário</th>
                          <th className="px-6 py-3 text-right">Pontos</th>
                          <th className="px-6 py-3 text-right">Lições</th>
                          <th className="px-6 py-3 text-right">PPM</th>
                          <th className="px-6 py-3 text-right">Precisão</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {ranking.global.length === 0 ? (
                          <tr>
                            <td
                              colSpan="6"
                              className="p-12 text-center text-gray-500 font-medium"
                            >
                              Nenhum recorde registrado.
                            </td>
                          </tr>
                        ) : (
                          ranking.global.map((item, i) => {
                            const isMe = item.name === user.username;
                            return (
                              <tr
                                key={i}
                                className={`hover:bg-gray-50 dark:hover:bg-[#202024] ${
                                  isMe ? "bg-[#ffcc02]/20" : ""
                                }`}
                              >
                                <td className="px-6 py-4 text-center">
                                  {i === 0 ? (
                                    <span className="text-xl">🥇</span>
                                  ) : i === 1 ? (
                                    <span className="text-xl">🥈</span>
                                  ) : i === 2 ? (
                                    <span className="text-xl">🥉</span>
                                  ) : (
                                    <span className="font-bold text-gray-400">
                                      {i + 1}
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 font-bold text-gray-900 dark:text-gray-100">
                                  {item.name}
                                  {isMe && (
                                    <span className="ml-2 text-[10px] bg-[#ffcc02] text-black px-2 py-0.5 rounded uppercase">
                                      Você
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-right font-mono font-black text-[#ffcc02] dark:text-[#ffcc02]">
                                  {item.points || 0}
                                </td>
                                <td className="px-6 py-4 text-right font-mono font-bold text-gray-700 dark:text-gray-300">
                                  {item.lessons_completed || 0}
                                </td>
                                <td className="px-6 py-4 text-right font-mono font-bold text-gray-900 dark:text-gray-100">
                                  {item.best_wpm || 0}
                                </td>
                                <td className="px-6 py-4 text-right font-mono text-gray-500">
                                  {Math.floor(item.best_accuracy || 0)}%
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </TypingRankingScrollArea>
                ) : (
                  <div className="p-0">
                    {isStaff && turmas.length > 0 && (
                      <div className="px-6 py-3 bg-gray-50 dark:bg-[#18181b] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Visualizar Turma:
                        </span>
                        <select
                          className="text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 outline-none text-gray-900 dark:text-gray-100"
                          value={selectedTurmaId}
                          onChange={(e) => setSelectedTurmaId(e.target.value)}
                        >
                          {turmas.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.nome}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <TypingRankingScrollArea variant="normal">
                      <table className="w-full text-left">
                        <thead className="text-xs uppercase text-gray-400 bg-gray-50 dark:bg-[#18181b] border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
                          <tr>
                            <th className="px-6 py-3 w-16 text-center">Pos</th>
                            <th className="px-6 py-3">Usuário</th>
                            <th className="px-6 py-3 text-right">Pontos</th>
                            <th className="px-6 py-3 text-right">Lições</th>
                            <th className="px-6 py-3 text-right">PPM</th>
                            <th className="px-6 py-3 text-right">Precisão</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {!user.turmaId && !isStaff ? (
                            <tr>
                              <td
                                colSpan="6"
                                className="p-12 text-center text-gray-500 font-medium"
                              >
                                Você não está vinculado a uma turma.
                              </td>
                            </tr>
                          ) : ranking.turma.length === 0 ? (
                            <tr>
                              <td
                                colSpan="6"
                                className="p-12 text-center text-gray-500 font-medium"
                              >
                                Sua turma ainda não tem recordes. Seja o
                                primeiro!
                              </td>
                            </tr>
                          ) : (
                            ranking.turma.map((item, i) => {
                              const isMe = item.name === user.username;
                              return (
                                <tr
                                  key={i}
                                  className={`hover:bg-gray-50 dark:hover:bg-[#202024] ${
                                    isMe ? "bg-[#ffcc02]/20" : ""
                                  }`}
                                >
                                  <td className="px-6 py-4 text-center">
                                    {i === 0 ? (
                                      <span className="text-xl">👑</span>
                                    ) : (
                                      <span className="font-bold text-gray-400">
                                        {i + 1}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 font-bold text-gray-900 dark:text-gray-100">
                                    {item.name}
                                    {isMe && (
                                      <span className="ml-2 text-[10px] bg-[#ffcc02] text-black px-2 py-0.5 rounded uppercase">
                                        Você
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 text-right font-mono font-black text-[#ffcc02] dark:text-[#ffcc02]">
                                    {item.points || 0}
                                  </td>
                                  <td className="px-6 py-4 text-right font-mono font-bold text-gray-700 dark:text-gray-300">
                                    {item.lessons_completed || 0}
                                  </td>
                                  <td className="px-6 py-4 text-right font-mono font-bold text-gray-900 dark:text-gray-100">
                                    {item.best_wpm || 0}
                                  </td>
                                  <td className="px-6 py-4 text-right font-mono text-gray-500">
                                    {Math.floor(item.best_accuracy || 0)}%
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </TypingRankingScrollArea>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AppWindow>
  );
};
