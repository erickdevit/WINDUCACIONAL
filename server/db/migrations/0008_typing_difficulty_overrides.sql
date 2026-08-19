CREATE TABLE IF NOT EXISTS typing_difficulty_overrides (
  id UUID PRIMARY KEY,
  mode TEXT NOT NULL,
  scope_type TEXT NOT NULL,
  turma_id UUID REFERENCES turmas(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  pass_min_wpm INTEGER NOT NULL,
  pass_min_accuracy INTEGER NOT NULL,
  max_errors INTEGER NOT NULL,
  max_lives INTEGER NOT NULL,
  game_speed INTEGER NOT NULL,
  game_speed_boost INTEGER NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT typing_difficulty_overrides_mode_check
    CHECK (mode IN ('lesson', 'game')),
  CONSTRAINT typing_difficulty_overrides_scope_check
    CHECK (scope_type IN ('turma', 'student')),
  CONSTRAINT typing_difficulty_overrides_target_check
    CHECK (
      (scope_type = 'turma' AND turma_id IS NOT NULL AND student_id IS NULL)
      OR
      (scope_type = 'student' AND student_id IS NOT NULL AND turma_id IS NULL)
    ),
  CONSTRAINT typing_difficulty_overrides_wpm_check
    CHECK (pass_min_wpm BETWEEN 10 AND 120),
  CONSTRAINT typing_difficulty_overrides_accuracy_check
    CHECK (pass_min_accuracy BETWEEN 50 AND 100),
  CONSTRAINT typing_difficulty_overrides_errors_check
    CHECK (max_errors BETWEEN 3 AND 10),
  CONSTRAINT typing_difficulty_overrides_lives_check
    CHECK (max_lives BETWEEN 3 AND 10),
  CONSTRAINT typing_difficulty_overrides_speed_check
    CHECK (game_speed BETWEEN 0 AND 100),
  CONSTRAINT typing_difficulty_overrides_boost_check
    CHECK (game_speed_boost BETWEEN 0 AND 100)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_typing_difficulty_override_turma
  ON typing_difficulty_overrides(mode, turma_id)
  WHERE scope_type = 'turma';

CREATE UNIQUE INDEX IF NOT EXISTS idx_typing_difficulty_override_student
  ON typing_difficulty_overrides(mode, student_id)
  WHERE scope_type = 'student';

CREATE INDEX IF NOT EXISTS idx_typing_difficulty_override_turma_lookup
  ON typing_difficulty_overrides(turma_id, mode)
  WHERE scope_type = 'turma';

CREATE INDEX IF NOT EXISTS idx_typing_difficulty_override_student_lookup
  ON typing_difficulty_overrides(student_id, mode)
  WHERE scope_type = 'student';
