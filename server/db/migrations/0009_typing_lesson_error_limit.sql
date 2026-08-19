ALTER TABLE typing_settings
  DROP CONSTRAINT IF EXISTS typing_settings_max_errors_check;

ALTER TABLE typing_settings
  ADD CONSTRAINT typing_settings_max_errors_check
  CHECK (max_errors BETWEEN 3 AND 100);

ALTER TABLE typing_difficulty_overrides
  DROP CONSTRAINT IF EXISTS typing_difficulty_overrides_errors_check;

ALTER TABLE typing_difficulty_overrides
  ADD CONSTRAINT typing_difficulty_overrides_errors_check
  CHECK (max_errors BETWEEN 3 AND 100);
