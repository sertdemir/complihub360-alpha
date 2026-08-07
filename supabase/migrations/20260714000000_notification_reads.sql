-- Wave C (wiring map C1): per-viewer read-state watermark. "Mark all seen"
-- stores the moment; everything newer counts as unread. One row per viewer key
-- (e.g. 'provider-notifications', 'provider-requests') — keys become per-user
-- once provider auth lands.

CREATE TABLE IF NOT EXISTS public.notification_reads (
  viewer text PRIMARY KEY,
  last_seen_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- All access goes through the API (service role); no anon/user policies yet.
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;
