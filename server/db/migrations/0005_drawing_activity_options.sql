ALTER TABLE drawing_activities
  ADD COLUMN IF NOT EXISTS instructions TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS background_color TEXT NOT NULL DEFAULT '#ffffff';

ALTER TABLE drawing_activities
  ADD CONSTRAINT drawing_activities_instructions_check
    CHECK (char_length(instructions) <= 500),
  ADD CONSTRAINT drawing_activities_background_color_check
    CHECK (background_color ~ '^#[0-9a-fA-F]{6}$');
