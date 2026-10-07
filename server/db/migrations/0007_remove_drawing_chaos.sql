DELETE FROM drawing_activities
WHERE mode = 'chaos';

ALTER TABLE drawing_activities
  DROP CONSTRAINT IF EXISTS drawing_activities_mode_check;

ALTER TABLE drawing_activities
  ADD CONSTRAINT drawing_activities_mode_check
  CHECK (mode = 'individual');
