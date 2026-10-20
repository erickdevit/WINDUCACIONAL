-- Cria tabelas para persistir o progresso e o histórico de reset das lições de digitação
CREATE TABLE IF NOT EXISTS typing_lesson_progress (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_typing_lesson_progress_user
  ON typing_lesson_progress(user_id);

CREATE TABLE IF NOT EXISTS typing_lesson_resets (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Backfill das lições concluídas a partir de pontuações válidas registradas anteriormente
INSERT INTO typing_lesson_progress (user_id, lesson_id, completed_at)
SELECT t.user_id, t.lesson_id, MIN(t.created_at)
FROM typing_scores t
JOIN users u ON u.id = t.user_id
LEFT JOIN turmas turma ON turma.id = u.turma_id
LEFT JOIN typing_settings s ON s.student_type = COALESCE(turma.student_type, u.student_type)
WHERE t.accuracy >= COALESCE(s.pass_min_accuracy, 95)
  AND t.wpm >= COALESCE(s.pass_min_wpm, 40)
  AND t.lesson_id IS NOT NULL
GROUP BY t.user_id, t.lesson_id
ON CONFLICT (user_id, lesson_id) DO NOTHING;
