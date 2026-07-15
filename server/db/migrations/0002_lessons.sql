CREATE TABLE IF NOT EXISTS lesson_groups (
  id UUID PRIMARY KEY,
  turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lesson_groups_name_check
    CHECK (char_length(BTRIM(name)) BETWEEN 1 AND 100),
  UNIQUE (turma_id, name)
);

CREATE TABLE IF NOT EXISTS lesson_group_members (
  group_id UUID NOT NULL REFERENCES lesson_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY,
  turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  activity_type TEXT NOT NULL DEFAULT 'solo',
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lessons_title_check
    CHECK (char_length(BTRIM(title)) BETWEEN 1 AND 160),
  CONSTRAINT lessons_description_check
    CHECK (char_length(description) <= 4000),
  CONSTRAINT lessons_activity_type_check
    CHECK (activity_type IN ('solo', 'group'))
);

CREATE TABLE IF NOT EXISTS lesson_group_assignments (
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES lesson_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (lesson_id, group_id)
);

CREATE TABLE IF NOT EXISTS lesson_student_progress (
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (lesson_id, user_id),
  CONSTRAINT lesson_student_progress_completed_at_check
    CHECK (completed OR completed_at IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_lesson_groups_turma
  ON lesson_groups(turma_id);
CREATE INDEX IF NOT EXISTS idx_lesson_group_members_user
  ON lesson_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_lessons_turma_due
  ON lessons(turma_id, due_at);
CREATE INDEX IF NOT EXISTS idx_lesson_group_assignments_group
  ON lesson_group_assignments(group_id);
CREATE INDEX IF NOT EXISTS idx_lesson_student_progress_user
  ON lesson_student_progress(user_id);
