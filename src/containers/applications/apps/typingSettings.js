import { useEffect, useRef, useState } from "react";
import { api } from "../../../lib/api";

export const PASS_MIN_WPM = 40;
export const PASS_MIN_ACCURACY = 95;
export const MAX_ERRORS = 7;
export const MAX_GAME_LIVES = 7;

export const DEFAULT_TYPING_SETTINGS = {
  normal: {
    studentType: "normal",
    passMinWpm: PASS_MIN_WPM,
    passMinAccuracy: PASS_MIN_ACCURACY,
    maxErrors: MAX_ERRORS,
    updatedAt: null,
  },
  kids: {
    studentType: "kids",
    passMinWpm: PASS_MIN_WPM,
    passMinAccuracy: PASS_MIN_ACCURACY,
    maxErrors: MAX_ERRORS,
    updatedAt: null,
  },
};

export const DEFAULT_TYPING_GAME_SETTINGS = {
  normal: {
    studentType: "normal",
    passMinWpm: PASS_MIN_WPM,
    passMinAccuracy: PASS_MIN_ACCURACY,
    maxLives: MAX_GAME_LIVES,
    gameSpeed: 100,
    gameSpeedBoost: 3,
    updatedAt: null,
  },
  kids: {
    studentType: "kids",
    passMinWpm: PASS_MIN_WPM,
    passMinAccuracy: PASS_MIN_ACCURACY,
    maxLives: MAX_GAME_LIVES,
    gameSpeed: 100,
    gameSpeedBoost: 3,
    updatedAt: null,
  },
};

export const clampTypingSetting = (value, fallback, min, max) => {
  const parsed = Number.parseFloat(value);
  const safeValue = Number.isFinite(parsed) ? parsed : fallback;
  return Math.min(max, Math.max(min, safeValue));
};

export const normalizeTypingStudentType = (studentType) =>
  studentType === "kids" ? "kids" : "normal";

const normalizeGameSpeedPercent = (value, fallback) => {
  return Math.round(clampTypingSetting(value, fallback, 0, 100));
};

const normalizeGameAccelerationPercent = (value, fallback) => {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed >= 1 && parsed <= 3 && !Number.isInteger(parsed)) {
    return Math.round(clampTypingSetting((parsed - 1) * 100, fallback, 0, 100));
  }
  return Math.round(clampTypingSetting(parsed, fallback, 0, 100));
};

export const normalizeTypingSettings = (studentType, settings = {}) => {
  const normalizedType = normalizeTypingStudentType(
    settings.studentType || studentType
  );
  const defaults = DEFAULT_TYPING_SETTINGS[normalizedType];

  return {
    studentType: normalizedType,
    passMinWpm: clampTypingSetting(
      settings.passMinWpm,
      defaults.passMinWpm,
      10,
      120
    ),
    passMinAccuracy: clampTypingSetting(
      settings.passMinAccuracy,
      defaults.passMinAccuracy,
      50,
      100
    ),
    maxErrors: clampTypingSetting(
      settings.maxErrors,
      defaults.maxErrors,
      3,
      10
    ),
    updatedAt: settings.updatedAt || defaults.updatedAt,
  };
};

export const normalizeTypingGameSettings = (studentType, settings = {}) => {
  const normalizedType = normalizeTypingStudentType(
    settings.studentType || studentType
  );
  const defaults = DEFAULT_TYPING_GAME_SETTINGS[normalizedType];

  return {
    studentType: normalizedType,
    passMinWpm: clampTypingSetting(
      settings.passMinWpm,
      defaults.passMinWpm,
      10,
      120
    ),
    passMinAccuracy: clampTypingSetting(
      settings.passMinAccuracy,
      defaults.passMinAccuracy,
      50,
      100
    ),
    maxLives: clampTypingSetting(settings.maxLives, defaults.maxLives, 3, 10),
    gameSpeed: normalizeGameSpeedPercent(
      settings.gameSpeed,
      defaults.gameSpeed
    ),
    gameSpeedBoost: normalizeGameAccelerationPercent(
      settings.gameSpeedBoost,
      defaults.gameSpeedBoost
    ),
    updatedAt: settings.updatedAt || defaults.updatedAt,
  };
};

const getCacheKey = (studentType, cachePrefix) =>
  `${cachePrefix}_${normalizeTypingStudentType(studentType)}`;

const readCachedSettings = (
  studentType,
  { cachePrefix, normalizeSettings }
) => {
  const normalizedType = normalizeTypingStudentType(studentType);
  try {
    const cached = window.localStorage.getItem(
      getCacheKey(normalizedType, cachePrefix)
    );
    if (!cached) return normalizeSettings(normalizedType);
    return normalizeSettings(normalizedType, JSON.parse(cached));
  } catch (error) {
    return normalizeSettings(normalizedType);
  }
};

const writeCachedSettings = (settings, cachePrefix) => {
  try {
    window.localStorage.setItem(
      getCacheKey(settings.studentType, cachePrefix),
      JSON.stringify(settings)
    );
  } catch (error) {}
};

const useSyncedTypingSettings = ({
  studentType,
  isProfessor = false,
  cachePrefix,
  normalizeSettings,
  loadSettings,
  saveSettings,
  subscribeSettings,
  loadErrorText,
  saveSuccessText,
  saveErrorText,
}) => {
  const normalizedType = normalizeTypingStudentType(studentType);
  const dirtyRef = useRef(false);
  const settingsOptions = { cachePrefix, normalizeSettings };
  const [settings, setSettings] = useState(() =>
    readCachedSettings(normalizedType, settingsOptions)
  );
  const [draftSettings, setDraftSettings] = useState(() =>
    readCachedSettings(normalizedType, settingsOptions)
  );
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  const setDirtyState = (nextDirty) => {
    dirtyRef.current = nextDirty;
    setDirty(nextDirty);
  };

  const applySettings = (nextSettings, preserveDirtyDraft = true) => {
    const normalizedSettings = normalizeSettings(normalizedType, nextSettings);
    setSettings(normalizedSettings);
    writeCachedSettings(normalizedSettings, cachePrefix);
    if (!preserveDirtyDraft || !dirtyRef.current) {
      setDraftSettings(normalizedSettings);
    }
    return normalizedSettings;
  };

  useEffect(() => {
    const cachedSettings = readCachedSettings(normalizedType, settingsOptions);
    setSettings(cachedSettings);
    setDraftSettings(cachedSettings);
    setDirtyState(false);
    setStatus(null);
  }, [normalizedType]);

  useEffect(() => {
    let active = true;

    const fetchSettings = async () => {
      if (typeof loadSettings !== "function") return;
      setLoading(true);
      try {
        const data = await loadSettings(normalizedType);
        if (active) applySettings(data.settings);
      } catch (error) {
        if (active && isProfessor) {
          setStatus({
            type: "error",
            text: loadErrorText,
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchSettings();
    return () => {
      active = false;
    };
  }, [normalizedType, isProfessor, loadSettings]);

  useEffect(() => {
    if (typeof subscribeSettings !== "function") return undefined;

    const subscription = subscribeSettings(normalizedType, {
      onSettings: (nextSettings) => {
        applySettings(nextSettings);
      },
      onError: () => {},
    });

    return () => {
      subscription?.close?.();
    };
  }, [normalizedType, subscribeSettings]);

  const updateDraftSettings = (field, value) => {
    setDraftSettings((current) =>
      normalizeSettings(normalizedType, {
        ...current,
        [field]: value,
      })
    );
    setDirtyState(true);
    setStatus(null);
  };

  const saveDraftSettings = async () => {
    if (!isProfessor || typeof saveSettings !== "function") return null;

    setSaving(true);
    setStatus(null);
    try {
      const data = await saveSettings(normalizedType, draftSettings);
      setDirtyState(false);
      const savedSettings = applySettings(data.settings, false);
      setStatus({
        type: "success",
        text: saveSuccessText,
      });
      return savedSettings;
    } catch (error) {
      setStatus({
        type: "error",
        text: error.message || saveErrorText,
      });
      return null;
    } finally {
      setSaving(false);
    }
  };

  return {
    settings,
    draftSettings,
    dirty,
    loading,
    saving,
    status,
    updateDraftSettings,
    saveDraftSettings,
  };
};

export const useTypingSettings = ({ studentType, isProfessor = false }) =>
  useSyncedTypingSettings({
    studentType,
    isProfessor,
    cachePrefix: "typingSettings",
    normalizeSettings: normalizeTypingSettings,
    loadSettings: api.getTypingSettings,
    saveSettings: api.saveTypingSettings,
    subscribeSettings: api.subscribeTypingSettings,
    loadErrorText: "Não foi possível carregar as configurações salvas.",
    saveSuccessText:
      "Configurações salvas. Alunos conectados receberão a atualização em tempo real.",
    saveErrorText: "Não foi possível salvar as configurações.",
  });

export const useTypingGameSettings = ({ studentType, isProfessor = false }) =>
  useSyncedTypingSettings({
    studentType,
    isProfessor,
    cachePrefix: "typingGameSettings",
    normalizeSettings: normalizeTypingGameSettings,
    loadSettings: api.getTypingGameSettings,
    saveSettings: api.saveTypingGameSettings,
    subscribeSettings: api.subscribeTypingGameSettings,
    loadErrorText: "Não foi possível carregar as configurações salvas do game.",
    saveSuccessText:
      "Configurações do game salvas. Alunos conectados receberão a atualização em tempo real.",
    saveErrorText: "Não foi possível salvar as configurações do game.",
  });
