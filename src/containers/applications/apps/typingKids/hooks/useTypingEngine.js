import { useState, useEffect, useRef } from "react";
import { TYPING_LESSONS } from "../../assets/typingLessons";
import { api } from "../../../../../lib/api";
import {
  PASS_MIN_ACCURACY,
  PASS_MIN_WPM,
  useTypingSettings,
} from "../../typingSettings";
import {
  areTypingCharactersEquivalent,
  normalizeTypingInputValue,
  resolveDeadKeyMarkFromEvent,
} from "../../typingInput";

export { PASS_MIN_ACCURACY, PASS_MIN_WPM };

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

export const calculateLiveWpm = (typedValue, referenceText, elapsedTime) => {
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

export const calculateMomentum = ({
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

export const useTypingEngine = (user, enabled = true) => {
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
  const [focusLost, setFocusLost] = useState(false);
  const [completedLessons, setCompletedLessons] = useState([]);
  const [lessonVariants, setLessonVariants] = useState({});
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [momentum, setMomentum] = useState(0);
  const [mistakeJustAdded, setMistakeJustAdded] = useState(false);
  const typingSettings = useTypingSettings({
    studentType: "kids",
    isProfessor: user?.role === "professor",
    enabled,
  });
  const maxErrors = typingSettings.settings.maxErrors;
  const passMinWpm = typingSettings.settings.passMinWpm;
  const passMinAccuracy = typingSettings.settings.passMinAccuracy;
  const [lives, setLives] = useState(maxErrors);
  const [sessionId, setSessionId] = useState(0);
  const pendingDeadKeyRef = useRef("");

  useEffect(() => {
    if (!user) return;
    const saved = localStorage.getItem(
      `completedTypingLessons_${user.username}`
    );
    if (saved) {
      try {
        setCompletedLessons(JSON.parse(saved));
      } catch (e) {}
    }
    const savedVariants = localStorage.getItem(
      getVariantStorageKey(user.username)
    );
    if (savedVariants) {
      try {
        setLessonVariants(JSON.parse(savedVariants));
      } catch (e) {}
    }
  }, [user]);

  useEffect(() => {
    let interval;
    if (startTime && !finished) {
      interval = setInterval(() => {
        if (typeof window !== "undefined") {
          setElapsedMs(Date.now() - startTime);
        }
      }, 30);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [startTime, finished]);

  useEffect(() => {
    if (!mistakeJustAdded) return undefined;
    const timeoutId = setTimeout(() => setMistakeJustAdded(false), 200);
    return () => clearTimeout(timeoutId);
  }, [mistakeJustAdded]);

  useEffect(() => {
    if (!currentLesson || !startTime || finished) {
      setLives(maxErrors);
      return;
    }
    setLives(Math.max(0, maxErrors - totalErrors));
  }, [maxErrors]);

  useEffect(() => {
    if (!currentLesson || finished) return;
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
    setMistakeJustAdded(false);
    setLives(maxErrors);
    setSessionId((prev) => prev + 1);
  };

  const updateMaxErrors = (value) => {
    typingSettings.updateDraftSettings("maxErrors", value);
  };

  const updatePassMinWpm = (value) => {
    typingSettings.updateDraftSettings("passMinWpm", value);
  };

  const updatePassMinAccuracy = (value) => {
    typingSettings.updateDraftSettings("passMinAccuracy", value);
  };

  const handleInputDeadKey = (event) => {
    const mark = resolveDeadKeyMarkFromEvent(event);
    if (!mark) return;
    pendingDeadKeyRef.current = mark;
  };

  const handleInputChange = (rawValue) => {
    if (finished || !currentLesson) return;

    const normalizedInput = normalizeTypingInputValue({
      nextValue: rawValue,
      previousValue: userInput,
      pendingMark: pendingDeadKeyRef.current,
      referenceText: currentLesson.text,
    });
    pendingDeadKeyRef.current = normalizedInput.pendingMark;
    if (normalizedInput.ignored) return;

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
      let newLives = lives;

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
            nextCombo += 1;
            highestCombo = Math.max(highestCombo, nextCombo);
          }
        }
        newKeystrokes += addedChars.length;
        newErrors += errorsAdded;
        setTotalKeystrokes(newKeystrokes);
        setTotalErrors(newErrors);

        if (errorsAdded > 0) {
          newLives = Math.max(0, lives - errorsAdded);
          setLives(newLives);
        }
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
      setWpm(liveWpm);
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

      if (mistakeAdded) {
        setMistakeJustAdded(true);
      }

      if (val.length === currentLesson.text.length || newLives === 0) {
        finishLesson(
          val,
          newKeystrokes,
          newErrors,
          acc,
          highestCombo,
          effectiveStartTime,
          newLives === 0
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
    effectiveStartTime,
    forceFail = false
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

    const isPass =
      !forceFail && netWpm >= passMinWpm && finalAcc >= passMinAccuracy;
    setPassed(isPass);
    saveScore(netWpm, finalAcc, finalMs);

    const updateLessonVariant = (lessonId, updater) => {
      setLessonVariants((prev) => {
        const lesson = TYPING_LESSONS.find((item) => item.id === lessonId);
        if (!lesson) return prev;

        const currentIndex = getLessonVariantIndex(lesson, prev);
        const nextIndex = updater(currentIndex, lesson.variants.length);
        const next = { ...prev, [lessonId]: nextIndex };
        if (user)
          localStorage.setItem(
            getVariantStorageKey(user.username),
            JSON.stringify(next)
          );
        return next;
      });
    };

    if (isPass) {
      setCompletedLessons((prev) => {
        if (!prev.includes(currentLesson.id)) {
          const next = [...prev, currentLesson.id];
          if (user)
            localStorage.setItem(
              `completedTypingLessons_${user.username}`,
              JSON.stringify(next)
            );
          return next;
        }
        return prev;
      });
      updateLessonVariant(currentLesson.id, () => 0);
    } else {
      updateLessonVariant(
        currentLesson.id,
        (currentIndex, variantCount) => (currentIndex + 1) % variantCount
      );
    }
  };

  const saveScore = async (finalWpm, finalAcc, finalMs) => {
    if (!user || user.role === "professor") return;
    try {
      await api.saveTypingScore({
        lessonId: currentLesson.id,
        wpm: finalWpm,
        accuracy: finalAcc,
        timeMs: finalMs,
      });
    } catch (error) {}
  };

  return {
    currentLesson,
    userInput,
    startTime,
    elapsedMs,
    wpm,
    accuracy,
    totalErrors,
    totalKeystrokes,
    finished,
    passed,
    focusLost,
    setFocusLost,
    completedLessons,
    combo,
    bestCombo,
    momentum,
    mistakeJustAdded,
    maxErrors,
    updateMaxErrors,
    passMinWpm,
    passMinAccuracy,
    updatePassMinWpm,
    updatePassMinAccuracy,
    draftSettings: typingSettings.draftSettings,
    settingsDirty: typingSettings.dirty,
    settingsLoading: typingSettings.loading,
    settingsSaving: typingSettings.saving,
    settingsStatus: typingSettings.status,
    saveSettings: typingSettings.saveDraftSettings,
    lives,
    sessionId,
    launchLesson,
    handleInputDeadKey,
    handleInputChange,
  };
};
