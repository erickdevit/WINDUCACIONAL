import { useEffect, useMemo, useState } from "react";
import { api } from "../../../lib/api";
import {
  normalizeTypingGameSettings,
  normalizeTypingSettings,
} from "./typingSettings";

const MODE_LABELS = {
  lesson: "Lições convencionais",
  game: "Games",
};

const SCOPE_LABELS = {
  turma: "Uma turma",
  student: "Um aluno",
};

const normalizeTargetSettings = (mode, settings) =>
  mode === "game"
    ? normalizeTypingGameSettings("normal", settings)
    : normalizeTypingSettings("normal", settings);

const SETTING_FIELDS = {
  lesson: [
    {
      field: "passMinWpm",
      label: "PPM mínimo",
      description: "Velocidade mínima exigida para aprovar uma lição.",
      min: 10,
      max: 120,
    },
    {
      field: "passMinAccuracy",
      label: "Precisão mínima",
      description: "Percentual mínimo de acertos exigido para aprovação.",
      min: 50,
      max: 100,
      suffix: "%",
    },
    {
      field: "maxErrors",
      label: "Erros permitidos",
      description: "Quantidade de erros permitidos durante a lição.",
      min: 3,
      max: 10,
    },
  ],
  game: [
    {
      field: "passMinWpm",
      label: "PPM mínimo",
      description: "Velocidade mínima para entrar no ranking do game.",
      min: 10,
      max: 120,
    },
    {
      field: "passMinAccuracy",
      label: "Precisão mínima",
      description: "Percentual mínimo para entrar no ranking do game.",
      min: 50,
      max: 100,
      suffix: "%",
    },
    {
      field: "maxLives",
      label: "Vidas",
      description: "Quantidade de erros permitidos no game.",
      min: 3,
      max: 10,
    },
    {
      field: "gameSpeed",
      label: "Velocidade das palavras",
      description: "Percentual da velocidade inicial de descida.",
      min: 0,
      max: 100,
      suffix: "%",
    },
    {
      field: "gameSpeedBoost",
      label: "Aceleração",
      description: "Percentual adicional por palavra destruída.",
      min: 0,
      max: 100,
      suffix: "%",
    },
  ],
};

const DifficultyRangeField = ({ config, value, onChange }) => (
  <div>
    <h3 className="text-base font-bold text-gray-900 dark:text-white">
      {config.label}
    </h3>
    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
      {config.description}
    </p>
    <div className="mt-4 flex items-center gap-4">
      <input
        type="range"
        min={config.min}
        max={config.max}
        step="1"
        value={value}
        onChange={(event) => onChange(config.field, event.target.value)}
        aria-label={`${config.label}: barra`}
        className="w-full"
      />
      <div className="flex items-center rounded-lg border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900">
        <input
          type="number"
          min={config.min}
          max={config.max}
          step="1"
          value={value}
          onChange={(event) => onChange(config.field, event.target.value)}
          aria-label={`${config.label}: valor`}
          className={`w-20 bg-transparent px-3 py-2 text-center font-mono font-black text-gray-900 dark:text-white ${
            config.suffix ? "rounded-l-lg" : "rounded-lg"
          }`}
        />
        {config.suffix ? (
          <span className="pr-3 font-black text-gray-500 dark:text-gray-400">
            {config.suffix}
          </span>
        ) : null}
      </div>
    </div>
  </div>
);

export const TypingDifficultyAssignmentPanel = ({
  studentType,
  turmas = [],
  enabled = false,
}) => {
  const [mode, setMode] = useState("lesson");
  const [scope, setScope] = useState("turma");
  const [turmaId, setTurmaId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [students, setStudents] = useState([]);
  const [settings, setSettings] = useState(null);
  const [source, setSource] = useState("type");
  const [override, setOverride] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  const availableTurmas = useMemo(
    () =>
      turmas.filter(
        (turma) =>
          String(turma.studentType || "").toLowerCase() ===
          String(studentType || "").toLowerCase()
      ),
    [studentType, turmas]
  );

  const availableStudents = useMemo(
    () =>
      students.filter(
        (student) =>
          student.role === "aluno" &&
          student.active !== false &&
          String(student.studentType || "").toLowerCase() ===
            String(studentType || "").toLowerCase() &&
          (!turmaId || student.turmaId === turmaId)
      ),
    [studentType, students, turmaId]
  );

  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    api
      .getUsers()
      .then((data) => {
        if (active) setStudents(data.users || []);
      })
      .catch(() => {
        if (active) setStudents([]);
      });
    return () => {
      active = false;
    };
  }, [enabled]);

  useEffect(() => {
    if (!availableTurmas.some((turma) => turma.id === turmaId)) {
      setTurmaId(availableTurmas[0]?.id || "");
    }
  }, [availableTurmas, turmaId]);

  useEffect(() => {
    if (!availableStudents.some((student) => student.id === studentId)) {
      setStudentId(availableStudents[0]?.id || "");
    }
  }, [availableStudents, studentId]);

  useEffect(() => {
    if (!enabled) return undefined;
    const targetId = scope === "turma" ? turmaId : studentId;
    if (!targetId) {
      setSettings(null);
      setOverride(null);
      setSource("type");
      return undefined;
    }
    let active = true;
    setLoading(true);
    setStatus(null);
    api
      .getTypingDifficulty({
        mode,
        scope,
        [scope === "turma" ? "turmaId" : "studentId"]: targetId,
      })
      .then((data) => {
        if (!active) return;
        setSettings(normalizeTargetSettings(mode, data.settings));
        setSource(data.source || "type");
        setOverride(data.override || null);
      })
      .catch((error) => {
        if (active) {
          setSettings(null);
          setStatus({ type: "error", text: error.message || "Não foi possível carregar a dificuldade." });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [enabled, mode, scope, studentId, turmaId]);

  const update = (field, value) => {
    setSettings((current) =>
      current ? normalizeTargetSettings(mode, { ...current, [field]: value }) : current
    );
    setStatus(null);
  };

  const save = async () => {
    const targetId = scope === "turma" ? turmaId : studentId;
    if (!settings || !targetId) return;
    setSaving(true);
    setStatus(null);
    try {
      const data = await api.saveTypingDifficulty({
        mode,
        scope,
        ...(scope === "turma" ? { turmaId } : { studentId }),
        settings,
      });
      setSettings(normalizeTargetSettings(mode, data.settings));
      setSource(data.source || scope);
      setOverride(data.override || null);
      setStatus({ type: "success", text: "Dificuldade direcionada salva." });
    } catch (error) {
      setStatus({ type: "error", text: error.message || "Não foi possível salvar a dificuldade." });
    } finally {
      setSaving(false);
    }
  };

  const clear = async () => {
    const targetId = scope === "turma" ? turmaId : studentId;
    if (!targetId || !override) return;
    setSaving(true);
    setStatus(null);
    try {
      const data = await api.clearTypingDifficulty({
        mode,
        scope,
        ...(scope === "turma" ? { turmaId } : { studentId }),
      });
      setSettings(normalizeTargetSettings(mode, data.settings));
      setSource(data.source || "type");
      setOverride(null);
      setStatus({ type: "success", text: "Direcionamento removido; a configuração base voltou a valer." });
    } catch (error) {
      setStatus({ type: "error", text: error.message || "Não foi possível remover o direcionamento." });
    } finally {
      setSaving(false);
    }
  };

  if (!enabled) return null;

  return (
    <section className="bg-white dark:bg-[#18181b] border border-[#ffcc02]/50 rounded-xl p-6 shadow-sm mb-4">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Direcionar dificuldade
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          A configuração direcionada substitui a base do tipo somente para a turma ou aluno escolhido.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
          Aplicação
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value)}
            className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          >
            {Object.entries(MODE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
          Direcionar para
          <select
            value={scope}
            onChange={(event) => setScope(event.target.value)}
            className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          >
            {Object.entries(SCOPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        {scope === "turma" ? (
          <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
            Turma
            <select
              value={turmaId}
              onChange={(event) => setTurmaId(event.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              {availableTurmas.map((turma) => (
                <option key={turma.id} value={turma.id}>{turma.nome}</option>
              ))}
            </select>
          </label>
        ) : (
          <>
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
              Turma do aluno
              <select
                value={turmaId}
                onChange={(event) => setTurmaId(event.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                {availableTurmas.map((turma) => (
                  <option key={turma.id} value={turma.id}>{turma.nome}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
              Aluno
              <select
                value={studentId}
                onChange={(event) => setStudentId(event.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                {availableStudents.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.displayName || student.username}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
      </div>

      {loading ? <p className="mt-5 text-sm text-gray-500">Carregando dificuldade efetiva...</p> : null}
      {settings ? (
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-6">
          {SETTING_FIELDS[mode].map((config) => (
            <DifficultyRangeField
              key={config.field}
              config={config}
              value={settings[config.field]}
              onChange={update}
            />
          ))}
        </div>
      ) : null}

      <div className="mt-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
          Origem atual: {source === "student" ? "aluno" : source === "turma" ? "turma" : "tipo base"}
        </p>
        <div className="flex gap-2">
          <button type="button" disabled={saving || !settings || !override} onClick={clear} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-bold disabled:opacity-50 dark:border-gray-700 dark:text-gray-300">
            Voltar à base
          </button>
          <button type="button" disabled={saving || !settings} onClick={save} className="px-5 py-2 rounded-lg bg-[#ffcc02] text-black font-black disabled:opacity-50">
            {saving ? "Salvando..." : "Salvar direcionamento"}
          </button>
        </div>
      </div>
      {status ? <p className={`mt-4 rounded-lg px-4 py-3 text-sm font-bold ${status.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{status.text}</p> : null}
    </section>
  );
};
