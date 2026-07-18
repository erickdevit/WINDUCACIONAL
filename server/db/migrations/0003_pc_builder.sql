CREATE TABLE IF NOT EXISTS pc_builds (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  components JSONB NOT NULL DEFAULT '{}'::jsonb,
  validation JSONB NOT NULL DEFAULT '{}'::jsonb,
  outcome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pc_builds_name_check
    CHECK (char_length(BTRIM(name)) BETWEEN 1 AND 80),
  CONSTRAINT pc_builds_components_check
    CHECK (jsonb_typeof(components) = 'object'),
  CONSTRAINT pc_builds_validation_check
    CHECK (jsonb_typeof(validation) = 'object'),
  CONSTRAINT pc_builds_outcome_check
    CHECK (outcome IN ('success', 'explosion'))
);

CREATE INDEX IF NOT EXISTS idx_pc_builds_user_created
  ON pc_builds(user_id, created_at DESC);
