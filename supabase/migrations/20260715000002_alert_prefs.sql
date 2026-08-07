-- Wave B15: per-owner alert preferences (Configure-Alerts drawer). Owner key is
-- the guest_key today and the user id once accounts adopt guest sessions.

CREATE TABLE IF NOT EXISTS public.alert_prefs (
  owner_key text PRIMARY KEY,
  prefs jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- All access goes through the API (service role).
ALTER TABLE public.alert_prefs ENABLE ROW LEVEL SECURITY;
