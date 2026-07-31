CREATE TABLE IF NOT EXISTS drawing_activities (
  id UUID PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  mode TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  winner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  CONSTRAINT drawing_activities_topic_check CHECK (char_length(BTRIM(topic)) BETWEEN 1 AND 120),
  CONSTRAINT drawing_activities_mode_check CHECK (mode IN ('individual', 'chaos')),
  CONSTRAINT drawing_activities_status_check CHECK (status IN ('active', 'closed'))
);

CREATE TABLE IF NOT EXISTS drawing_strokes (
  activity_id UUID NOT NULL REFERENCES drawing_activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  strokes JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (activity_id, user_id),
  CONSTRAINT drawing_strokes_shape_check CHECK (jsonb_typeof(strokes) = 'array')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_drawing_active_turma
  ON drawing_activities(turma_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_drawing_activities_turma_created
  ON drawing_activities(turma_id, created_at DESC);
