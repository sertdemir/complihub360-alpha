-- Wave C2: real availability toggle. 'ooo' pauses routing (requests re-route,
-- ranking frozen); ooo_until is informational — "End early" clears it anytime.

ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS availability text NOT NULL DEFAULT 'available'
    CHECK (availability IN ('available', 'ooo')),
  ADD COLUMN IF NOT EXISTS ooo_until timestamp with time zone;
