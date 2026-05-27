CREATE TABLE IF NOT EXISTS turmas (
  id UUID PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  CONSTRAINT turmas_code_format_check CHECK (code ~ '^[A-Z0-9]{6}$'),
  student_type TEXT NOT NULL DEFAULT 'normal',
  CONSTRAINT turmas_student_type_check CHECK (student_type IN ('kids', 'normal')),
  schedule_days SMALLINT[] NOT NULL DEFAULT ARRAY[1,2,3,4,5]::SMALLINT[],
  CONSTRAINT turmas_schedule_days_check CHECK (COALESCE(array_length(schedule_days, 1), 0) > 0 AND schedule_days <@ ARRAY[0,1,2,3,4,5,6]::SMALLINT[]),
  schedule_start_time TIME NOT NULL DEFAULT '00:00',
  schedule_end_time TIME NOT NULL DEFAULT '23:59',
  CONSTRAINT turmas_schedule_time_check CHECK (schedule_start_time < schedule_end_time),
  descricao TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migração: adicionar código de turma e student_type em bancos existentes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'turmas' AND column_name = 'code'
  ) THEN
    ALTER TABLE turmas ADD COLUMN code TEXT;
    UPDATE turmas
      SET code = UPPER(SUBSTRING(MD5(id::text), 1, 6))
      WHERE code IS NULL;
    ALTER TABLE turmas ALTER COLUMN code SET NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'turmas_code_format_check'
  ) THEN
    ALTER TABLE turmas
      ADD CONSTRAINT turmas_code_format_check
      CHECK (code ~ '^[A-Z0-9]{6}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'turmas' AND column_name = 'student_type'
  ) THEN
    ALTER TABLE turmas ADD COLUMN student_type TEXT NOT NULL DEFAULT 'normal';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'turmas_student_type_check'
  ) THEN
    ALTER TABLE turmas
      ADD CONSTRAINT turmas_student_type_check
      CHECK (student_type IN ('kids', 'normal'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'turmas' AND column_name = 'schedule_days'
  ) THEN
    ALTER TABLE turmas ADD COLUMN schedule_days SMALLINT[] NOT NULL DEFAULT ARRAY[1,2,3,4,5]::SMALLINT[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'turmas' AND column_name = 'schedule_start_time'
  ) THEN
    ALTER TABLE turmas ADD COLUMN schedule_start_time TIME NOT NULL DEFAULT '00:00';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'turmas' AND column_name = 'schedule_end_time'
  ) THEN
    ALTER TABLE turmas ADD COLUMN schedule_end_time TIME NOT NULL DEFAULT '23:59';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'turmas_schedule_days_check'
  ) THEN
    ALTER TABLE turmas
      ADD CONSTRAINT turmas_schedule_days_check
      CHECK (COALESCE(array_length(schedule_days, 1), 0) > 0 AND schedule_days <@ ARRAY[0,1,2,3,4,5,6]::SMALLINT[]);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'turmas_schedule_time_check'
  ) THEN
    ALTER TABLE turmas
      ADD CONSTRAINT turmas_schedule_time_check
      CHECK (schedule_start_time < schedule_end_time);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('aluno', 'professor', 'secretaria')),
  student_type TEXT NOT NULL DEFAULT 'normal',
  CONSTRAINT users_student_type_check CHECK (student_type IN ('kids', 'normal')),
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  turma_id UUID REFERENCES turmas(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migração: adicionar coluna turma_id em bancos existentes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'turma_id'
  ) THEN
    ALTER TABLE users ADD COLUMN turma_id UUID REFERENCES turmas(id) ON DELETE SET NULL;
  END IF;
END
$$;

-- Migração: adicionar classificação Kids/Normal em bancos existentes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'student_type'
  ) THEN
    ALTER TABLE users ADD COLUMN student_type TEXT NOT NULL DEFAULT 'normal';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_student_type_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_student_type_check
      CHECK (student_type IN ('kids', 'normal'));
  END IF;
END
$$;

UPDATE users u
SET student_type = t.student_type,
    updated_at = NOW()
FROM turmas t
WHERE u.turma_id = t.id
  AND u.role = 'aluno'
  AND u.student_type <> t.student_type;

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_users_turma_id ON users(turma_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_turmas_code ON turmas(code);

CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  first_login_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  login_count INTEGER NOT NULL DEFAULT 1,
  source TEXT NOT NULL DEFAULT 'login',
  CONSTRAINT attendance_records_source_check CHECK (source IN ('login', 'manual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, attendance_date)
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'attendance_records'
      AND constraint_name = 'attendance_records_source_check'
  ) THEN
    ALTER TABLE attendance_records DROP CONSTRAINT attendance_records_source_check;
  END IF;

  ALTER TABLE attendance_records
    ADD CONSTRAINT attendance_records_source_check
    CHECK (source IN ('login', 'manual'));

  -- Permitir first/last_login_at serem NULL para registros manuais (ausentes ou criados offline)
  ALTER TABLE attendance_records ALTER COLUMN first_login_at DROP NOT NULL;
  ALTER TABLE attendance_records ALTER COLUMN last_login_at DROP NOT NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_attendance_records_user ON attendance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON attendance_records(attendance_date);

CREATE TABLE IF NOT EXISTS booklet_module_access (
  module_id TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS booklet_student_module_access (
  module_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (module_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_booklet_student_module_access_user
  ON booklet_student_module_access(user_id);

CREATE TABLE IF NOT EXISTS app_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS typing_settings (
  student_type TEXT PRIMARY KEY,
  CONSTRAINT typing_settings_student_type_check CHECK (student_type IN ('kids', 'normal')),
  pass_min_wpm INTEGER NOT NULL DEFAULT 40,
  CONSTRAINT typing_settings_pass_min_wpm_check CHECK (pass_min_wpm BETWEEN 10 AND 120),
  pass_min_accuracy INTEGER NOT NULL DEFAULT 95,
  CONSTRAINT typing_settings_pass_min_accuracy_check CHECK (pass_min_accuracy BETWEEN 50 AND 100),
  max_errors INTEGER NOT NULL DEFAULT 7,
  CONSTRAINT typing_settings_max_errors_check CHECK (max_errors BETWEEN 3 AND 10),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO typing_settings (student_type, pass_min_wpm, pass_min_accuracy, max_errors)
VALUES
  ('normal', 40, 95, 7),
  ('kids', 40, 95, 7)
ON CONFLICT (student_type) DO NOTHING;

CREATE TABLE IF NOT EXISTS typing_scores (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL,
  wpm INTEGER NOT NULL,
  accuracy DECIMAL NOT NULL,
  time_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migração: adicionar coluna time_ms
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'typing_scores' AND column_name = 'time_ms'
  ) THEN
    ALTER TABLE typing_scores ADD COLUMN time_ms INTEGER NOT NULL DEFAULT 0;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_typing_scores_user_id ON typing_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_typing_scores_created_at ON typing_scores(created_at);

CREATE TABLE IF NOT EXISTS typing_game_settings (
  student_type TEXT PRIMARY KEY,
  CONSTRAINT typing_game_settings_student_type_check CHECK (student_type IN ('kids', 'normal')),
  pass_min_wpm INTEGER NOT NULL DEFAULT 40,
  CONSTRAINT typing_game_settings_pass_min_wpm_check CHECK (pass_min_wpm BETWEEN 10 AND 120),
  pass_min_accuracy INTEGER NOT NULL DEFAULT 95,
  CONSTRAINT typing_game_settings_pass_min_accuracy_check CHECK (pass_min_accuracy BETWEEN 50 AND 100),
  max_lives INTEGER NOT NULL DEFAULT 7,
  CONSTRAINT typing_game_settings_max_lives_check CHECK (max_lives BETWEEN 3 AND 10),
  game_speed INTEGER NOT NULL DEFAULT 100,
  CONSTRAINT typing_game_settings_game_speed_check CHECK (game_speed BETWEEN 0 AND 100),
  game_speed_boost INTEGER NOT NULL DEFAULT 3,
  CONSTRAINT typing_game_settings_game_speed_boost_check CHECK (game_speed_boost BETWEEN 0 AND 100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migração: adicionar configurações percentuais de velocidade do game
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'typing_game_settings' AND column_name = 'game_speed'
  ) THEN
    ALTER TABLE typing_game_settings ADD COLUMN game_speed INTEGER NOT NULL DEFAULT 100;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'typing_game_settings' AND column_name = 'game_speed_boost'
  ) THEN
    ALTER TABLE typing_game_settings ADD COLUMN game_speed_boost INTEGER NOT NULL DEFAULT 3;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'typing_game_settings_game_speed_check'
  ) THEN
    ALTER TABLE typing_game_settings
      ADD CONSTRAINT typing_game_settings_game_speed_check
      CHECK (game_speed BETWEEN 0 AND 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'typing_game_settings_game_speed_boost_check'
  ) THEN
    ALTER TABLE typing_game_settings
      ADD CONSTRAINT typing_game_settings_game_speed_boost_check
      CHECK (game_speed_boost BETWEEN 0 AND 100);
  END IF;
END
$$;

INSERT INTO typing_game_settings (student_type, pass_min_wpm, pass_min_accuracy, max_lives, game_speed, game_speed_boost)
VALUES
  ('normal', 40, 95, 7, 100, 3),
  ('kids', 40, 95, 7, 100, 3)
ON CONFLICT (student_type) DO NOTHING;

CREATE TABLE IF NOT EXISTS typing_game_scores (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mission_id TEXT NOT NULL,
  mission_title TEXT NOT NULL,
  score INTEGER NOT NULL,
  wpm INTEGER NOT NULL,
  accuracy DECIMAL NOT NULL,
  hits INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'lost',
  CONSTRAINT typing_game_scores_status_check CHECK (status IN ('won', 'lost')),
  time_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_typing_game_scores_user_id ON typing_game_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_typing_game_scores_created_at ON typing_game_scores(created_at);

-- === Chat ===

-- Threads de chat privado (DM entre dois usuários) ou sala de turma (group)
CREATE TABLE IF NOT EXISTS chat_threads (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'dm',
  CONSTRAINT chat_threads_type_check CHECK (type IN ('dm', 'group')),
  turma_id UUID REFERENCES turmas(id) ON DELETE CASCADE,
  user_a UUID REFERENCES users(id) ON DELETE CASCADE,
  user_b UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_threads_dm
  ON chat_threads (LEAST(user_a, user_b), GREATEST(user_a, user_b))
  WHERE type = 'dm';

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_threads_group
  ON chat_threads (turma_id)
  WHERE type = 'group';

CREATE INDEX IF NOT EXISTS idx_chat_threads_turma ON chat_threads(turma_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_user_a ON chat_threads(user_a);
CREATE INDEX IF NOT EXISTS idx_chat_threads_user_b ON chat_threads(user_b);

-- Mensagens do chat
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  attachment JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON chat_messages(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);

-- Recriar a view evita incompatibilidades de ordem/nome de colunas em bancos legados
DROP VIEW IF EXISTS typing_ranking;
CREATE VIEW typing_ranking AS
SELECT 
  u.id AS user_id,
  u.username AS name,
  u.role,
  COALESCE(turma.student_type, u.student_type) AS student_type,
  u.turma_id,
  COUNT(DISTINCT t.lesson_id) AS lessons_completed,
  COUNT(DISTINCT t.lesson_id) * 10 AS points,
  MAX(t.wpm) AS best_wpm,
  MAX(t.accuracy) AS best_accuracy,
  MIN(t.time_ms) AS best_time
FROM users u
LEFT JOIN turmas turma ON turma.id = u.turma_id
LEFT JOIN typing_settings s ON s.student_type = COALESCE(turma.student_type, u.student_type)
LEFT JOIN typing_scores t
  ON t.user_id = u.id
  AND t.accuracy >= COALESCE(s.pass_min_accuracy, 95)
  AND t.wpm >= COALESCE(s.pass_min_wpm, 40)
WHERE u.role = 'aluno' AND u.active = TRUE
GROUP BY u.id, u.username, u.role, COALESCE(turma.student_type, u.student_type), u.turma_id;

DROP VIEW IF EXISTS typing_game_ranking;
CREATE VIEW typing_game_ranking AS
SELECT
  u.id AS user_id,
  u.username AS name,
  u.role,
  COALESCE(turma.student_type, u.student_type) AS student_type,
  u.turma_id,
  COUNT(t.id) AS missions_completed,
  COALESCE(SUM(t.score), 0) AS points,
  MAX(t.wpm) AS best_wpm,
  MAX(t.accuracy) AS best_accuracy,
  MIN(t.time_ms) AS best_time
FROM users u
LEFT JOIN turmas turma ON turma.id = u.turma_id
LEFT JOIN typing_game_settings s ON s.student_type = COALESCE(turma.student_type, u.student_type)
LEFT JOIN typing_game_scores t
  ON t.user_id = u.id
  AND t.status = 'won'
  AND t.accuracy >= COALESCE(s.pass_min_accuracy, 95)
  AND t.wpm >= COALESCE(s.pass_min_wpm, 40)
WHERE u.role = 'aluno' AND u.active = TRUE
GROUP BY u.id, u.display_name, u.role, COALESCE(turma.student_type, u.student_type), u.turma_id;

CREATE TABLE IF NOT EXISTS typing_pvp_matches (
  id UUID PRIMARY KEY,
  winner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  loser_id UUID REFERENCES users(id) ON DELETE SET NULL,
  winner_score INT DEFAULT 0,
  loser_score INT DEFAULT 0,
  turma_id UUID REFERENCES turmas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'typing_pvp_matches' AND column_name = 'winner_score'
  ) THEN
    ALTER TABLE typing_pvp_matches ADD COLUMN winner_score INT DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'typing_pvp_matches' AND column_name = 'loser_score'
  ) THEN
    ALTER TABLE typing_pvp_matches ADD COLUMN loser_score INT DEFAULT 0;
  END IF;
END $$;

-- === Evaluation (Exams) ===

CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY,
  turma_id UUID REFERENCES turmas(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  container_initial_state JSONB DEFAULT '{}'::jsonb,
  time_limit INTEGER NOT NULL DEFAULT 0, -- Em minutos (0 = ilimitado)
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exam_questions (
  id UUID PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('mcq', 'practical')),
  text TEXT NOT NULL,
  options JSONB DEFAULT '[]'::jsonb, -- Para MCQ: array de strings ou objetos
  correct_answer TEXT,               -- Para MCQ: índice ou valor correto
  validation_rules JSONB DEFAULT '[]'::jsonb, -- Para Prática: regras de correção
  points INTEGER NOT NULL DEFAULT 1,
  time_limit INTEGER NOT NULL DEFAULT 0, -- Em minutos (0 = usa o tempo global da prova)
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exam_submissions (
  id UUID PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  score_mcq DECIMAL DEFAULT 0,
  score_practical DECIMAL DEFAULT 0,
  total_score DECIMAL DEFAULT 0,
  student_display_name TEXT NOT NULL DEFAULT '',
  practical_snapshot JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(exam_id, user_id)
);

CREATE TABLE IF NOT EXISTS exam_answers (
  id UUID PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES exam_submissions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES exam_questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  is_correct BOOLEAN,
  points_awarded DECIMAL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(submission_id, question_id)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exams' AND column_name = 'time_limit') THEN
    ALTER TABLE exams ADD COLUMN time_limit INTEGER NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exams' AND column_name = 'is_published') THEN
    ALTER TABLE exams ADD COLUMN is_published BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_questions' AND column_name = 'time_limit') THEN
    ALTER TABLE exam_questions ADD COLUMN time_limit INTEGER NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'exam_answers' AND constraint_type = 'UNIQUE'
  ) THEN
    ALTER TABLE exam_answers ADD CONSTRAINT unique_submission_question UNIQUE(submission_id, question_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'exam_submissions'
      AND constraint_name = 'exam_submissions_exam_id_user_id_key'
  ) THEN
    ALTER TABLE exam_submissions ADD CONSTRAINT exam_submissions_exam_id_user_id_key UNIQUE(exam_id, user_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS exam_assignments (
  id UUID PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(exam_id, user_id)
);

CREATE TABLE IF NOT EXISTS exam_application_batches (
  id UUID PRIMARY KEY,
  applied_by UUID REFERENCES users(id) ON DELETE SET NULL,
  mode TEXT NOT NULL DEFAULT 'all' CHECK (mode IN ('all', 'balanced')),
  total_requested INTEGER NOT NULL DEFAULT 0,
  total_created INTEGER NOT NULL DEFAULT 0,
  total_existing INTEGER NOT NULL DEFAULT 0,
  total_skipped INTEGER NOT NULL DEFAULT 0,
  total_removed INTEGER NOT NULL DEFAULT 0,
  total_retained INTEGER NOT NULL DEFAULT 0,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL,
  cancellation_reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exam_application_items (
  id UUID PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES exam_application_batches(id) ON DELETE CASCADE,
  exam_id UUID REFERENCES exams(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('created', 'existing', 'skipped')),
  removal_status TEXT NOT NULL DEFAULT 'active' CHECK (removal_status IN ('active', 'removed', 'retained')),
  removal_reason TEXT NOT NULL DEFAULT '',
  removed_at TIMESTAMPTZ,
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_application_batches' AND column_name = 'total_removed') THEN
    ALTER TABLE exam_application_batches ADD COLUMN total_removed INTEGER NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_application_batches' AND column_name = 'total_retained') THEN
    ALTER TABLE exam_application_batches ADD COLUMN total_retained INTEGER NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_application_batches' AND column_name = 'cancelled_at') THEN
    ALTER TABLE exam_application_batches ADD COLUMN cancelled_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_application_batches' AND column_name = 'cancelled_by') THEN
    ALTER TABLE exam_application_batches ADD COLUMN cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_application_batches' AND column_name = 'cancellation_reason') THEN
    ALTER TABLE exam_application_batches ADD COLUMN cancellation_reason TEXT NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_application_items' AND column_name = 'removal_status') THEN
    ALTER TABLE exam_application_items ADD COLUMN removal_status TEXT NOT NULL DEFAULT 'active';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_application_items' AND column_name = 'removal_reason') THEN
    ALTER TABLE exam_application_items ADD COLUMN removal_reason TEXT NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_application_items' AND column_name = 'removed_at') THEN
    ALTER TABLE exam_application_items ADD COLUMN removed_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'exam_application_items'
      AND constraint_name = 'exam_application_items_removal_status_check'
  ) THEN
    ALTER TABLE exam_application_items
      ADD CONSTRAINT exam_application_items_removal_status_check
      CHECK (removal_status IN ('active', 'removed', 'retained'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_submissions' AND column_name = 'practical_snapshot') THEN
    ALTER TABLE exam_submissions ADD COLUMN practical_snapshot JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_submissions' AND column_name = 'student_display_name') THEN
    ALTER TABLE exam_submissions ADD COLUMN student_display_name TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_exam_assignments_user ON exam_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_assignments_exam ON exam_assignments(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_application_batches_created ON exam_application_batches(created_at);
CREATE INDEX IF NOT EXISTS idx_exam_application_items_batch ON exam_application_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_exam_application_items_exam ON exam_application_items(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_application_items_user ON exam_application_items(user_id);

CREATE INDEX IF NOT EXISTS idx_exams_turma ON exams(turma_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_exam ON exam_questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_submissions_exam ON exam_submissions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_submissions_user ON exam_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_answers_submission ON exam_answers(submission_id);
