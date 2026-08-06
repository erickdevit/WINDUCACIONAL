CREATE INDEX IF NOT EXISTS idx_drawing_activities_teacher
  ON drawing_activities(teacher_id, created_at DESC);
