-- Wave B13: user-editable session name (rename in the Session-Actions drawer).
-- Falls back to "<category> · <country>" in the UI when null.

ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS label text;
