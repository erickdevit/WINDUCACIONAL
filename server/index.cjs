const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const { Pool } = require("pg");

const rootDir = path.resolve(__dirname, "..");
const buildDir = path.join(rootDir, "build");
const schemaPath = path.join(__dirname, "db", "schema.sql");
const sourceTreePath = path.join(rootDir, "src", "reducers", "dir.json");

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
app.use(express.json({ limit: "1mb" }));

// Edge browser proxy - remove X-Frame-Options to allow Google/YouTube in iframe
app.get("/api/edge-proxy", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ error: "URL não fornecida" });
  }

  try {
    const parsedUrl = new URL(targetUrl);
    const isAllowed =
      parsedUrl.hostname.includes("google") ||
      parsedUrl.hostname.includes("youtube");

    if (!isAllowed) {
      return res.status(403).json({ error: "Domínio não permitido" });
    }

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": req.headers["user-agent"] || "Mozilla/5.0",
        Accept: req.headers["accept"] || "text/html,application/xhtml+xml",
      },
    });

    const headers = new Headers(response.headers);
    headers.delete("x-frame-options");
    headers.delete("X-Frame-Options");
    headers.delete("content-security-policy");
    headers.delete("Content-Security-Policy");

    res.set({
      "Content-Type": response.headers.get("Content-Type") || "text/html",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Frame-Options": "ALLOWALL",
    });

    const body = await response.text();
    res.send(body);
  } catch (err) {
    console.error("Edge proxy error:", err.message);
    res.status(502).json({ error: "Falha ao carregar a página" });
  }
});

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
  if (!["kids", "normal"].includes(normalized)) {
    const err = new Error("Tipo de turma inválido.");
    err.status = 400;
    throw err;
  }
  return normalized;
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
  displayName: s.display_name, // Se disponível via join
});

const publicExamApplication = (batch, items = []) => ({
  id: batch.id,
  mode: batch.mode,
  modeLabel: batch.mode === "balanced" ? "Distribuir versões" : "Todas para todos",
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

const normalizeExamText = (value, fallback = "") =>
  String(value ?? fallback).trim();

const normalizeExamTimeLimit = (value) => clampInteger(value, 0, 0, 1440);

const normalizeQuestionPoints = (value) => clampInteger(value, 1, 0, 1000);

const normalizeExamQuestionType = (value) => {
  const type = String(value || "").trim().toLowerCase();
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
      type: String(rule?.type || "").trim().toUpperCase(),
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

const ensureExamAccess = async (client, user, examId, { forSubmit = false } = {}) => {
  const examRes = await client.query("SELECT * FROM exams WHERE id = $1", [
    examId,
  ]);
  if (examRes.rowCount === 0) {
    const err = new Error("Prova não encontrada.");
    err.status = 404;
    throw err;
  }

  const exam = examRes.rows[0];
  if (user.role === "professor") return exam;

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
  const users = tree["C:"]?.data?.Users;
  if (users?.data?.Blue) {
    delete users.data.Blue;
  }
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
const configPath = (storageKey) => path.join(userDir(storageKey), "config.json");

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
    viewer.role === "professor"
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
  if (req.user?.role !== "professor") {
    return res.status(403).json({ error: "Acesso restrito a professores." });
  }
  return next();
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

const getOnlinePvpUsers = (viewer) => {
  if (!viewer?.turma_id) return [];
  return Array.from(onlineUsers.values())
    .filter(
      (onlineUser) =>
        onlineUser.user.id !== viewer.id &&
        onlineUser.user.role === "aluno" &&
        onlineUser.user.turma_id === viewer.turma_id
    )
    .map((onlineUser) => publicUser(onlineUser.user));
};

const setSessionCookie = (res, token) => {
  const maxAge = config.sessionDays * 24 * 60 * 60;
  const secure = config.nodeEnv === "production";
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
  if (!["aluno", "professor"].includes(role)) {
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
      String(displayName || normalized).trim(),
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

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch (error) {
    res.status(503).json({ ok: false, error: "Banco de dados indisponível." });
  }
});

app.get("/api/app/version", async (req, res, next) => {
  try {
    const version = await syncAppBuildVersion();
    res.setHeader("Cache-Control", "no-store");
    res.json({ version });
  } catch (error) {
    next(error);
  }
});

app.get("/api/bootstrap/status", async (req, res) => {
  const result = await pool.query("SELECT COUNT(*)::int AS total FROM users");
  res.json({
    needsBootstrap: result.rows[0].total === 0,
    requiresToken:
      config.nodeEnv === "production" || Boolean(config.bootstrapToken),
  });
});

app.post("/api/bootstrap", async (req, res, next) => {
  try {
    const count = await pool.query("SELECT COUNT(*)::int AS total FROM users");
    if (count.rows[0].total > 0) {
      return res.status(409).json({ error: "Bootstrap já foi concluído." });
    }
    if (
      (config.nodeEnv === "production" || config.bootstrapToken) &&
      req.body.token !== config.bootstrapToken
    ) {
      return res.status(403).json({ error: "Token de bootstrap inválido." });
    }

    const user = await createUser({
      username: req.body.username,
      displayName: req.body.displayName,
      role: "professor",
      password: req.body.password,
    });
    const token = await createSession(user.id);
    setSessionCookie(res, token);
    return res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.post("/api/auth/login", async (req, res) => {
  const username = normalizeUsername(req.body.username);
  const result = await pool.query(
    `SELECT u.id, u.username, u.display_name, u.role,
            COALESCE(t.student_type, u.student_type) AS student_type,
            u.password_salt, u.password_hash, u.storage_key, u.turma_id,
            u.active, u.created_at, u.updated_at
     FROM users u
     LEFT JOIN turmas t ON t.id = u.turma_id
     WHERE u.username = $1 AND u.active = TRUE`,
    [username]
  );

  if (result.rowCount === 0) {
    return res.status(401).json({ error: "Usuário ou senha inválidos." });
  }

  const user = result.rows[0];
  if (
    !verifyPassword(
      req.body.password || "",
      user.password_salt,
      user.password_hash
    )
  ) {
    return res.status(401).json({ error: "Usuário ou senha inválidos." });
  }

  const token = await createSession(user.id);
  setSessionCookie(res, token);
  res.json({ user: publicUser(user) });
});

app.post("/api/auth/register", async (req, res, next) => {
  try {
    const turmaCode = normalizeTurmaCode(req.body.turmaCode);
    if (!turmaCode || !/^[A-Z0-9]{6}$/.test(turmaCode)) {
      return res
        .status(400)
        .json({ error: "Informe um código de turma válido com 6 caracteres." });
    }

    const turmaResult = await pool.query(
      "SELECT id, student_type FROM turmas WHERE code = $1 AND active = TRUE",
      [turmaCode]
    );
    if (turmaResult.rowCount === 0) {
      return res
        .status(404)
        .json({ error: "Código de turma não encontrado ou inativo." });
    }

    const user = await createUser({
      username: req.body.username,
      displayName: req.body.displayName,
      role: "aluno",
      studentType: turmaResult.rows[0].student_type,
      turmaId: turmaResult.rows[0].id,
      password: req.body.password,
    });
    const token = await createSession(user.id);
    setSessionCookie(res, token);
    res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    if (error.code === "23505") {
      return res
        .status(409)
        .json({ error: "Já existe um usuário com esse nome." });
    }
    next(error);
  }
});

app.post("/api/auth/logout", requireAuth, async (req, res) => {
  const token = readCookie(req, config.cookieName);
  await pool.query("DELETE FROM sessions WHERE token_hash = $1", [
    hashToken(token),
  ]);
  clearSessionCookie(res);
  res.status(204).end();
});

app.get(
  "/api/users/username/:username/availability",
  async (req, res, next) => {
    try {
      const result = await isUsernameAvailable(req.params.username);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

app.get("/api/users", requireAuth, requireProfessor, async (req, res) => {
  const users = await listUsers();
  res.json({ users: users.map(publicUser) });
});

// --- Endpoints de Gestão de Sessões ---

app.get("/api/gestor/sessions", requireAuth, requireProfessor, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT s.id as session_id, s.created_at as login_at,
              u.id as user_id, u.username, u.display_name,
              t.id as turma_id, t.nome as turma_nome
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN turmas t ON t.id = u.turma_id
       WHERE u.role = 'aluno' AND s.expires_at > NOW()
       ORDER BY t.nome ASC, u.username ASC`
    );

    res.json({
      sessions: result.rows.map(row => ({
        sessionId: row.session_id,
        loginAt: row.login_at,
        userId: row.user_id,
        username: row.username,
        displayName: row.display_name,
        turmaId: row.turma_id,
        turmaNome: row.turma_nome
      }))
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/gestor/sessions/logout", requireAuth, requireProfessor, async (req, res, next) => {
  try {
    const { target, turmaId, userId } = req.body;

    if (target === "all") {
      const result = await pool.query(
        "SELECT DISTINCT user_id FROM sessions WHERE user_id IN (SELECT id FROM users WHERE role = 'aluno')"
      );
      await pool.query(
        `DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE role = 'aluno')`
      );
      result.rows.forEach((row) => {
        sendUserNotification(row.user_id, {
          type: "force_logout",
          title: "Sessão Encerrada",
          body: "Sua sessão foi encerrada por um administrador.",
        });
      });
    } else if (target === "turma" && turmaId) {
      const result = await pool.query(
        "SELECT DISTINCT user_id FROM sessions WHERE user_id IN (SELECT id FROM users WHERE turma_id = $1)",
        [turmaId]
      );
      await pool.query(
        `DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE turma_id = $1)`,
        [turmaId]
      );
      result.rows.forEach((row) => {
        sendUserNotification(row.user_id, {
          type: "force_logout",
          title: "Sessão Encerrada",
          body: "Sua sessão foi encerrada por um administrador.",
        });
      });
    } else if (target === "user" && userId) {
      await pool.query(`DELETE FROM sessions WHERE user_id = $1`, [userId]);
      sendUserNotification(userId, {
        type: "force_logout",
        title: "Sessão Encerrada",
        body: "Sua sessão foi encerrada por um administrador.",
      });
    } else {
      return res.status(400).json({ error: "Alvo de logout inválido ou incompleto." });
    }

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.post(
  "/api/users",
  requireAuth,
  requireProfessor,
  async (req, res, next) => {
    try {
      const user = await createUser(req.body);
      res.status(201).json({ user: publicUser(user) });
    } catch (error) {
      next(error);
    }
  }
);

app.patch(
  "/api/users/:id",
  requireAuth,
  requireProfessor,
  async (req, res, next) => {
    try {
      const currentResult = await pool.query(
        "SELECT id, role, student_type, turma_id, active FROM users WHERE id = $1",
        [req.params.id]
      );
      if (currentResult.rowCount === 0)
        return res.status(404).json({ error: "Usuário não encontrado." });
      const targetUser = currentResult.rows[0];

      const wouldRemoveActiveProfessor =
        targetUser.role === "professor" &&
        targetUser.active === true &&
        (req.body.role === "aluno" || req.body.active === false);

      if (wouldRemoveActiveProfessor) {
        const professorCount = await pool.query(
          "SELECT COUNT(*)::int AS total FROM users WHERE role = 'professor' AND active = TRUE AND id <> $1",
          [req.params.id]
        );
        if (professorCount.rows[0].total === 0) {
          return res
            .status(400)
            .json({ error: "Deve existir pelo menos um professor ativo." });
        }
      }

      const updates = [];
      const values = [];
      const add = (field, value) => {
        values.push(value);
        updates.push(`${field} = $${values.length}`);
      };

      if (req.body.displayName != null)
        add("display_name", String(req.body.displayName).trim());
      let nextRole = targetUser.role;
      let nextTurmaId = targetUser.turma_id;
      if (req.body.role != null) {
        if (!["aluno", "professor"].includes(req.body.role)) {
          return res.status(400).json({ error: "Grupo inválido." });
        }
        nextRole = req.body.role;
        add("role", req.body.role);
      }
      if (req.body.turmaId !== undefined || req.body.role === "professor") {
        nextTurmaId = nextRole === "aluno" ? req.body.turmaId || null : null;
        add("turma_id", nextTurmaId);
      }
      if (
        req.body.studentType !== undefined ||
        req.body.turmaId !== undefined ||
        req.body.role !== undefined
      ) {
        const nextStudentType = await resolveStudentTypeForTurma({
          role: nextRole,
          studentType:
            req.body.studentType !== undefined
              ? req.body.studentType
              : targetUser.student_type,
          turmaId: nextTurmaId,
        });
        add("student_type", nextStudentType);
      }
      if (req.body.active != null) {
        add("active", Boolean(req.body.active));
      }
      if (req.body.password) {
        if (String(req.body.password).length < 8) {
          return res
            .status(400)
            .json({ error: "Senha deve ter pelo menos 8 caracteres." });
        }
        const { salt, hash } = hashPassword(req.body.password);
        add("password_salt", salt);
        add("password_hash", hash);
      }

      if (updates.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Nenhuma alteração enviada." });
      }

      add("updated_at", new Date());
      values.push(req.params.id);
      const result = await pool.query(
        `UPDATE users SET ${updates.join(", ")}
       WHERE id = $${values.length}
       RETURNING id, username, display_name, role, student_type, storage_key, turma_id, active, created_at, updated_at`,
        values
      );
      return res.json({ user: publicUser(result.rows[0]) });
    } catch (error) {
      return next(error);
    }
  }
);

app.get("/api/fs/tree", requireAuth, async (req, res, next) => {
  try {
    const tree = await buildVisibleTree(req.user);
    res.json({ tree });
  } catch (error) {
    next(error);
  }
});

app.put("/api/fs/tree", requireAuth, async (req, res, next) => {
  try {
    const usersData = extractVisibleHomes(req.body.tree);
    if (!usersData)
      return res.status(400).json({ error: "Árvore de arquivos inválida." });

    if (req.user.role === "professor") {
      const users = await listUsers({ includeInactive: false });
      for (const user of users) {
        if (usersData[user.username]?.data) {
          await writeUserHome(user, usersData[user.username].data);
        }
      }
    } else {
      const ownHome = usersData[req.user.username];
      if (!ownHome?.data)
        return res.status(403).json({ error: "Disco do usuário ausente." });
      await writeUserHome(req.user, ownHome.data);
    }

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

// --- Endpoints de Configurações do Usuário ---

app.get("/api/user/config", requireAuth, async (req, res, next) => {
  try {
    const config = await loadUserConfig(req.user.storage_key);
    res.json({ config: config || {} });
  } catch (error) {
    next(error);
  }
});

app.put("/api/user/config", requireAuth, async (req, res, next) => {
  try {
    const config = req.body.config;
    if (!config || typeof config !== "object") {
      return res.status(400).json({ error: "Configuração inválida." });
    }
    await saveUserConfig(req.user.storage_key, config);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

// --- Endpoints de Turmas ---

app.get(
  "/api/turmas",
  requireAuth,
  requireProfessor,
  async (req, res, next) => {
    try {
      const studentType = req.query.studentType;
      let query = `SELECT id, nome, code, student_type, descricao, active, created_at, updated_at FROM turmas`;
      const values = [];

      if (studentType === "kids" || studentType === "normal") {
        query += ` WHERE student_type = $1`;
        values.push(studentType);
      }

      query += ` ORDER BY nome ASC`;
      const result = await pool.query(query, values);
      res.json({ turmas: result.rows.map(publicTurma) });
    } catch (error) {
      next(error);
    }
  }
);

app.post(
  "/api/turmas",
  requireAuth,
  requireProfessor,
  async (req, res, next) => {
    try {
      const nome = String(req.body.nome || "").trim();
      if (!nome || nome.length < 2) {
        return res
          .status(400)
          .json({ error: "Nome da turma deve ter pelo menos 2 caracteres." });
      }
      const studentType = normalizeClassStudentType(req.body.studentType);
      const descricao = String(req.body.descricao || "").trim();
      const code = await ensureTurmaCode(req.body.code);
      const id = crypto.randomUUID();
      const result = await pool.query(
        `INSERT INTO turmas (id, nome, code, student_type, descricao) VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nome, code, student_type, descricao, active, created_at, updated_at`,
        [id, nome, code, studentType, descricao]
      );
      res.status(201).json({ turma: publicTurma(result.rows[0]) });
    } catch (error) {
      if (error.code === "23505") {
        return res
          .status(409)
          .json({ error: "Já existe uma turma com esse nome ou código." });
      }
      next(error);
    }
  }
);

app.patch(
  "/api/turmas/:id",
  requireAuth,
  requireProfessor,
  async (req, res, next) => {
    let client;
    try {
      client = await pool.connect();
      await client.query("BEGIN");
      const updates = [];
      const values = [];
      const add = (field, value) => {
        values.push(value);
        updates.push(`${field} = $${values.length}`);
      };

      if (req.body.nome != null) {
        const nome = String(req.body.nome).trim();
        if (nome.length < 2) {
          await client.query("ROLLBACK");
          return res
            .status(400)
            .json({ error: "Nome da turma deve ter pelo menos 2 caracteres." });
        }
        add("nome", nome);
      }
      let nextStudentType = null;
      if (req.body.studentType != null) {
        nextStudentType = normalizeClassStudentType(req.body.studentType);
        add("student_type", nextStudentType);
      }
      if (req.body.descricao != null)
        add("descricao", String(req.body.descricao).trim());
      if (req.body.active != null) add("active", Boolean(req.body.active));

      if (updates.length === 0) {
        return res.status(400).json({ error: "Nenhuma alteração enviada." });
      }

      add("updated_at", new Date());
      values.push(req.params.id);
      const result = await client.query(
        `UPDATE turmas SET ${updates.join(", ")} WHERE id = $${values.length}
       RETURNING id, nome, code, student_type, descricao, active, created_at, updated_at`,
        values
      );
      if (result.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Turma não encontrada." });
      }

      if (nextStudentType) {
        await client.query(
          "UPDATE users SET student_type = $1, updated_at = NOW() WHERE role = 'aluno' AND turma_id = $2",
          [nextStudentType, req.params.id]
        );
      }

      await client.query("COMMIT");
      res.json({ turma: publicTurma(result.rows[0]) });
    } catch (error) {
      await client?.query("ROLLBACK").catch(() => {});
      if (error.code === "23505") {
        return res
          .status(409)
          .json({ error: "Já existe uma turma com esse nome ou código." });
      }
      next(error);
    } finally {
      client?.release();
    }
  }
);

app.delete(
  "/api/turmas/:id",
  requireAuth,
  requireProfessor,
  async (req, res, next) => {
    try {
      // Desvincular usuários da turma antes de excluir
      await pool.query("UPDATE users SET turma_id = NULL WHERE turma_id = $1", [
        req.params.id,
      ]);
      const result = await pool.query("DELETE FROM turmas WHERE id = $1", [
        req.params.id,
      ]);
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Turma não encontrada." });
      }
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }
);

// --- Endpoints de Digitação ---

app.get("/api/typing/settings/events", requireAuth, async (req, res, next) => {
  try {
    const studentType =
      req.user.role === "professor"
        ? normalizeTypingStudentType(req.query.studentType)
        : req.user.student_type;
    const settings = await getTypingSettings(studentType);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    const client = {
      studentType,
      res,
    };
    typingSettingsClients.add(client);
    writeTypingSettingsEvent(res, settings);

    const heartbeat = setInterval(() => {
      res.write(": keep-alive\n\n");
    }, 25000);

    req.on("close", () => {
      clearInterval(heartbeat);
      typingSettingsClients.delete(client);
    });
  } catch (error) {
    next(error);
  }
});

app.get(
  "/api/typing/settings/:studentType",
  requireAuth,
  async (req, res, next) => {
    try {
      const studentType = normalizeTypingStudentType(req.params.studentType);
      if (
        req.user.role !== "professor" &&
        req.user.student_type !== studentType
      ) {
        return res.status(403).json({
          error: "Configuração de digitação restrita ao tipo do aluno.",
        });
      }

      const settings = await getTypingSettings(studentType);
      return res.json({ settings });
    } catch (error) {
      return next(error);
    }
  }
);

app.put(
  "/api/typing/settings/:studentType",
  requireAuth,
  requireProfessor,
  async (req, res, next) => {
    try {
      const settings = await saveTypingSettings(
        req.params.studentType,
        req.body || {}
      );
      broadcastTypingSettings(settings);
      return res.json({ settings });
    } catch (error) {
      return next(error);
    }
  }
);

// --- Endpoints de Avaliação (Exams) ---

app.get("/api/exams", requireAuth, async (req, res, next) => {
  try {
    let result;
    if (req.user.role === "professor") {
      result = await pool.query(
        "SELECT * FROM exams ORDER BY created_at DESC"
      );
      res.json({ exams: result.rows.map(publicExam) });
    } else {
      result = await pool.query(
        `SELECT e.*, s.status AS submission_status
         FROM exams e
         JOIN exam_assignments ea ON e.id = ea.exam_id
         LEFT JOIN exam_submissions s
           ON s.exam_id = e.id AND s.user_id = ea.user_id
         WHERE ea.user_id = $1 AND e.active = TRUE AND e.is_published = TRUE
         ORDER BY e.created_at DESC`,
        [req.user.id]
      );
      res.json({
        exams: result.rows.map((row) => ({
          ...publicExam(row),
          submissionStatus: row.submission_status || "pending",
        })),
      });
    }
  } catch (error) {
    next(error);
  }
});

app.get("/api/exams/analytics", requireAuth, requireProfessor, async (req, res, next) => {
  try {
    const statsRes = await pool.query(`
      SELECT 
        COUNT(s.id) FILTER (WHERE s.status = 'completed') as completed_submissions,
        COUNT(ea.id) as assigned_submissions,
        AVG(s.total_score) FILTER (WHERE s.status = 'completed') as average_score
      FROM exam_assignments ea
      LEFT JOIN exam_submissions s
        ON s.exam_id = ea.exam_id AND s.user_id = ea.user_id
    `);
    
    const byTurmaRes = await pool.query(`
      SELECT 
        t.nome as name,
        AVG(s.total_score) as avg,
        COUNT(s.id) as count
      FROM exam_submissions s
      JOIN exams e ON e.id = s.exam_id
      JOIN turmas t ON t.id = e.turma_id
      WHERE s.status = 'completed'
      GROUP BY t.id, t.nome
    `);

    const stats = statsRes.rows[0];
    const assignedCount = Number(stats.assigned_submissions || 0);
    const completedCount = Number(stats.completed_submissions || 0);
    res.json({
      totalSubmissions: completedCount,
      averageScore: parseFloat(stats.average_score || 0).toFixed(1),
      completionRate:
        assignedCount > 0 ? Math.round((completedCount / assignedCount) * 100) : 0,
      byTurma: byTurmaRes.rows.map(r => ({
        name: r.name,
        avg: parseFloat(r.avg || 0).toFixed(1),
        count: parseInt(r.count)
      }))
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/exams/applications", requireAuth, requireProfessor, async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        b.id,
        b.mode,
        b.total_requested,
        b.total_created,
        b.total_existing,
        b.total_skipped,
        b.total_removed,
        b.total_retained,
        b.cancelled_at,
        b.cancellation_reason,
        b.created_at,
        teacher.id as applied_by,
        teacher.username as applied_by_username,
        teacher.display_name as applied_by_display_name,
        canceller.id as cancelled_by,
        canceller.username as cancelled_by_username,
        canceller.display_name as cancelled_by_display_name,
        i.id as item_id,
        i.exam_id,
        i.user_id,
        i.status as assignment_status,
        i.removal_status,
        i.removal_reason,
        i.removed_at,
        i.reason,
        i.created_at as item_created_at,
        e.title as exam_title,
        e.time_limit as exam_time_limit,
        t.nome as turma_name,
        student.username,
        student.display_name,
        s.status as submission_status,
        s.score_mcq,
        s.score_practical,
        s.total_score,
        s.started_at,
        s.completed_at
      FROM (
        SELECT *
        FROM exam_application_batches
        ORDER BY created_at DESC
        LIMIT 50
      ) b
      LEFT JOIN users teacher ON teacher.id = b.applied_by
      LEFT JOIN users canceller ON canceller.id = b.cancelled_by
      LEFT JOIN exam_application_items i ON i.batch_id = b.id
      LEFT JOIN exams e ON e.id = i.exam_id
      LEFT JOIN turmas t ON t.id = e.turma_id
      LEFT JOIN users student ON student.id = i.user_id
      LEFT JOIN exam_submissions s
        ON s.exam_id = i.exam_id AND s.user_id = i.user_id
      ORDER BY b.created_at DESC, i.created_at ASC
    `);

    const batches = new Map();
    for (const row of result.rows) {
      if (!batches.has(row.id)) {
        batches.set(row.id, {
          batch: row,
          items: [],
        });
      }
      if (row.item_id) {
        batches.get(row.id).items.push(publicExamApplicationItem(row));
      }
    }

    res.json({
      applications: Array.from(batches.values()).map(({ batch, items }) =>
        publicExamApplication(batch, items)
      ),
    });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/exams/applications/:id", requireAuth, requireProfessor, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const batchRes = await client.query(
      `SELECT *
       FROM exam_application_batches
       WHERE id = $1
       FOR UPDATE`,
      [req.params.id]
    );
    if (batchRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Aplicação não encontrada." });
    }
    if (batchRes.rows[0].cancelled_at) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Esta aplicação já foi removida." });
    }

    const itemsRes = await client.query(
      `SELECT i.*, s.id as submission_id, s.status as submission_status
       FROM exam_application_items i
       LEFT JOIN exam_submissions s
         ON s.exam_id = i.exam_id AND s.user_id = i.user_id
       WHERE i.batch_id = $1
       FOR UPDATE OF i`,
      [req.params.id]
    );

    let removedCount = 0;
    let retainedCount = 0;
    for (const item of itemsRes.rows) {
      if (item.status !== "created") {
        retainedCount += 1;
        await client.query(
          `UPDATE exam_application_items
           SET removal_status = 'retained',
               removal_reason = $1,
               removed_at = NOW()
           WHERE id = $2`,
          [
            item.status === "existing"
              ? "A atribuição já existia antes desta aplicação."
              : "A aplicação original já havia ignorado este item.",
            item.id,
          ]
        );
        continue;
      }

      if (item.submission_id) {
        retainedCount += 1;
        await client.query(
          `UPDATE exam_application_items
           SET removal_status = 'retained',
               removal_reason = $1,
               removed_at = NOW()
           WHERE id = $2`,
          ["O aluno já iniciou ou concluiu esta prova.", item.id]
        );
        continue;
      }

      await client.query(
        "DELETE FROM exam_assignments WHERE exam_id = $1 AND user_id = $2",
        [item.exam_id, item.user_id]
      );
      await client.query(
        `UPDATE exam_application_items
         SET removal_status = 'removed',
             removal_reason = $1,
             removed_at = NOW()
         WHERE id = $2`,
        ["A atribuição criada nesta aplicação foi removida.", item.id]
      );
      removedCount += 1;
    }

    const reason = normalizeExamText(req.body?.reason, "Aplicação removida pelo professor.");
    const updatedBatch = await client.query(
      `UPDATE exam_application_batches
       SET cancelled_at = NOW(),
           cancelled_by = $1,
           cancellation_reason = $2,
           total_removed = $3,
           total_retained = $4
       WHERE id = $5
       RETURNING *`,
      [req.user.id, reason, removedCount, retainedCount, req.params.id]
    );

    await client.query("COMMIT");
    return res.json({
      success: true,
      application: publicExamApplication(updatedBatch.rows[0]),
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return next(error);
  } finally {
    client.release();
  }
});

app.get("/api/exams/student/history", requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT s.*, e.title as exam_title
      FROM exam_submissions s
      JOIN exams e ON e.id = s.exam_id
      WHERE s.user_id = $1
      ORDER BY s.completed_at DESC NULLS LAST
    `, [req.user.id]);
    res.json({ 
      submissions: result.rows.map(s => ({
        ...publicExamSubmission(s),
        examTitle: s.exam_title
      })) 
    });
  } catch (error) {
    next(error);
  }
});

app.post(
  "/api/exams",
  requireAuth,
  requireProfessor,
  async (req, res, next) => {
    try {
      const { title, description, turmaId, containerInitialState, timeLimit } = req.body;
      const normalizedTitle = normalizeExamText(title);
      if (!normalizedTitle) {
        return res.status(400).json({ error: "Título da prova é obrigatório." });
      }

      const id = crypto.randomUUID();
      const result = await pool.query(
        `INSERT INTO exams (id, title, description, turma_id, container_initial_state, time_limit)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          id,
          normalizedTitle,
          normalizeExamText(description),
          turmaId || null,
          JSON.stringify(containerInitialState || {}),
          normalizeExamTimeLimit(timeLimit),
        ]
      );
      res.status(201).json({ exam: publicExam(result.rows[0]) });
    } catch (error) {
      next(error);
    }
  }
);

app.get("/api/exams/:id", requireAuth, async (req, res, next) => {
  try {
    const exam = await ensureExamAccess(pool, req.user, req.params.id, {
      forSubmit: req.user.role !== "professor",
    });

    const questionsRes = await pool.query(
      "SELECT * FROM exam_questions WHERE exam_id = $1 ORDER BY order_index ASC",
      [req.params.id]
    );

    const questions = questionsRes.rows.map((q) =>
      req.user.role === "professor"
        ? publicExamQuestionFull(q)
        : publicExamQuestion(q)
    );

    res.json({
      exam: publicExam(exam),
      questions,
    });
  } catch (error) {
    next(error);
  }
});

app.put(
  "/api/exams/:id",
  requireAuth,
  requireProfessor,
  async (req, res, next) => {
    try {
      const { title, description, active, containerInitialState, timeLimit, isPublished } = req.body;
      const normalizedTitle =
        title === undefined ? undefined : normalizeExamText(title);
      if (title !== undefined && !normalizedTitle) {
        return res.status(400).json({ error: "Título da prova é obrigatório." });
      }

      const result = await pool.query(
        `UPDATE exams
         SET title = COALESCE($1, title),
             description = COALESCE($2, description),
             active = COALESCE($3, active),
             container_initial_state = COALESCE($4, container_initial_state),
             time_limit = COALESCE($5, time_limit),
             is_published = COALESCE($6, is_published),
             updated_at = NOW()
         WHERE id = $7
         RETURNING *`,
        [
          normalizedTitle,
          description === undefined ? undefined : normalizeExamText(description),
          active,
          containerInitialState ? JSON.stringify(containerInitialState) : null,
          timeLimit === undefined ? undefined : normalizeExamTimeLimit(timeLimit),
          isPublished,
          req.params.id,
        ]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Prova não encontrada." });
      }
      res.json({ exam: publicExam(result.rows[0]) });
    } catch (error) {
      next(error);
    }
  }
);

app.patch(
  "/api/exams/:id/publish",
  requireAuth,
  requireProfessor,
  async (req, res, next) => {
    try {
      const { isPublished } = req.body;
      const result = await pool.query(
        `UPDATE exams
         SET is_published = $1, updated_at = NOW()
         WHERE id = $2
           AND ($1 = FALSE OR EXISTS (SELECT 1 FROM exam_questions WHERE exam_id = exams.id))
         RETURNING *`,
        [Boolean(isPublished), req.params.id]
      );
      if (result.rowCount === 0) {
        return res.status(400).json({ error: "Prova não encontrada ou sem questões." });
      }
      res.json({ exam: publicExam(result.rows[0]) });
    } catch (error) {
      next(error);
    }
  }
);

app.post(
  "/api/exams/assign-batch",
  requireAuth,
  requireProfessor,
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { assignments, mode } = req.body; // Array de { examId, userId }
      const normalizedMode = mode === "balanced" ? "balanced" : "all";
      const assignmentList = Array.isArray(assignments) ? assignments : [];
      const counters = {
        requested: assignmentList.length,
        created: 0,
        existing: 0,
        skipped: 0,
      };
      const batchId = crypto.randomUUID();

      await client.query(
        `INSERT INTO exam_application_batches
           (id, applied_by, mode, total_requested, total_created, total_existing, total_skipped)
         VALUES ($1, $2, $3, $4, 0, 0, 0)`,
        [batchId, req.user.id, normalizedMode, counters.requested]
      );

      for (const item of assignmentList) {
        let itemStatus = "skipped";
        let reason = "";
        let itemExamId = null;
        let itemUserId = null;

        const targetRes = await client.query(
          "SELECT id, role FROM users WHERE id = $1 AND active = TRUE",
          [item.userId]
        );
        if (targetRes.rowCount === 0 || targetRes.rows[0].role !== "aluno") {
          counters.skipped += 1;
          reason = "Aluno inexistente, inativo ou sem papel de aluno.";
          await client.query(
            `INSERT INTO exam_application_items (id, batch_id, exam_id, user_id, status, reason)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [crypto.randomUUID(), batchId, itemExamId, itemUserId, itemStatus, reason]
          );
          continue;
        }
        itemUserId = targetRes.rows[0].id;

        const examRes = await client.query(
          "SELECT id, is_published, active FROM exams WHERE id = $1",
          [item.examId]
        );
        if (
          examRes.rowCount === 0 ||
          !examRes.rows[0].is_published ||
          !examRes.rows[0].active
        ) {
          counters.skipped += 1;
          reason = "Prova inexistente, inativa ou não publicada.";
          await client.query(
            `INSERT INTO exam_application_items (id, batch_id, exam_id, user_id, status, reason)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [crypto.randomUUID(), batchId, itemExamId, itemUserId, itemStatus, reason]
          );
          continue;
        }
        itemExamId = examRes.rows[0].id;

        const assignmentRes = await client.query(
          `INSERT INTO exam_assignments (id, exam_id, user_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (exam_id, user_id) DO NOTHING
           RETURNING id`,
          [crypto.randomUUID(), itemExamId, itemUserId]
        );

        if (assignmentRes.rowCount === 0) {
          itemStatus = "existing";
          counters.existing += 1;
          reason = "Atribuição já existia antes desta aplicação.";
        } else {
          itemStatus = "created";
          counters.created += 1;
          reason = "Atribuição criada nesta aplicação.";
        }

        await client.query(
          `INSERT INTO exam_application_items (id, batch_id, exam_id, user_id, status, reason)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [crypto.randomUUID(), batchId, itemExamId, itemUserId, itemStatus, reason]
        );
      }

      const batchRes = await client.query(
        `UPDATE exam_application_batches
         SET total_created = $1,
             total_existing = $2,
             total_skipped = $3
         WHERE id = $4
         RETURNING *`,
        [counters.created, counters.existing, counters.skipped, batchId]
      );

      await client.query("COMMIT");
      res.status(200).json({
        success: true,
        application: publicExamApplication(batchRes.rows[0]),
      });
    } catch (error) {
      await client.query("ROLLBACK");
      next(error);
    } finally {
      client.release();
    }
  }
);

app.delete(
  "/api/exams/:id",
  requireAuth,
  requireProfessor,
  async (req, res, next) => {
    try {
      const result = await pool.query("DELETE FROM exams WHERE id = $1", [
        req.params.id,
      ]);
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Prova não encontrada." });
      }
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }
);

app.post(
  "/api/exams/:id/questions",
  requireAuth,
  requireProfessor,
  async (req, res, next) => {
    try {
      const {
        type,
        text,
        options,
        correctAnswer,
        validationRules,
        points,
        timeLimit,
        orderIndex,
      } = req.body;
      const normalizedType = normalizeExamQuestionType(type);
      const normalizedText = normalizeExamText(text);
      if (!normalizedText) {
        return res.status(400).json({ error: "Enunciado da questão é obrigatório." });
      }

      const id = crypto.randomUUID();
      const result = await pool.query(
        `INSERT INTO exam_questions (id, exam_id, type, text, options, correct_answer, validation_rules, points, time_limit, order_index)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          id,
          req.params.id,
          normalizedType,
          normalizedText,
          JSON.stringify(normalizedType === "mcq" ? normalizeQuestionOptions(options) : []),
          normalizedType === "mcq" ? normalizeExamText(correctAnswer, "a") : null,
          JSON.stringify(normalizedType === "practical" ? normalizeValidationRules(validationRules) : []),
          normalizeQuestionPoints(points),
          normalizeExamTimeLimit(timeLimit),
          orderIndex || 0,
        ]
      );
      res.status(201).json({ question: publicExamQuestionFull(result.rows[0]) });
    } catch (error) {
      next(error);
    }
  }
);

app.patch(
  "/api/exams/:id/questions/:questionId",
  requireAuth,
  requireProfessor,
  async (req, res, next) => {
    try {
      const {
        type,
        text,
        options,
        correctAnswer,
        validationRules,
        points,
        timeLimit,
        orderIndex,
      } = req.body;
      const normalizedType =
        type === undefined ? undefined : normalizeExamQuestionType(type);
      const normalizedText =
        text === undefined ? undefined : normalizeExamText(text);
      if (text !== undefined && !normalizedText) {
        return res.status(400).json({ error: "Enunciado da questão é obrigatório." });
      }

      const result = await pool.query(
        `UPDATE exam_questions
         SET type = COALESCE($1, type),
             text = COALESCE($2, text),
             options = COALESCE($3, options),
             correct_answer = COALESCE($4, correct_answer),
             validation_rules = COALESCE($5, validation_rules),
             points = COALESCE($6, points),
             time_limit = COALESCE($7, time_limit),
             order_index = COALESCE($8, order_index)
         WHERE id = $9 AND exam_id = $10
         RETURNING *`,
        [
          normalizedType,
          normalizedText,
          options ? JSON.stringify(normalizeQuestionOptions(options)) : null,
          correctAnswer === undefined ? undefined : normalizeExamText(correctAnswer, "a"),
          validationRules ? JSON.stringify(normalizeValidationRules(validationRules)) : null,
          points === undefined ? undefined : normalizeQuestionPoints(points),
          timeLimit === undefined ? undefined : normalizeExamTimeLimit(timeLimit),
          orderIndex,
          req.params.questionId,
          req.params.id,
        ]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Questão não encontrada." });
      }
      res.json({ question: publicExamQuestionFull(result.rows[0]) });
    } catch (error) {
      next(error);
    }
  }
);

app.delete(
  "/api/exams/:id/questions/:questionId",
  requireAuth,
  requireProfessor,
  async (req, res, next) => {
    try {
      const result = await pool.query(
        "DELETE FROM exam_questions WHERE id = $1 AND exam_id = $2",
        [req.params.questionId, req.params.id]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Questão não encontrada." });
      }
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }
);

app.post("/api/exams/:id/submit", requireAuth, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { answers, status, practicalSnapshot } = req.body; // status: 'in_progress' ou 'completed'
    const normalizedStatus = status === "completed" ? "completed" : "in_progress";
    const exam = await ensureExamAccess(client, req.user, req.params.id, {
      forSubmit: req.user.role !== "professor",
    });

    // Verificar se já existe submissão
    let submissionRes = await client.query(
      "SELECT * FROM exam_submissions WHERE exam_id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );

    let submission;
    if (submissionRes.rowCount === 0) {
      const id = crypto.randomUUID();
      submissionRes = await client.query(
        `INSERT INTO exam_submissions (id, exam_id, user_id, status, completed_at)
         VALUES ($1, $2, $3, $4, CASE WHEN $4 = 'completed' THEN NOW() ELSE NULL END)
         RETURNING *`,
        [id, req.params.id, req.user.id, normalizedStatus]
      );
      submission = submissionRes.rows[0];
    } else {
      submission = submissionRes.rows[0];
      if (submission.status === "completed") {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Prova já finalizada." });
      }
      submissionRes = await client.query(
        "UPDATE exam_submissions SET status = $1, completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE completed_at END WHERE id = $2 RETURNING *",
        [normalizedStatus, submission.id]
      );
      submission = submissionRes.rows[0];
    }

    const isTimedOut =
      req.user.role !== "professor" &&
      Number(exam.time_limit || 0) > 0 &&
      Date.now() - new Date(submission.started_at).getTime() >
        Number(exam.time_limit) * 60 * 1000 + 30000;

    if (isTimedOut && normalizedStatus !== "completed") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "O tempo da prova terminou." });
    }

    // Salvar respostas
    if (answers && Array.isArray(answers)) {
      const questionsRes = await client.query(
        "SELECT * FROM exam_questions WHERE exam_id = $1 ORDER BY order_index ASC",
        [req.params.id]
      );
      const questions = questionsRes.rows;
      const answersByQuestion = new Map(
        answers
          .filter((answer) => answer?.questionId)
          .map((answer) => [answer.questionId, answer])
      );

      for (const question of questions) {
        const ans = answersByQuestion.get(question.id) || {};
        const answerText =
          question.type === "mcq" ? normalizeExamText(ans.answerText) : null;
        const isCorrect =
          question.type === "mcq"
            ? answerText === question.correct_answer
            : gradePracticalRules(question.validation_rules, practicalSnapshot);
        const pointsAwarded = isCorrect ? Number(question.points || 0) : 0;

        await client.query(
          `INSERT INTO exam_answers (id, submission_id, question_id, answer_text, is_correct, points_awarded)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (submission_id, question_id) DO UPDATE
           SET answer_text = EXCLUDED.answer_text,
               is_correct = EXCLUDED.is_correct,
               points_awarded = EXCLUDED.points_awarded`,
          [
            crypto.randomUUID(),
            submission.id,
            question.id,
            answerText,
            isCorrect,
            pointsAwarded,
          ]
        );
      }

      // Recalcular scores se finalizado
      if (normalizedStatus === "completed") {
        const scores = await client.query(
          `SELECT 
             SUM(CASE WHEN q.type = 'mcq' THEN a.points_awarded ELSE 0 END) as score_mcq,
             SUM(CASE WHEN q.type = 'practical' THEN a.points_awarded ELSE 0 END) as score_practical
           FROM exam_answers a
           JOIN exam_questions q ON q.id = a.question_id
           WHERE a.submission_id = $1`,
          [submission.id]
        );
        
        const { score_mcq, score_practical } = scores.rows[0];
        const totalScore = Number(score_mcq || 0) + Number(score_practical || 0);

        submissionRes = await client.query(
          `UPDATE exam_submissions 
           SET score_mcq = $1, score_practical = $2, total_score = $3
           WHERE id = $4 RETURNING *`,
          [score_mcq || 0, score_practical || 0, totalScore, submission.id]
        );
        submission = submissionRes.rows[0];
      }
    }

    await client.query("COMMIT");
    res.json({ submission: publicExamSubmission(submission) });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});

app.get(
  "/api/exams/:id/submissions",
  requireAuth,
  requireProfessor,
  async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT s.*, u.username, u.display_name
         FROM exam_submissions s
         JOIN users u ON u.id = s.user_id
         WHERE s.exam_id = $1
         ORDER BY s.completed_at DESC`,
        [req.params.id]
      );
      res.json({ submissions: result.rows.map(publicExamSubmission) });
    } catch (error) {
      next(error);
    }
  }
);

app.get(
  "/api/exams/:examId/submissions/:submissionId",
  requireAuth,
  async (req, res, next) => {
    try {
      const { examId, submissionId } = req.params;
      const subRes = await pool.query(
        `SELECT s.*, u.username, u.display_name, u.turma_id,
                e.title AS exam_title, e.description AS exam_description,
                e.time_limit AS exam_time_limit,
                t.nome AS turma_name, t.code AS turma_code
         FROM exam_submissions s
         JOIN users u ON u.id = s.user_id
         JOIN exams e ON e.id = s.exam_id
         LEFT JOIN turmas t ON t.id = u.turma_id
         WHERE s.id = $1 AND s.exam_id = $2`,
        [submissionId, examId]
      );
      if (subRes.rowCount === 0) {
        return res.status(404).json({ error: "Submissão não encontrada." });
      }
      const sub = subRes.rows[0];

      // Aluno só pode ver a própria submissão
      if (req.user.role !== "professor" && sub.user_id !== req.user.id) {
        return res.status(403).json({ error: "Acesso negado." });
      }

      const answersRes = await pool.query(
        `SELECT a.*, q.type, q.text, q.options, q.correct_answer, q.points, q.order_index
         FROM exam_answers a
         JOIN exam_questions q ON q.id = a.question_id
         WHERE a.submission_id = $1
         ORDER BY q.order_index ASC`,
        [submissionId]
      );

      const isProfessor = req.user.role === "professor";
      const answers = answersRes.rows.map((a) => ({
        questionId: a.question_id,
        type: a.type,
        text: a.text,
        options: a.options,
        correctAnswer: isProfessor ? a.correct_answer : undefined,
        answerText: a.answer_text,
        isCorrect: a.is_correct,
        pointsAwarded: Number(a.points_awarded || 0),
        pointsTotal: Number(a.points || 0),
      }));

      res.json({
        submission: {
          ...publicExamSubmission(sub),
          examTitle: sub.exam_title,
          examDescription: sub.exam_description,
          examTimeLimit: Number(sub.exam_time_limit || 0),
          turmaName: sub.turma_name || "",
          turmaCode: sub.turma_code || "",
        },
        answers,
      });
    } catch (error) {
      next(error);
    }
  }
);

app.get("/api/notifications/events", requireAuth, async (req, res, next) => {

  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    if (!notificationClients.has(req.user.id)) {
      notificationClients.set(req.user.id, new Set());
    }
    notificationClients.get(req.user.id).add(res);
    if (!onlineUsers.has(req.user.id)) {
      onlineUsers.set(req.user.id, {
        user: req.user,
        clients: new Set(),
      });
    }
    const onlineUser = onlineUsers.get(req.user.id);
    onlineUser.user = req.user;
    onlineUser.clients.add(res);

    const heartbeat = setInterval(() => {
      res.write(": keep-alive\n\n");
    }, 25000);

    req.on("close", () => {
      clearInterval(heartbeat);
      const clients = notificationClients.get(req.user.id);
      if (clients) {
        clients.delete(res);
        if (clients.size === 0) notificationClients.delete(req.user.id);
      }
      const onlineUser = onlineUsers.get(req.user.id);
      if (onlineUser) {
        onlineUser.clients.delete(res);
        if (onlineUser.clients.size === 0) onlineUsers.delete(req.user.id);
      }
    });
  } catch (error) {
    next(error);
  }
});

app.get(
  "/api/typing/game/settings/events",
  requireAuth,
  async (req, res, next) => {
    try {
      const studentType =
        req.user.role === "professor"
          ? normalizeTypingStudentType(req.query.studentType)
          : req.user.student_type;
      const settings = await getTypingGameSettings(studentType);

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders?.();

      const client = {
        studentType,
        res,
      };
      typingGameSettingsClients.add(client);
      writeTypingGameSettingsEvent(res, settings);

      const heartbeat = setInterval(() => {
        res.write(": keep-alive\n\n");
      }, 25000);

      req.on("close", () => {
        clearInterval(heartbeat);
        typingGameSettingsClients.delete(client);
      });
    } catch (error) {
      next(error);
    }
  }
);

app.get(
  "/api/typing/game/settings/:studentType",
  requireAuth,
  async (req, res, next) => {
    try {
      const studentType = normalizeTypingStudentType(req.params.studentType);
      if (
        req.user.role !== "professor" &&
        req.user.student_type !== studentType
      ) {
        return res.status(403).json({
          error: "Configuração do game de digitação restrita ao tipo do aluno.",
        });
      }

      const settings = await getTypingGameSettings(studentType);
      return res.json({ settings });
    } catch (error) {
      return next(error);
    }
  }
);

app.put(
  "/api/typing/game/settings/:studentType",
  requireAuth,
  requireProfessor,
  async (req, res, next) => {
    try {
      const settings = await saveTypingGameSettings(
        req.params.studentType,
        req.body || {}
      );
      broadcastTypingGameSettings(settings);
      return res.json({ settings });
    } catch (error) {
      return next(error);
    }
  }
);

app.post("/api/typing/score", requireAuth, async (req, res, next) => {
  try {
    const { lessonId, wpm, accuracy, timeMs } = req.body;
    if (lessonId == null || wpm == null || accuracy == null) {
      return res.status(400).json({ error: "Dados incompletos." });
    }

    const id = crypto.randomUUID();
    await pool.query(
      `INSERT INTO typing_scores (id, user_id, lesson_id, wpm, accuracy, time_ms)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, req.user.id, lessonId, wpm, accuracy, timeMs || 0]
    );
    res.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/typing/game/score", requireAuth, async (req, res, next) => {
  try {
    const {
      missionId,
      missionTitle,
      score,
      wpm,
      accuracy,
      hits = 0,
      errors = 0,
      status = "lost",
      timeMs = 0,
    } = req.body;
    if (
      !missionId ||
      !missionTitle ||
      score == null ||
      wpm == null ||
      accuracy == null
    ) {
      return res.status(400).json({ error: "Dados incompletos." });
    }
    if (!["won", "lost"].includes(status)) {
      return res.status(400).json({ error: "Status do game inválido." });
    }

    const id = crypto.randomUUID();
    await pool.query(
      `INSERT INTO typing_game_scores
        (id, user_id, mission_id, mission_title, score, wpm, accuracy, hits, errors, status, time_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        id,
        req.user.id,
        String(missionId).slice(0, 80),
        String(missionTitle).slice(0, 120),
        clampInteger(score, 0, 0, 1000000),
        clampInteger(wpm, 0, 0, 300),
        clampInteger(accuracy, 0, 0, 100),
        clampInteger(hits, 0, 0, 100000),
        clampInteger(errors, 0, 0, 100000),
        status,
        clampInteger(timeMs, 0, 0, 24 * 60 * 60 * 1000),
      ]
    );
    res.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/typing/ranking/global", requireAuth, async (req, res, next) => {
  try {
    const studentType = normalizeTypingStudentType(
      req.query.studentType || req.user.student_type
    );
    const result = await pool.query(
      `SELECT name, lessons_completed, points, best_wpm, best_accuracy, best_time
       FROM typing_ranking
       WHERE student_type = $1
       ORDER BY points DESC, best_wpm DESC, best_accuracy DESC, best_time ASC`,
      [studentType]
    );
    res.json({ ranking: result.rows });
  } catch (error) {
    next(error);
  }
});

app.get("/api/typing/ranking/turma", requireAuth, async (req, res, next) => {
  try {
    if (!req.user.turma_id) {
      return res.json({ ranking: [] });
    }
    const result = await pool.query(
      `SELECT name, lessons_completed, points, best_wpm, best_accuracy, best_time
       FROM typing_ranking
       WHERE turma_id = $1 AND student_type = $2
       ORDER BY points DESC, best_wpm DESC, best_accuracy DESC, best_time ASC`,
      [req.user.turma_id, req.user.student_type]
    );
    res.json({ ranking: result.rows });
  } catch (error) {
    next(error);
  }
});

app.get(
  "/api/typing/ranking/turma/:id",
  requireAuth,
  requireProfessor,
  async (req, res, next) => {
    try {
      const turmaResult = await pool.query(
        "SELECT student_type FROM turmas WHERE id = $1",
        [req.params.id]
      );
      if (turmaResult.rowCount === 0) {
        return res.status(404).json({ error: "Turma não encontrada." });
      }
      const studentType = turmaResult.rows[0].student_type;
      const result = await pool.query(
        `SELECT name, lessons_completed, points, best_wpm, best_accuracy, best_time
       FROM typing_ranking
       WHERE turma_id = $1 AND student_type = $2
       ORDER BY points DESC, best_wpm DESC, best_accuracy DESC, best_time ASC`,
        [req.params.id, studentType]
      );
      res.json({ ranking: result.rows });
    } catch (error) {
      next(error);
    }
  }
);

app.post(
  "/api/typing/ranking/turma/reset",
  requireAuth,
  requireProfessor,
  async (req, res, next) => {
    try {
      const turmaCode = normalizeTurmaCode(req.body.turmaCode);
      if (!turmaCode || !/^[A-Z0-9]{6}$/.test(turmaCode)) {
        return res.status(400).json({
          error: "Informe um código de turma válido com 6 caracteres.",
        });
      }
      const turmaResult = await pool.query(
        "SELECT id, nome, code, student_type FROM turmas WHERE code = $1",
        [turmaCode]
      );
      if (turmaResult.rowCount === 0) {
        return res
          .status(404)
          .json({ error: "Código de turma não encontrado." });
      }

      const turma = turmaResult.rows[0];
      const deleteResult = await pool.query(
        `DELETE FROM typing_scores
       WHERE user_id IN (
         SELECT id FROM users WHERE turma_id = $1 AND student_type = $2
       )`,
        [turma.id, turma.student_type]
      );

      res.json({
        ok: true,
        deletedScores: deleteResult.rowCount,
        turma: {
          id: turma.id,
          nome: turma.nome,
          code: turma.code,
          studentType: turma.student_type,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

app.get(
  "/api/typing/game/ranking/global",
  requireAuth,
  async (req, res, next) => {
    try {
      const studentType = normalizeTypingStudentType(
        req.query.studentType || req.user.student_type
      );
      const result = await pool.query(
        `SELECT name, missions_completed, points, best_wpm, best_accuracy, best_time
       FROM typing_game_ranking
       WHERE student_type = $1
       ORDER BY points DESC, best_wpm DESC, best_accuracy DESC, best_time ASC`,
        [studentType]
      );
      res.json({ ranking: result.rows });
    } catch (error) {
      next(error);
    }
  }
);

app.get(
  "/api/typing/game/ranking/turma",
  requireAuth,
  async (req, res, next) => {
    try {
      if (!req.user.turma_id) {
        return res.json({ ranking: [] });
      }
      const result = await pool.query(
        `SELECT name, missions_completed, points, best_wpm, best_accuracy, best_time
       FROM typing_game_ranking
       WHERE turma_id = $1 AND student_type = $2
       ORDER BY points DESC, best_wpm DESC, best_accuracy DESC, best_time ASC`,
        [req.user.turma_id, req.user.student_type]
      );
      res.json({ ranking: result.rows });
    } catch (error) {
      next(error);
    }
  }
);

app.get(
  "/api/typing/game/ranking/turma/:id",
  requireAuth,
  requireProfessor,
  async (req, res, next) => {
    try {
      const turmaResult = await pool.query(
        "SELECT student_type FROM turmas WHERE id = $1",
        [req.params.id]
      );
      if (turmaResult.rowCount === 0) {
        return res.status(404).json({ error: "Turma não encontrada." });
      }
      const studentType = turmaResult.rows[0].student_type;
      const result = await pool.query(
        `SELECT name, missions_completed, points, best_wpm, best_accuracy, best_time
       FROM typing_game_ranking
       WHERE turma_id = $1 AND student_type = $2
       ORDER BY points DESC, best_wpm DESC, best_accuracy DESC, best_time ASC`,
        [req.params.id, studentType]
      );
      res.json({ ranking: result.rows });
    } catch (error) {
      next(error);
    }
  }
);

app.post(
  "/api/typing/game/ranking/turma/reset",
  requireAuth,
  requireProfessor,
  async (req, res, next) => {
    try {
      const turmaCode = normalizeTurmaCode(req.body.turmaCode);
      if (!turmaCode || !/^[A-Z0-9]{6}$/.test(turmaCode)) {
        return res.status(400).json({
          error: "Informe um código de turma válido com 6 caracteres.",
        });
      }
      const turmaResult = await pool.query(
        "SELECT id, nome, code, student_type FROM turmas WHERE code = $1",
        [turmaCode]
      );
      if (turmaResult.rowCount === 0) {
        return res
          .status(404)
          .json({ error: "Código de turma não encontrado." });
      }

      const turma = turmaResult.rows[0];
      const deleteResult = await pool.query(
        `DELETE FROM typing_game_scores
       WHERE user_id IN (
         SELECT id FROM users WHERE turma_id = $1 AND student_type = $2
       )`,
        [turma.id, turma.student_type]
      );

      res.json({
        ok: true,
        deletedScores: deleteResult.rowCount,
        turma: {
          id: turma.id,
          nome: turma.nome,
          code: turma.code,
          studentType: turma.student_type,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// --- Endpoints de Chat ---

// Clientes SSE aguardando mensagens por thread
const chatClients = new Map(); // threadId -> Set<res>

const broadcastChatMessage = (threadId, payload) => {
  const clients = chatClients.get(threadId);
  if (!clients) return;
  const data = JSON.stringify(payload);
  for (const res of clients) {
    try {
      res.write(`data: ${data}\n\n`);
    } catch {
      clients.delete(res);
    }
  }
};

const notifyChatRecipients = async (thread, message) => {
  const title =
    thread.type === "group"
      ? "Nova mensagem no grupo"
      : `Mensagem de ${message.sender_username}`;
  const body =
    message.body?.trim() ||
    (message.attachment ? "Enviou um arquivo." : "Enviou uma mensagem.");
  const notification = {
    source: "chat",
    title,
    body,
    icon: "chat",
    action: {
      type: "open-chat",
      threadId: thread.id,
      threadType: thread.type,
      turmaId: thread.turma_id,
      peer: {
        id: message.sender_id,
        username: message.sender_username,
        displayName: message.sender_name,
      },
    },
  };

  if (thread.type === "dm") {
    [thread.user_a, thread.user_b]
      .filter((userId) => userId && userId !== message.sender_id)
      .forEach((userId) => sendUserNotification(userId, notification));
    return;
  }

  if (!thread.turma_id) return;
  const result = await pool.query(
    `SELECT id FROM users
     WHERE turma_id = $1
       AND active = TRUE
       AND id <> $2`,
    [thread.turma_id, message.sender_id]
  );
  result.rows.forEach((row) => sendUserNotification(row.id, notification));
};

// Verificar se o usuário pode acessar uma thread
const canAccessThread = async (userId, userRole, threadId) => {
  const result = await pool.query(
    `SELECT t.id, t.type, t.turma_id, t.user_a, t.user_b,
            u.turma_id AS viewer_turma
     FROM chat_threads t
     CROSS JOIN (SELECT turma_id FROM users WHERE id = $2) u
     WHERE t.id = $1`,
    [threadId, userId]
  );
  if (result.rowCount === 0) return null;
  const thread = result.rows[0];
  if (userRole === "professor") return thread;
  if (thread.type === "group") {
    if (thread.turma_id !== thread.viewer_turma) return null;
  } else {
    if (thread.user_a !== userId && thread.user_b !== userId) return null;
  }
  return thread;
};

// Obter ou criar thread de grupo para uma turma
const ensureGroupThread = async (turmaId) => {
  const existing = await pool.query(
    "SELECT id FROM chat_threads WHERE type = 'group' AND turma_id = $1",
    [turmaId]
  );
  if (existing.rowCount > 0) return existing.rows[0].id;
  const id = require("node:crypto").randomUUID();
  await pool.query(
    "INSERT INTO chat_threads (id, type, turma_id) VALUES ($1, 'group', $2) ON CONFLICT DO NOTHING",
    [id, turmaId]
  );
  const again = await pool.query(
    "SELECT id FROM chat_threads WHERE type = 'group' AND turma_id = $1",
    [turmaId]
  );
  return again.rows[0].id;
};

// Obter ou criar thread DM entre dois usuários
const ensureDmThread = async (userA, userB) => {
  const existing = await pool.query(
    `SELECT id FROM chat_threads
     WHERE type = 'dm'
       AND ((user_a = $1 AND user_b = $2) OR (user_a = $2 AND user_b = $1))`,
    [userA, userB]
  );
  if (existing.rowCount > 0) return existing.rows[0].id;
  const id = require("node:crypto").randomUUID();
  await pool.query(
    `INSERT INTO chat_threads (id, type, user_a, user_b) VALUES ($1, 'dm', $2, $3)
     ON CONFLICT DO NOTHING`,
    [id, userA, userB]
  );
  const again = await pool.query(
    `SELECT id FROM chat_threads
     WHERE type = 'dm'
       AND ((user_a = $1 AND user_b = $2) OR (user_a = $2 AND user_b = $1))`,
    [userA, userB]
  );
  return again.rows[0].id;
};

// GET /api/chat/turmas - lista turmas (professor: todas; aluno: a própria)
app.get("/api/chat/turmas", requireAuth, async (req, res, next) => {
  try {
    let rows;
    if (req.user.role === "professor") {
      const result = await pool.query(
        "SELECT id, nome FROM turmas WHERE active = TRUE ORDER BY nome ASC"
      );
      rows = result.rows;
    } else {
      if (!req.user.turma_id) return res.json({ turmas: [] });
      const result = await pool.query(
        "SELECT id, nome FROM turmas WHERE id = $1",
        [req.user.turma_id]
      );
      rows = result.rows;
    }
    res.json({ turmas: rows });
  } catch (error) {
    next(error);
  }
});

// GET /api/chat/turmas/:turmaId/members - lista membros de uma turma (exceto o próprio usuário)
app.get(
  "/api/chat/turmas/:turmaId/members",
  requireAuth,
  async (req, res, next) => {
    try {
      const { turmaId } = req.params;
      // Professor pode ver qualquer turma; aluno só a própria
      if (req.user.role !== "professor" && req.user.turma_id !== turmaId) {
        return res.status(403).json({ error: "Acesso negado." });
      }
      const result = await pool.query(
        `SELECT id, username, display_name, role
       FROM users
       WHERE turma_id = $1 AND active = TRUE AND id != $2
       ORDER BY display_name ASC`,
        [turmaId, req.user.id]
      );
      res.json({
        members: result.rows.map((u) => ({
          id: u.id,
          username: u.username,
          displayName: u.display_name,
          role: u.role,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/chat/turmas/:turmaId/group-thread - obtém (ou cria) thread de grupo
app.get(
  "/api/chat/turmas/:turmaId/group-thread",
  requireAuth,
  async (req, res, next) => {
    try {
      const { turmaId } = req.params;
      if (req.user.role !== "professor" && req.user.turma_id !== turmaId) {
        return res.status(403).json({ error: "Acesso negado." });
      }
      const threadId = await ensureGroupThread(turmaId);
      res.json({ threadId });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/chat/dm - obtém (ou cria) thread DM com outro usuário
app.post("/api/chat/dm", requireAuth, async (req, res, next) => {
  try {
    const { peerId } = req.body;
    if (!peerId || peerId === req.user.id) {
      return res.status(400).json({ error: "Destinatário inválido." });
    }
    // Verificar se o peer existe e pertence à mesma turma (ou professor pode com qualquer um)
    const peerResult = await pool.query(
      "SELECT id, turma_id, role FROM users WHERE id = $1 AND active = TRUE",
      [peerId]
    );
    if (peerResult.rowCount === 0)
      return res.status(404).json({ error: "Usuário não encontrado." });
    const peer = peerResult.rows[0];
    if (req.user.role !== "professor" && peer.role !== "professor") {
      if (req.user.turma_id !== peer.turma_id) {
        return res
          .status(403)
          .json({ error: "Vocês não pertencem à mesma turma." });
      }
    }
    const threadId = await ensureDmThread(req.user.id, peerId);
    res.json({ threadId });
  } catch (error) {
    next(error);
  }
});

// GET /api/chat/threads/:threadId/messages - histórico de mensagens
app.get(
  "/api/chat/threads/:threadId/messages",
  requireAuth,
  async (req, res, next) => {
    try {
      const thread = await canAccessThread(
        req.user.id,
        req.user.role,
        req.params.threadId
      );
      if (!thread) return res.status(403).json({ error: "Acesso negado." });

      const limit = Math.min(Number(req.query.limit) || 100, 200);
      const before = req.query.before; // ISO timestamp para paginação
      const params = [req.params.threadId, limit];
      let whereClause = before ? "AND m.created_at < $3" : "";
      if (before) params.push(before);

      const result = await pool.query(
        `SELECT m.id, m.thread_id, m.sender_id, m.body, m.attachment, m.created_at,
              u.display_name AS sender_name, u.username AS sender_username, u.role AS sender_role
       FROM chat_messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.thread_id = $1 ${whereClause}
       ORDER BY m.created_at DESC
       LIMIT $2`,
        params
      );
      const messages = result.rows.reverse();
      res.json({ messages });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/chat/threads/:threadId/messages - enviar mensagem
app.post(
  "/api/chat/threads/:threadId/messages",
  requireAuth,
  async (req, res, next) => {
    try {
      const thread = await canAccessThread(
        req.user.id,
        req.user.role,
        req.params.threadId
      );
      if (!thread) return res.status(403).json({ error: "Acesso negado." });

      const body = String(req.body.body || "").trim();
      const attachment = req.body.attachment || null;

      if (!body && !attachment) {
        return res.status(400).json({ error: "Mensagem vazia." });
      }
      if (body.length > 2000) {
        return res
          .status(400)
          .json({ error: "Mensagem muito longa (máximo 2000 caracteres)." });
      }

      // Validar attachment se presente
      let safeAttachment = null;
      if (attachment) {
        if (
          typeof attachment !== "object" ||
          !attachment.name ||
          !attachment.content
        ) {
          return res.status(400).json({ error: "Anexo inválido." });
        }
        safeAttachment = {
          name: String(attachment.name).substring(0, 255),
          content: String(attachment.content).substring(0, 100000),
          type: String(attachment.type || "txt").substring(0, 10),
        };
      }

      const id = crypto.randomUUID();
      const result = await pool.query(
        `INSERT INTO chat_messages (id, thread_id, sender_id, body, attachment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, thread_id, sender_id, body, attachment, created_at`,
        [
          id,
          req.params.threadId,
          req.user.id,
          body || "",
          safeAttachment ? JSON.stringify(safeAttachment) : null,
        ]
      );
      const msg = result.rows[0];
      const fullMsg = {
        ...msg,
        sender_name: req.user.display_name,
        sender_username: req.user.username,
        sender_role: req.user.role,
      };

      broadcastChatMessage(req.params.threadId, fullMsg);
      await notifyChatRecipients(thread, fullMsg);
      res.status(201).json({ message: fullMsg });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/chat/threads/:threadId/events - SSE para mensagens em tempo real
app.get(
  "/api/chat/threads/:threadId/events",
  requireAuth,
  async (req, res, next) => {
    try {
      const thread = await canAccessThread(
        req.user.id,
        req.user.role,
        req.params.threadId
      );
      if (!thread) return res.status(403).json({ error: "Acesso negado." });

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders?.();

      if (!chatClients.has(req.params.threadId)) {
        chatClients.set(req.params.threadId, new Set());
      }
      chatClients.get(req.params.threadId).add(res);

      const heartbeat = setInterval(() => {
        res.write(": keep-alive\n\n");
      }, 25000);

      req.on("close", () => {
        clearInterval(heartbeat);
        const clients = chatClients.get(req.params.threadId);
        if (clients) {
          clients.delete(res);
          if (clients.size === 0) chatClients.delete(req.params.threadId);
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/chat/my-threads - lista threads ativas do usuário (DMs com última mensagem)
app.get("/api/chat/my-threads", requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT t.id, t.type, t.turma_id, t.user_a, t.user_b,
              ua.display_name AS user_a_name, ua.username AS user_a_username,
              ub.display_name AS user_b_name, ub.username AS user_b_username,
              lm.body AS last_body, lm.created_at AS last_at, lm.sender_id AS last_sender_id
       FROM chat_threads t
       LEFT JOIN users ua ON ua.id = t.user_a
       LEFT JOIN users ub ON ub.id = t.user_b
       LEFT JOIN LATERAL (
         SELECT body, created_at, sender_id FROM chat_messages
         WHERE thread_id = t.id ORDER BY created_at DESC LIMIT 1
       ) lm ON TRUE
       WHERE t.type = 'dm'
         AND (t.user_a = $1 OR t.user_b = $1)
       ORDER BY lm.created_at DESC NULLS LAST`,
      [req.user.id]
    );
    res.json({ threads: result.rows });
  } catch (error) {
    next(error);
  }
});

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
  const schema = await fs.promises.readFile(schemaPath, "utf8");
  await pool.query(schema);
  await syncAppBuildVersion();
  await ensureSeedAdmin();
  app.listen(config.port, () => {
    console.log(`Servidor iniciado na porta ${config.port}`);
  });
};

start().catch((error) => {
  console.error("Falha ao iniciar servidor.", error);
  process.exit(1);
});
