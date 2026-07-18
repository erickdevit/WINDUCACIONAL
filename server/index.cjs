const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const { Pool } = require("pg");

const { runMigrations } = require("./db/migrate.cjs");

const rootDir = path.resolve(__dirname, "..");
const buildDir = path.join(rootDir, "build");
const sourceTreePath = path.join(rootDir, "src", "reducers", "dir.json");
const bookletLibraryDir = path.join(
  rootDir,
  "src",
  "containers",
  "applications",
  "apps",
  "booklets",
  "library"
);

const config = {
  port: Number(process.env.PORT || 3001),
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgres://simulador:simulador@localhost:5432/simulador_educacional",
  dataDir: path.resolve(
    process.env.PERSISTENT_DATA_DIR || path.join(rootDir, "data")
  ),
  sessionDays: Number(process.env.SESSION_DAYS || 7),
  cookieName: process.env.SESSION_COOKIE_NAME || "simulador.sid",
  bootstrapToken: process.env.BOOTSTRAP_TOKEN || "",
  seedAdminEnabled: process.env.SEED_ADMIN_ENABLED !== "false",
  seedAdminUsername: process.env.SEED_ADMIN_USERNAME || "Admin",
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD || "Admin",
  seedAdminDisplayName: process.env.SEED_ADMIN_DISPLAY_NAME || "Admin",
  dbRetryAttempts: Number(process.env.DB_RETRY_ATTEMPTS || 20),
  dbRetryDelayMs: Number(process.env.DB_RETRY_DELAY_MS || 3000),
  nodeEnv: process.env.NODE_ENV || "development",
  appVersion: process.env.APP_VERSION || process.env.SOURCE_VERSION || "",
};

const pool = new Pool({
  connectionString: config.databaseUrl,
});

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "1mb" }));

const ATTENDANCE_TIME_ZONE = "America/Sao_Paulo";
const DEFAULT_CLASS_DAYS = [1, 2, 3, 4, 5];
const DEFAULT_CLASS_START_TIME = "00:00";
const DEFAULT_CLASS_END_TIME = "23:59";

const typingSettingsClients = new Set();
const typingGameSettingsClients = new Set();
const notificationClients = new Map();
const onlineUsers = new Map();
const DEFAULT_TYPING_SETTINGS = Object.freeze({
  normal: Object.freeze({
    studentType: "normal",
    passMinWpm: 40,
    passMinAccuracy: 95,
    maxErrors: 7,
  }),
  kids: Object.freeze({
    studentType: "kids",
    passMinWpm: 40,
    passMinAccuracy: 95,
    maxErrors: 7,
  }),
});
const DEFAULT_TYPING_GAME_SETTINGS = Object.freeze({
  normal: Object.freeze({
    studentType: "normal",
    passMinWpm: 40,
    passMinAccuracy: 95,
    maxLives: 7,
    gameSpeed: 100,
    gameSpeedBoost: 3,
  }),
  kids: Object.freeze({
    studentType: "kids",
    passMinWpm: 40,
    passMinAccuracy: 95,
    maxLives: 7,
    gameSpeed: 100,
    gameSpeedBoost: 3,
  }),
});

const readCookie = (req, name) => {
  const cookie = req.headers.cookie || "";
  const parts = cookie.split(";").map((part) => part.trim());
  const found = parts.find((part) => part.startsWith(`${name}=`));
  if (!found) return "";
  return decodeURIComponent(found.slice(name.length + 1));
};

const hashToken = (token) =>
  crypto.createHash("sha256").update(token, "utf8").digest("hex");

const normalizeUsername = (username) =>
  String(username || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");

const normalizeDisplayName = (name) => {
  if (!name) return "";
  return String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (word.length <= 1) return word.toUpperCase();
      return word[0].toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
};

const normalizeStudentType = (studentType, role) => {
  if (role !== "aluno") return "normal";
  const normalized = String(studentType || "normal")
    .trim()
    .toLowerCase();
  if (!["kids", "normal"].includes(normalized)) {
    const err = new Error("Tipo de aluno inválido.");
    err.status = 400;
    throw err;
  }
  return normalized;
};

const normalizeClassStudentType = (studentType) => {
  const normalized = String(studentType || "normal")
    .trim()
    .toLowerCase();
  if (!["kids", "normal", "reposicao"].includes(normalized)) {
    const err = new Error("Tipo de turma inválido.");
    err.status = 400;
    throw err;
  }
  return normalized;
};

const normalizeScheduleDays = (days) => {
  const source =
    Array.isArray(days) && days.length > 0 ? days : DEFAULT_CLASS_DAYS;
  const normalized = [...new Set(source.map((day) => Number(day)))].sort(
    (a, b) => a - b
  );
  if (
    normalized.length === 0 ||
    normalized.some((day) => !Number.isInteger(day) || day < 0 || day > 6)
  ) {
    const err = new Error("Dias de aula inválidos.");
    err.status = 400;
    throw err;
  }
  return normalized;
};

const normalizeScheduleTime = (value, fallback) => {
  const normalized = String(value || fallback).trim();
  if (!/^\d{2}:\d{2}$/.test(normalized)) {
    const err = new Error("Horário da turma deve usar o formato HH:MM.");
    err.status = 400;
    throw err;
  }
  const [hours, minutes] = normalized.split(":").map(Number);
  if (hours > 23 || minutes > 59) {
    const err = new Error("Horário da turma inválido.");
    err.status = 400;
    throw err;
  }
  return normalized;
};

const normalizeClassSchedule = ({
  scheduleDays,
  scheduleStartTime,
  scheduleEndTime,
} = {}) => {
  const days = normalizeScheduleDays(scheduleDays);
  const startTime = normalizeScheduleTime(
    scheduleStartTime,
    DEFAULT_CLASS_START_TIME
  );
  const endTime = normalizeScheduleTime(
    scheduleEndTime,
    DEFAULT_CLASS_END_TIME
  );
  if (startTime >= endTime) {
    const err = new Error(
      "Horário inicial da turma deve ser menor que o horário final."
    );
    err.status = 400;
    throw err;
  }
  return { days, startTime, endTime };
};

const formatScheduleTime = (value, fallback) =>
  String(value || fallback).slice(0, 5);

const getDateWeekday = (date) => new Date(`${date}T12:00:00`).getDay();

const timeToMinutes = (value) => {
  const [hours, minutes] = String(value || "00:00")
    .slice(0, 5)
    .split(":");
  return Number(hours) * 60 + Number(minutes);
};

const normalizeTypingStudentType = (studentType) => {
  const normalized = String(studentType || "normal")
    .trim()
    .toLowerCase();
  if (!["kids", "normal"].includes(normalized)) {
    const err = new Error("Tipo de digitação inválido.");
    err.status = 400;
    throw err;
  }
  return normalized;
};

const normalizeBookletId = (value) => {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "item";
};

const compareBookletNames = (a, b) =>
  String(a || "").localeCompare(String(b || ""), "pt-BR", {
    numeric: true,
    sensitivity: "base",
  });

const getBookletTitle = (value) =>
  String(value || "")
    .replace(/\.pdf$/i, "")
    .replace(/^\d+\s*-\s*/, "")
    .trim();

const getBookletOrder = (value) => {
  const match = String(value || "").match(/^(\d+)/);
  return match ? Number(match[1]) : 0;
};

const clampInteger = (value, fallback, min, max) => {
  const parsed = Number.parseInt(value, 10);
  const safeValue = Number.isFinite(parsed) ? parsed : fallback;
  return Math.min(max, Math.max(min, safeValue));
};

const generateTurmaCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = crypto.randomBytes(6);
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join("");
};

const normalizeTurmaCode = (code) =>
  String(code || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const ensureTurmaCode = async (requestedCode) => {
  const normalized = normalizeTurmaCode(requestedCode);
  if (normalized && !/^[A-Z0-9]{6}$/.test(normalized)) {
    const err = new Error(
      "Código da turma deve ter 6 letras ou números maiúsculos."
    );
    err.status = 400;
    throw err;
  }

  for (let attempt = 0; attempt < 12; attempt++) {
    const code = attempt === 0 && normalized ? normalized : generateTurmaCode();
    const existing = await pool.query("SELECT id FROM turmas WHERE code = $1", [
      code,
    ]);
    if (existing.rowCount === 0) return code;
    if (normalized) {
      const err = new Error("Código da turma já está em uso.");
      err.status = 409;
      throw err;
    }
  }

  const err = new Error("Não foi possível gerar um código de turma único.");
  err.status = 500;
  throw err;
};

const getTurmaForStudent = async (turmaId, { activeOnly = false } = {}) => {
  if (!turmaId) return null;
  const result = await pool.query(
    `SELECT id, student_type FROM turmas WHERE id = $1${
      activeOnly ? " AND active = TRUE" : ""
    }`,
    [turmaId]
  );
  if (result.rowCount > 0) return result.rows[0];

  const err = new Error(
    activeOnly ? "Turma não encontrada ou inativa." : "Turma não encontrada."
  );
  err.status = 400;
  throw err;
};

const resolveStudentTypeForTurma = async ({ role, studentType, turmaId }) => {
  if (role !== "aluno") return "normal";
  const turma = await getTurmaForStudent(turmaId);
  if (turma) return turma.student_type;
  return normalizeStudentType(studentType, role);
};

const publicUser = (user) => ({
  id: user.id,
  username: user.username,
  displayName: user.display_name,
  role: user.role,
  studentType: user.student_type || "normal",
  turmaId: user.turma_id || null,
  active: user.active,
  createdAt: user.created_at,
  updatedAt: user.updated_at,
});

const publicTurma = (turma) => ({
  id: turma.id,
  nome: turma.nome,
  code: turma.code,
  studentType: turma.student_type || "normal",
  scheduleDays: Array.isArray(turma.schedule_days)
    ? turma.schedule_days.map(Number)
    : DEFAULT_CLASS_DAYS,
  scheduleStartTime: formatScheduleTime(
    turma.schedule_start_time,
    DEFAULT_CLASS_START_TIME
  ),
  scheduleEndTime: formatScheduleTime(
    turma.schedule_end_time,
    DEFAULT_CLASS_END_TIME
  ),
  descricao: turma.descricao,
  active: turma.active,
  createdAt: turma.created_at,
  updatedAt: turma.updated_at,
});

const publicTypingSettings = (settings) => ({
  studentType: settings.student_type,
  passMinWpm: Number(settings.pass_min_wpm),
  passMinAccuracy: Number(settings.pass_min_accuracy),
  maxErrors: Number(settings.max_errors),
  updatedAt: settings.updated_at,
});

const publicTypingGameSettings = (settings) => ({
  studentType: settings.student_type,
  passMinWpm: Number(settings.pass_min_wpm),
  passMinAccuracy: Number(settings.pass_min_accuracy),
  maxLives: Number(settings.max_lives),
  gameSpeed: Number(settings.game_speed),
  gameSpeedBoost: Number(settings.game_speed_boost),
  updatedAt: settings.updated_at,
});

const publicExam = (exam) => ({
  id: exam.id,
  turmaId: exam.turma_id,
  title: exam.title,
  description: exam.description,
  containerInitialState: exam.container_initial_state,
  timeLimit: Number(exam.time_limit || 0),
  isPublished: exam.is_published,
  active: exam.active,
  createdAt: exam.created_at,
  updatedAt: exam.updated_at,
});

const publicExamQuestion = (q) => ({
  id: q.id,
  examId: q.exam_id,
  type: q.type,
  text: q.text,
  options: q.options,
  points: Number(q.points),
  timeLimit: Number(q.time_limit || 0),
  orderIndex: q.order_index,
});

const publicExamQuestionFull = (q) => ({
  ...publicExamQuestion(q),
  correctAnswer: q.correct_answer,
  validationRules: q.validation_rules,
});

const publicExamSubmission = (s) => ({
  id: s.id,
  examId: s.exam_id,
  userId: s.user_id,
  status: s.status,
  scoreMcq: Number(s.score_mcq),
  scorePractical: Number(s.score_practical),
  totalScore: Number(s.total_score),
  startedAt: s.started_at,
  completedAt: s.completed_at,
  username: s.username, // Se disponível via join
  displayName: s.student_display_name || s.display_name, // Se disponível via join
});

const publicExamApplication = (batch, items = []) => ({
  id: batch.id,
  mode: batch.mode,
  modeLabel:
    batch.mode === "balanced" ? "Distribuir versões" : "Todas para todos",
  totalRequested: Number(batch.total_requested || 0),
  totalCreated: Number(batch.total_created || 0),
  totalExisting: Number(batch.total_existing || 0),
  totalSkipped: Number(batch.total_skipped || 0),
  totalRemoved: Number(batch.total_removed || 0),
  totalRetained: Number(batch.total_retained || 0),
  createdAt: batch.created_at,
  cancelledAt: batch.cancelled_at,
  cancellationReason: batch.cancellation_reason || "",
  appliedBy: batch.applied_by
    ? {
        id: batch.applied_by,
        username: batch.applied_by_username,
        displayName: batch.applied_by_display_name,
      }
    : null,
  cancelledBy: batch.cancelled_by
    ? {
        id: batch.cancelled_by,
        username: batch.cancelled_by_username,
        displayName: batch.cancelled_by_display_name,
      }
    : null,
  items,
});

const publicExamApplicationItem = (item) => ({
  id: item.item_id,
  examId: item.exam_id,
  examTitle: item.exam_title,
  examTimeLimit: Number(item.exam_time_limit || 0),
  turmaName: item.turma_name,
  userId: item.user_id,
  username: item.username,
  displayName: item.display_name,
  assignmentStatus: item.assignment_status,
  reason: item.reason,
  removalStatus: item.removal_status || "active",
  removalReason: item.removal_reason || "",
  removedAt: item.removed_at,
  createdAt: item.item_created_at,
  submissionStatus: item.submission_status || "pending",
  scoreMcq: Number(item.score_mcq || 0),
  scorePractical: Number(item.score_practical || 0),
  totalScore: Number(item.total_score || 0),
  startedAt: item.started_at,
  completedAt: item.completed_at,
});

const publicAttendanceRecord = (record) => ({
  id: record.id,
  userId: record.user_id,
  attendanceDate:
    record.attendance_date instanceof Date
      ? record.attendance_date.toISOString().slice(0, 10)
      : String(record.attendance_date || ""),
  firstLoginAt: record.first_login_at,
  lastLoginAt: record.last_login_at,
  loginCount: Number(record.login_count || 0),
  username: record.username,
  displayName: record.display_name,
  turmaId: record.turma_id || null,
  turmaNome: record.turma_nome || "",
  classType: record.class_type || null,
});

const normalizeExamText = (value, fallback = "") =>
  String(value ?? fallback).trim();

const normalizeDateParam = (value) => {
  const text = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
};

const formatDateInAttendanceZone = (date) => {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: ATTENDANCE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );
  return `${values.year}-${values.month}-${values.day}`;
};

const getDefaultDateRange = () => {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 29);
  return {
    startDate: formatDateInAttendanceZone(startDate),
    endDate: formatDateInAttendanceZone(now),
  };
};

const getDateList = (startDate, endDate) => {
  const dates = [];
  const current = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
};

const getAttendanceTimeMinutes = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: ATTENDANCE_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );
  return Number(values.hour) * 60 + Number(values.minute);
};

const getStudentAttendanceSchedule = (student) => ({
  days: Array.isArray(student.schedule_days)
    ? student.schedule_days.map(Number)
    : [],
  startTime: formatScheduleTime(
    student.schedule_start_time,
    DEFAULT_CLASS_START_TIME
  ),
  endTime: formatScheduleTime(
    student.schedule_end_time,
    DEFAULT_CLASS_END_TIME
  ),
});

const getExpectedDatesForSchedule = (dates, schedule) =>
  dates.filter((date) => schedule.days.includes(getDateWeekday(date)));

const isRecordInsideSchedule = (record, schedule) => {
  if (!schedule.days.includes(getDateWeekday(record.attendanceDate)))
    return false;
  const startMinutes = timeToMinutes(schedule.startTime);
  const endMinutes = timeToMinutes(schedule.endTime);
  const firstLoginMinutes = getAttendanceTimeMinutes(record.firstLoginAt);
  const lastLoginMinutes = getAttendanceTimeMinutes(record.lastLoginAt);
  if (firstLoginMinutes == null || lastLoginMinutes == null) return false;
  return firstLoginMinutes <= endMinutes && lastLoginMinutes >= startMinutes;
};

const normalizeExamTimeLimit = (value) => clampInteger(value, 0, 0, 1440);

const normalizeQuestionPoints = (value) => clampInteger(value, 1, 0, 1000);

const normalizeExamQuestionType = (value) => {
  const type = String(value || "")
    .trim()
    .toLowerCase();
  if (!["mcq", "practical"].includes(type)) {
    const err = new Error("Tipo de questão inválido.");
    err.status = 400;
    throw err;
  }
  return type;
};

const normalizeQuestionOptions = (options) => {
  if (!Array.isArray(options)) return [];
  return options.map((option) => String(option || "").trim()).slice(0, 8);
};

const normalizeValidationRules = (rules) => {
  if (!Array.isArray(rules)) return [];

  return rules
    .map((rule) => ({
      type: String(rule?.type || "")
        .trim()
        .toUpperCase(),
      path: String(rule?.path || "").trim(),
      content: String(rule?.content || ""),
      name: String(rule?.name || "").trim(),
    }))
    .filter((rule) =>
      ["FILE_EXISTS", "FILE_CONTAINS", "ACTION_PERFORMED"].includes(rule.type)
    )
    .slice(0, 20);
};

const findSnapshotPath = (tree, cpath) => {
  if (!tree || typeof tree !== "object" || !cpath) return null;

  const segments = String(cpath)
    .split("\\")
    .filter(Boolean)
    .map((segment) => segment.trim().toLowerCase());

  if (segments.length === 0) return null;

  let current = null;
  const rootKey = Object.keys(tree).find(
    (key) => key.toLowerCase() === segments[0]
  );
  if (!rootKey) return null;
  current = tree[rootKey];

  for (let index = 1; index < segments.length; index++) {
    const children = current?.data;
    if (!children || typeof children !== "object") return null;
    const childKey = Object.keys(children).find(
      (key) => key.toLowerCase() === segments[index]
    );
    if (!childKey) return null;
    current = children[childKey];
  }

  return current || null;
};

const gradePracticalRules = (rules, practicalSnapshot = {}) => {
  const normalizedRules = normalizeValidationRules(rules);
  if (normalizedRules.length === 0) return false;

  const fileTree = practicalSnapshot.files || {};
  const actions = Array.isArray(practicalSnapshot.actions)
    ? practicalSnapshot.actions
    : [];

  return normalizedRules.every((rule) => {
    if (rule.type === "FILE_EXISTS") {
      return Boolean(findSnapshotPath(fileTree, rule.path));
    }

    if (rule.type === "FILE_CONTAINS") {
      const item = findSnapshotPath(fileTree, rule.path);
      return Boolean(
        item &&
          item.type !== "folder" &&
          typeof item.data === "string" &&
          item.data.includes(rule.content)
      );
    }

    if (rule.type === "ACTION_PERFORMED") {
      return actions.some((action) => action?.name === rule.name);
    }

    return false;
  });
};

const ensureExamAccess = async (
  client,
  user,
  examId,
  { forSubmit = false } = {}
) => {
  const examRes = await client.query("SELECT * FROM exams WHERE id = $1", [
    examId,
  ]);
  if (examRes.rowCount === 0) {
    const err = new Error("Prova não encontrada.");
    err.status = 404;
    throw err;
  }

  const exam = examRes.rows[0];
  if (user.role !== "aluno") return exam;

  if (!exam.active || !exam.is_published) {
    const err = new Error("Prova indisponível.");
    err.status = 403;
    throw err;
  }

  if (exam.turma_id && exam.turma_id !== user.turma_id) {
    const err = new Error("Acesso negado a esta prova.");
    err.status = 403;
    throw err;
  }

  if (forSubmit) {
    const assignmentRes = await client.query(
      "SELECT id FROM exam_assignments WHERE exam_id = $1 AND user_id = $2",
      [examId, user.id]
    );
    if (assignmentRes.rowCount === 0) {
      const err = new Error("Esta prova não foi atribuída ao aluno.");
      err.status = 403;
      throw err;
    }
  }

  return exam;
};

const hashPassword = (
  password,
  salt = crypto.randomBytes(16).toString("hex")
) => {
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return { salt, hash };
};

const verifyPassword = (password, salt, expectedHash) => {
  const { hash } = hashPassword(password, salt);
  return crypto.timingSafeEqual(
    Buffer.from(hash, "hex"),
    Buffer.from(expectedHash, "hex")
  );
};

const ensureDirectories = async () => {
  await fs.promises.mkdir(path.join(config.dataDir, "users"), {
    recursive: true,
  });
};

const loadBaseTree = () => {
  const tree = JSON.parse(fs.readFileSync(sourceTreePath, "utf8"));
  return tree;
};

const defaultHomeData = () => ({
  Desktop: {
    info: {
      spid: "%desktop%",
      icon: "desk",
    },
  },
  Documents: {
    info: {
      spid: "%documents%",
      icon: "docs",
    },
    data: {
      Cenários: {},
      Anotações: {},
    },
  },
  Downloads: {
    info: {
      spid: "%downloads%",
      icon: "down",
    },
  },
  Music: {
    info: {
      spid: "%music%",
      icon: "music",
    },
  },
  Pictures: {
    info: {
      spid: "%pictures%",
      icon: "pics",
    },
  },
  Videos: {
    info: {
      spid: "%videos%",
      icon: "vid",
    },
  },
  OneDrive: {
    type: "folder",
    name: "OneDrive",
    info: {
      spid: "%onedrive%",
      icon: "onedrive",
    },
  },
});

const userDir = (storageKey) => path.join(config.dataDir, "users", storageKey);
const diskPath = (storageKey) => path.join(userDir(storageKey), "disk.json");
const configPath = (storageKey) =>
  path.join(userDir(storageKey), "config.json");

const loadUserConfig = async (storageKey) => {
  const file = configPath(storageKey);
  try {
    const data = await fs.promises.readFile(file, "utf8");
    return JSON.parse(data);
  } catch {
    return null;
  }
};

const saveUserConfig = async (storageKey, config) => {
  const dir = userDir(storageKey);
  await fs.promises.mkdir(dir, { recursive: true });
  const file = configPath(storageKey);
  await fs.promises.writeFile(file, JSON.stringify(config, null, 2), "utf8");
};

const ensureUserDisk = async (user) => {
  const dir = userDir(user.storage_key);
  await fs.promises.mkdir(dir, { recursive: true });
  const file = diskPath(user.storage_key);
  try {
    await fs.promises.access(file, fs.constants.F_OK);
  } catch {
    await fs.promises.writeFile(
      file,
      JSON.stringify(defaultHomeData(), null, 2)
    );
  }
};

const getBuildVersion = async () => {
  const indexPath = path.join(buildDir, "index.html");
  try {
    const indexHtml = await fs.promises.readFile(indexPath);
    const fingerprint = crypto
      .createHash("sha256")
      .update(indexHtml)
      .digest("hex")
      .slice(0, 16);
    return config.appVersion
      ? `${config.appVersion}-${fingerprint}`
      : fingerprint;
  } catch {
    return config.appVersion || `${config.nodeEnv}-sem-build`;
  }
};

const syncAppBuildVersion = async () => {
  const version = await getBuildVersion();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const current = await client.query(
      "SELECT value FROM app_metadata WHERE key = $1 FOR UPDATE",
      ["app_build_version"]
    );

    if (current.rowCount > 0 && current.rows[0].value !== version) {
      await client.query("DELETE FROM sessions");
      console.log("Sessões resetadas após alteração da versão do app.");
    }

    await client.query(
      `INSERT INTO app_metadata (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key)
       DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      ["app_build_version", version]
    );
    await client.query("COMMIT");
    return version;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

const readUserHome = async (user, currentUsername) => {
  await ensureUserDisk(user);
  const raw = await fs.promises.readFile(diskPath(user.storage_key), "utf8");
  return {
    type: "folder",
    name: user.username,
    info: {
      icon: "user",
      ...(user.username === currentUsername ? { spid: "%user%" } : {}),
    },
    data: JSON.parse(raw),
  };
};

const writeUserHome = async (user, data) => {
  await ensureUserDisk(user);
  await fs.promises.writeFile(
    diskPath(user.storage_key),
    JSON.stringify(data || {}, null, 2)
  );
};

const buildVisibleTree = async (viewer) => {
  const tree = loadBaseTree();
  const usersFolder = tree["C:"].data.Users;
  const visibleUsers =
    viewer.role !== "aluno"
      ? await listUsers({ includeInactive: false })
      : [viewer];

  usersFolder.data = {
    Public: usersFolder.data.Public,
  };

  for (const user of visibleUsers) {
    usersFolder.data[user.username] = await readUserHome(user, viewer.username);
  }

  return tree;
};

const extractVisibleHomes = (tree) => tree?.["C:"]?.data?.Users?.data || {};

const listUsers = async ({ includeInactive = true } = {}) => {
  const result = await pool.query(
    `SELECT u.id, u.username, u.display_name, u.role,
            COALESCE(t.student_type, u.student_type) AS student_type,
            u.storage_key, u.turma_id, u.active, u.created_at, u.updated_at
     FROM users u
     LEFT JOIN turmas t ON t.id = u.turma_id
     ${includeInactive ? "" : "WHERE u.active = TRUE"}
     ORDER BY u.role DESC, u.username ASC`
  );
  return result.rows;
};

const normalizeExistingDisplayNames = async () => {
  const usersResult = await pool.query("SELECT id, display_name FROM users");
  let updatedUsers = 0;

  for (const user of usersResult.rows) {
    const normalized = normalizeDisplayName(user.display_name);
    if (normalized && normalized !== user.display_name) {
      await pool.query(
        "UPDATE users SET display_name = $1, updated_at = NOW() WHERE id = $2",
        [normalized, user.id]
      );
      updatedUsers += 1;
    }
  }

  const submissionsResult = await pool.query(
    `SELECT s.id, s.student_display_name, u.display_name
     FROM exam_submissions s
     JOIN users u ON u.id = s.user_id`
  );
  let updatedSubmissions = 0;

  for (const submission of submissionsResult.rows) {
    const normalized = normalizeDisplayName(
      submission.student_display_name || submission.display_name
    );
    if (normalized && normalized !== submission.student_display_name) {
      await pool.query(
        "UPDATE exam_submissions SET student_display_name = $1 WHERE id = $2",
        [normalized, submission.id]
      );
      updatedSubmissions += 1;
    }
  }

  if (updatedUsers > 0 || updatedSubmissions > 0) {
    console.log(
      `Nomes normalizados: ${updatedUsers} usuário(s), ${updatedSubmissions} submissão(ões).`
    );
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ensureDatabaseConnection = async () => {
  let lastError = null;
  for (let attempt = 1; attempt <= config.dbRetryAttempts; attempt++) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (error) {
      lastError = error;
      console.error(
        `Aguardando PostgreSQL (${attempt}/${config.dbRetryAttempts})...`
      );
      await sleep(config.dbRetryDelayMs);
    }
  }
  throw lastError;
};

const ensureSeedAdmin = async () => {
  if (!config.seedAdminEnabled) return;

  const result = await pool.query("SELECT COUNT(*)::int AS total FROM users");
  if (result.rows[0].total > 0) return;

  if (String(config.seedAdminPassword).length < 5) {
    throw new Error(
      "SEED_ADMIN_PASSWORD deve ter pelo menos 5 caracteres para inicialização automática."
    );
  }

  const user = await createUser({
    username: config.seedAdminUsername,
    displayName: config.seedAdminDisplayName,
    role: "professor",
    password: config.seedAdminPassword,
    allowShortPassword: true,
  });

  console.log(
    `Usuário inicial criado: ${user.username} com papel ${user.role}.`
  );
};

const requireAuth = async (req, res, next) => {
  const token = readCookie(req, config.cookieName);
  if (!token) return res.status(401).json({ error: "Sessão ausente." });

  const result = await pool.query(
    `SELECT u.id, u.username, u.display_name, u.role,
            COALESCE(t.student_type, u.student_type) AS student_type,
            u.storage_key, u.turma_id, u.active, u.created_at, u.updated_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     LEFT JOIN turmas t ON t.id = u.turma_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW() AND u.active = TRUE`,
    [hashToken(token)]
  );

  if (result.rowCount === 0) {
    return res.status(401).json({ error: "Sessão inválida ou expirada." });
  }

  req.user = result.rows[0];
  return next();
};

const requireProfessor = (req, res, next) => {
  if (req.user?.role === "professor") {
    return next();
  }
  if (req.user?.role === "secretaria" && req.method === "GET") {
    return next();
  }
  return res.status(403).json({
    error: "Acesso restrito a professores ou secretaria (apenas leitura).",
  });
};

const buildBookletCatalog = async () => {
  let moduleEntries = [];
  try {
    moduleEntries = await fs.promises.readdir(bookletLibraryDir, {
      withFileTypes: true,
    });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }

  const usedModuleIds = new Set();
  const modules = [];

  for (const moduleEntry of moduleEntries
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => compareBookletNames(a.name, b.name))) {
    const modulePath = path.join(bookletLibraryDir, moduleEntry.name);
    const moduleIdBase = normalizeBookletId(moduleEntry.name);
    let moduleId = moduleIdBase;
    if (usedModuleIds.has(moduleId)) {
      const hash = crypto
        .createHash("sha1")
        .update(moduleEntry.name)
        .digest("hex")
        .slice(0, 6);
      moduleId = `${moduleIdBase}-${hash}`;
    }
    usedModuleIds.add(moduleId);

    const fileEntries = await fs.promises.readdir(modulePath, {
      withFileTypes: true,
    });
    const usedFileIds = new Set();
    const files = [];

    for (const fileEntry of fileEntries
      .filter(
        (entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")
      )
      .sort((a, b) => compareBookletNames(a.name, b.name))) {
      const fileIdBase = normalizeBookletId(fileEntry.name);
      let fileId = fileIdBase;
      if (usedFileIds.has(fileId)) {
        const hash = crypto
          .createHash("sha1")
          .update(fileEntry.name)
          .digest("hex")
          .slice(0, 6);
        fileId = `${fileIdBase}-${hash}`;
      }
      usedFileIds.add(fileId);

      const filePath = path.join(modulePath, fileEntry.name);
      const stat = await fs.promises.stat(filePath);
      files.push({
        id: fileId,
        title: getBookletTitle(fileEntry.name),
        fileName: fileEntry.name,
        order: getBookletOrder(fileEntry.name),
        size: stat.size,
        url: `/api/booklets/modules/${encodeURIComponent(
          moduleId
        )}/files/${encodeURIComponent(fileId)}/pdf`,
        absolutePath: filePath,
      });
    }

    if (files.length === 0) continue;

    modules.push({
      id: moduleId,
      title: getBookletTitle(moduleEntry.name),
      folderName: moduleEntry.name,
      order: getBookletOrder(moduleEntry.name),
      totalFiles: files.length,
      files,
    });
  }

  return modules;
};

const getBookletCatalogWithAccess = async (user = null) => {
  const modules = await buildBookletCatalog();
  if (modules.length === 0) return [];

  const globalResult = await pool.query(
    "SELECT module_id, enabled FROM booklet_module_access WHERE module_id = ANY($1)",
    [modules.map((module) => module.id)]
  );
  const globalAccessMap = new Map(
    globalResult.rows.map((row) => [row.module_id, row.enabled])
  );

  let studentAccessMap = new Map();
  if (user?.role === "aluno") {
    const studentResult = await pool.query(
      `SELECT module_id, enabled
       FROM booklet_student_module_access
       WHERE user_id = $1 AND module_id = ANY($2)`,
      [user.id, modules.map((module) => module.id)]
    );
    studentAccessMap = new Map(
      studentResult.rows.map((row) => [row.module_id, row.enabled])
    );
  }

  return modules.map((module) => ({
    ...module,
    globalEnabled: globalAccessMap.get(module.id) === true,
    studentEnabled: studentAccessMap.get(module.id) === true,
    enabled:
      globalAccessMap.get(module.id) === true ||
      studentAccessMap.get(module.id) === true,
  }));
};

const publicBookletModule = (module, { includeFiles = true } = {}) => {
  const { absolutePath, ...safeModule } = module;
  const files = includeFiles
    ? module.files.map((file) => {
        const { absolutePath: filePath, ...safeFile } = file;
        return safeFile;
      })
    : [];

  return {
    ...safeModule,
    files,
  };
};

const findBookletFile = async (moduleId, fileId, user = null) => {
  const modules = await getBookletCatalogWithAccess(user);
  const module = modules.find((item) => item.id === moduleId);
  if (!module) return { module: null, file: null };
  const file = module.files.find((item) => item.id === fileId) || null;
  return { module, file };
};

const listBookletStudentAccess = async (turmaId = "") => {
  const values = [];
  let turmaFilter = "";

  if (turmaId) {
    values.push(turmaId);
    turmaFilter = "AND u.turma_id = $1";
  }

  const result = await pool.query(
    `SELECT u.id, u.username, u.display_name, u.turma_id,
            t.nome AS turma_nome,
            COALESCE(
              ARRAY_REMOVE(ARRAY_AGG(bsma.module_id ORDER BY bsma.module_id), NULL),
              ARRAY[]::TEXT[]
            ) AS module_ids
     FROM users u
     LEFT JOIN turmas t ON t.id = u.turma_id
     LEFT JOIN booklet_student_module_access bsma
       ON bsma.user_id = u.id AND bsma.enabled = TRUE
     WHERE u.role = 'aluno' AND u.active = TRUE ${turmaFilter}
     GROUP BY u.id, u.username, u.display_name, u.turma_id, t.nome
     ORDER BY t.nome ASC NULLS LAST, u.display_name ASC, u.username ASC`,
    values
  );

  return result.rows.map((student) => ({
    id: student.id,
    username: student.username,
    displayName: student.display_name,
    turmaId: student.turma_id,
    turmaNome: student.turma_nome || "Sem turma",
    moduleIds: student.module_ids || [],
  }));
};

const getTypingSettings = async (studentType) => {
  const normalized = normalizeTypingStudentType(studentType);
  const result = await pool.query(
    `SELECT student_type, pass_min_wpm, pass_min_accuracy, max_errors, updated_at
     FROM typing_settings
     WHERE student_type = $1`,
    [normalized]
  );
  if (result.rowCount > 0) return publicTypingSettings(result.rows[0]);

  const fallback = DEFAULT_TYPING_SETTINGS[normalized];
  return {
    ...fallback,
    updatedAt: null,
  };
};

const saveTypingSettings = async (studentType, payload) => {
  const normalized = normalizeTypingStudentType(studentType);
  const current = await getTypingSettings(normalized);
  const passMinWpm = clampInteger(
    payload.passMinWpm,
    current.passMinWpm,
    10,
    120
  );
  const passMinAccuracy = clampInteger(
    payload.passMinAccuracy,
    current.passMinAccuracy,
    50,
    100
  );
  const maxErrors = clampInteger(payload.maxErrors, current.maxErrors, 3, 10);

  const result = await pool.query(
    `INSERT INTO typing_settings (student_type, pass_min_wpm, pass_min_accuracy, max_errors, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (student_type)
     DO UPDATE SET
       pass_min_wpm = EXCLUDED.pass_min_wpm,
       pass_min_accuracy = EXCLUDED.pass_min_accuracy,
       max_errors = EXCLUDED.max_errors,
       updated_at = NOW()
     RETURNING student_type, pass_min_wpm, pass_min_accuracy, max_errors, updated_at`,
    [normalized, passMinWpm, passMinAccuracy, maxErrors]
  );

  return publicTypingSettings(result.rows[0]);
};

const writeTypingSettingsEvent = (res, settings) => {
  res.write("event: typing-settings\n");
  res.write(`data: ${JSON.stringify({ settings })}\n\n`);
};

const broadcastTypingSettings = (settings) => {
  for (const client of typingSettingsClients) {
    if (client.studentType !== settings.studentType) continue;
    try {
      writeTypingSettingsEvent(client.res, settings);
    } catch (error) {
      typingSettingsClients.delete(client);
    }
  }
};

const getTypingGameSettings = async (studentType) => {
  const normalized = normalizeTypingStudentType(studentType);
  const result = await pool.query(
    `SELECT student_type, pass_min_wpm, pass_min_accuracy, max_lives, game_speed, game_speed_boost, updated_at
     FROM typing_game_settings
     WHERE student_type = $1`,
    [normalized]
  );
  if (result.rowCount > 0) return publicTypingGameSettings(result.rows[0]);

  const fallback = DEFAULT_TYPING_GAME_SETTINGS[normalized];
  return {
    ...fallback,
    updatedAt: null,
  };
};

const saveTypingGameSettings = async (studentType, payload) => {
  const normalized = normalizeTypingStudentType(studentType);
  const current = await getTypingGameSettings(normalized);
  const passMinWpm = clampInteger(
    payload.passMinWpm,
    current.passMinWpm,
    10,
    120
  );
  const passMinAccuracy = clampInteger(
    payload.passMinAccuracy,
    current.passMinAccuracy,
    50,
    100
  );
  const maxLives = clampInteger(payload.maxLives, current.maxLives, 3, 10);
  const gameSpeed = clampInteger(payload.gameSpeed, current.gameSpeed, 0, 100);
  const gameSpeedBoost = clampInteger(
    payload.gameSpeedBoost,
    current.gameSpeedBoost,
    0,
    100
  );

  const result = await pool.query(
    `INSERT INTO typing_game_settings (student_type, pass_min_wpm, pass_min_accuracy, max_lives, game_speed, game_speed_boost, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (student_type)
     DO UPDATE SET
       pass_min_wpm = EXCLUDED.pass_min_wpm,
       pass_min_accuracy = EXCLUDED.pass_min_accuracy,
       max_lives = EXCLUDED.max_lives,
       game_speed = EXCLUDED.game_speed,
       game_speed_boost = EXCLUDED.game_speed_boost,
       updated_at = NOW()
     RETURNING student_type, pass_min_wpm, pass_min_accuracy, max_lives, game_speed, game_speed_boost, updated_at`,
    [
      normalized,
      passMinWpm,
      passMinAccuracy,
      maxLives,
      gameSpeed,
      gameSpeedBoost,
    ]
  );

  return publicTypingGameSettings(result.rows[0]);
};

const writeTypingGameSettingsEvent = (res, settings) => {
  res.write("event: typing-game-settings\n");
  res.write(`data: ${JSON.stringify({ settings })}\n\n`);
};

const broadcastTypingGameSettings = (settings) => {
  for (const client of typingGameSettingsClients) {
    if (client.studentType !== settings.studentType) continue;
    try {
      writeTypingGameSettingsEvent(client.res, settings);
    } catch (error) {
      typingGameSettingsClients.delete(client);
    }
  }
};

const writeUserNotificationEvent = (res, notification) => {
  res.write("event: user-notification\n");
  res.write(`data: ${JSON.stringify({ notification })}\n\n`);
};

const sendUserNotification = (userId, notification) => {
  const clients = notificationClients.get(userId);
  if (!clients) return;

  const payload = {
    id: notification.id || crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...notification,
  };

  for (const res of clients) {
    try {
      writeUserNotificationEvent(res, payload);
    } catch (error) {
      clients.delete(res);
    }
  }

  if (clients.size === 0) notificationClients.delete(userId);
};

const getOnlinePvpUsers = (viewer, overrideTurmaId) => {
  const turmaId =
    overrideTurmaId && viewer.role === "professor"
      ? String(overrideTurmaId)
      : String(viewer.turma_id);
  if (!turmaId || turmaId === "undefined" || turmaId === "null") return [];
  return Array.from(onlineUsers.values())
    .filter(
      (onlineUser) =>
        onlineUser.user.id !== viewer.id &&
        String(onlineUser.user.turma_id) === turmaId
    )
    .map((onlineUser) => publicUser(onlineUser.user));
};

const setSessionCookie = (req, res, token) => {
  const maxAge = config.sessionDays * 24 * 60 * 60;
  const secure = req.secure;
  res.setHeader(
    "Set-Cookie",
    `${config.cookieName}=${encodeURIComponent(
      token
    )}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${
      secure ? "; Secure" : ""
    }`
  );
};

const clearSessionCookie = (res) => {
  res.setHeader(
    "Set-Cookie",
    `${config.cookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`
  );
};

const recordAttendanceForLogin = async (userId) => {
  await pool.query(
    `INSERT INTO attendance_records
       (id, user_id, attendance_date, first_login_at, last_login_at, login_count, turma_id)
      SELECT
        $2,
        u.id,
        (NOW() AT TIME ZONE $3)::date,
        NOW(),
        NOW(),
        1,
        u.turma_id
      FROM users u
      JOIN turmas t ON t.id = u.turma_id
      WHERE u.id = $1 AND u.role = 'aluno'
        AND u.active = TRUE
        AND t.active = TRUE
        AND EXTRACT(DOW FROM NOW() AT TIME ZONE $3)::int = ANY(t.schedule_days)
        AND (NOW() AT TIME ZONE $3)::time >= t.schedule_start_time
        AND (NOW() AT TIME ZONE $3)::time <= t.schedule_end_time
      ON CONFLICT (user_id, attendance_date) DO NOTHING`,
    [userId, crypto.randomUUID(), ATTENDANCE_TIME_ZONE]
  );
};

const createSession = async (userId) => {
  await pool.query("DELETE FROM sessions WHERE user_id = $1", [userId]);
  sendUserNotification(userId, {
    type: "force_logout",
    title: "Sessão Encerrada",
    body: "Uma nova conexão foi detectada. Esta sessão foi encerrada.",
  });

  const token = crypto.randomBytes(32).toString("hex");
  await pool.query(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, NOW() + ($4::int * INTERVAL '1 day'))`,
    [crypto.randomUUID(), userId, hashToken(token), config.sessionDays]
  );
  await recordAttendanceForLogin(userId);
  return token;
};

const isUsernameAvailable = async (username) => {
  const normalized = normalizeUsername(username);
  if (!/^[a-z0-9._-]{3,32}$/.test(normalized)) {
    const err = new Error(
      "Usuário deve ter de 3 a 32 caracteres e usar apenas letras, números, ponto, hífen ou sublinhado."
    );
    err.status = 400;
    throw err;
  }
  const result = await pool.query("SELECT 1 FROM users WHERE username = $1", [
    normalized,
  ]);
  return {
    username: normalized,
    available: result.rowCount === 0,
  };
};

const createUser = async ({
  username,
  displayName,
  role,
  password,
  studentType = "normal",
  turmaId = null,
  allowShortPassword = false,
}) => {
  const normalized = normalizeUsername(username);
  if (!/^[a-z0-9._-]{3,32}$/.test(normalized)) {
    const err = new Error(
      "Usuário deve ter de 3 a 32 caracteres e usar apenas letras, números, ponto, hífen ou sublinhado."
    );
    err.status = 400;
    throw err;
  }
  const availability = await isUsernameAvailable(normalized);
  if (!availability.available) {
    const err = new Error("Já existe um usuário com esse nome.");
    err.status = 409;
    throw err;
  }
  if (!["aluno", "professor", "secretaria"].includes(role)) {
    const err = new Error("Grupo inválido.");
    err.status = 400;
    throw err;
  }
  const normalizedStudentType = await resolveStudentTypeForTurma({
    role,
    studentType,
    turmaId,
  });
  const minPasswordLength = allowShortPassword ? 5 : 8;
  if (!password || String(password).length < minPasswordLength) {
    const err = new Error("Senha deve ter pelo menos 8 caracteres.");
    err.status = 400;
    throw err;
  }

  const { salt, hash } = hashPassword(password);
  const id = crypto.randomUUID();
  const result = await pool.query(
    `INSERT INTO users (id, username, display_name, role, student_type, password_salt, password_hash, storage_key, turma_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, username, display_name, role, student_type, storage_key, turma_id, active, created_at, updated_at`,
    [
      id,
      normalized,
      normalizeDisplayName(String(displayName || normalized)),
      role,
      normalizedStudentType,
      salt,
      hash,
      id,
      role === "aluno" ? turmaId || null : null,
    ]
  );
  await ensureUserDisk(result.rows[0]);
  return result.rows[0];
};

// ===== Composicao das rotas por dominio =====
// Cada modulo registra suas rotas recebendo o contexto compartilhado.
const routeContext = {
  ATTENDANCE_TIME_ZONE,
  DEFAULT_CLASS_DAYS,
  DEFAULT_CLASS_END_TIME,
  DEFAULT_CLASS_START_TIME,
  DEFAULT_TYPING_GAME_SETTINGS,
  DEFAULT_TYPING_SETTINGS,
  app,
  bookletLibraryDir,
  broadcastTypingGameSettings,
  broadcastTypingSettings,
  buildBookletCatalog,
  buildDir,
  buildVisibleTree,
  clampInteger,
  clearSessionCookie,
  compareBookletNames,
  config,
  configPath,
  createSession,
  createUser,
  defaultHomeData,
  diskPath,
  ensureDatabaseConnection,
  ensureDirectories,
  ensureExamAccess,
  ensureSeedAdmin,
  ensureTurmaCode,
  ensureUserDisk,
  extractVisibleHomes,
  findBookletFile,
  findSnapshotPath,
  formatDateInAttendanceZone,
  formatScheduleTime,
  generateTurmaCode,
  getAttendanceTimeMinutes,
  getBookletCatalogWithAccess,
  getBookletOrder,
  getBookletTitle,
  getBuildVersion,
  getDateList,
  getDateWeekday,
  getDefaultDateRange,
  getExpectedDatesForSchedule,
  getOnlinePvpUsers,
  getStudentAttendanceSchedule,
  getTurmaForStudent,
  getTypingGameSettings,
  getTypingSettings,
  gradePracticalRules,
  hashPassword,
  hashToken,
  isRecordInsideSchedule,
  isUsernameAvailable,
  listBookletStudentAccess,
  listUsers,
  loadBaseTree,
  loadUserConfig,
  normalizeBookletId,
  normalizeClassSchedule,
  normalizeClassStudentType,
  normalizeDateParam,
  normalizeDisplayName,
  normalizeExamQuestionType,
  normalizeExamText,
  normalizeExamTimeLimit,
  normalizeExistingDisplayNames,
  normalizeQuestionOptions,
  normalizeQuestionPoints,
  normalizeScheduleDays,
  normalizeScheduleTime,
  normalizeStudentType,
  normalizeTurmaCode,
  normalizeTypingStudentType,
  normalizeUsername,
  normalizeValidationRules,
  notificationClients,
  onlineUsers,
  pool,
  publicAttendanceRecord,
  publicBookletModule,
  publicExam,
  publicExamApplication,
  publicExamApplicationItem,
  publicExamQuestion,
  publicExamQuestionFull,
  publicExamSubmission,
  publicTurma,
  publicTypingGameSettings,
  publicTypingSettings,
  publicUser,
  readCookie,
  readUserHome,
  recordAttendanceForLogin,
  requireAuth,
  requireProfessor,
  resolveStudentTypeForTurma,
  rootDir,
  saveTypingGameSettings,
  saveTypingSettings,
  saveUserConfig,
  sendUserNotification,
  setSessionCookie,
  sleep,
  sourceTreePath,
  syncAppBuildVersion,
  timeToMinutes,
  typingGameSettingsClients,
  typingSettingsClients,
  userDir,
  verifyPassword,
  writeTypingGameSettingsEvent,
  writeTypingSettingsEvent,
  writeUserHome,
  writeUserNotificationEvent,
};

require("./routes/edgeProxy.cjs")(routeContext);
require("./routes/auth.cjs")(routeContext);
require("./routes/users.cjs")(routeContext);
require("./routes/booklets.cjs")(routeContext);
require("./routes/gestor.cjs")(routeContext);
require("./routes/attendance.cjs")(routeContext);
require("./routes/fs.cjs")(routeContext);
require("./routes/turmas.cjs")(routeContext);
require("./routes/typing.cjs")(routeContext);
require("./routes/exams.cjs")(routeContext);
require("./routes/lessons.cjs")(routeContext);
require("./routes/pcBuilder.cjs")(routeContext);
require("./routes/notifications.cjs")(routeContext);
require("./routes/chat.cjs")(routeContext);
require("./routes/imagegen.cjs")(routeContext);

const { injectPvpRoutes } = require("./typingPvp.cjs");
injectPvpRoutes(
  app,
  requireAuth,
  publicUser,
  pool,
  sendUserNotification,
  getOnlinePvpUsers
);

app.use("/api", (req, res) => {
  res.status(404).json({ error: "Endpoint não encontrado." });
});

app.use(
  express.static(buildDir, {
    setHeaders: (res, filePath) => {
      if (
        filePath.endsWith("index.html") ||
        filePath.endsWith("sw.js") ||
        filePath.includes("workbox-")
      ) {
        res.setHeader("Cache-Control", "no-store");
      }
    },
  })
);
app.get(/.*/, (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.sendFile(path.join(buildDir, "index.html"));
});

app.use((error, req, res, next) => {
  if (error.code === "23505") {
    return res.status(409).json({ error: "Usuário já existe." });
  }
  const status = error.status || 500;
  const message = status >= 500 ? "Erro interno do servidor." : error.message;
  if (status >= 500) console.error(error);
  return res.status(status).json({ error: message });
});

const start = async () => {
  await ensureDirectories();
  await ensureDatabaseConnection();
  await runMigrations(pool);
  await normalizeExistingDisplayNames();
  await syncAppBuildVersion();
  await ensureSeedAdmin();
  app.listen(config.port, () => {
    console.log(`Servidor iniciado na porta ${config.port}`);
  });
};

if (require.main === module) {
  start().catch((error) => {
    console.error("Falha ao iniciar servidor.", error);
    process.exit(1);
  });
}

module.exports = { app, start };
