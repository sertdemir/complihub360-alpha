-- User-Flow v2 / Matchmaking (docs/backlog/user-flow-matchmaking-v2-spec.md §7):
-- provider billing model + full pricing table + anonymized listing attributes,
-- native scheduling (bookings) and two-sided reviews.

-- 1. Providers: billing model (on the card) + full pricing table (detail page only)
--    + provider-entered anonymized listing attributes.
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS billing_model text NOT NULL DEFAULT 'project'
    CHECK (billing_model IN ('abo', 'hourly', 'project', 'mixed')),
  ADD COLUMN IF NOT EXISTS pricing_table jsonb,               -- full price structure; revealed only on the (monetised) detail page
  ADD COLUMN IF NOT EXISTS pseudonym_label text,              -- anonymized label, e.g. "Verifizierte Steuerkanzlei · Norditalien"
  ADD COLUMN IF NOT EXISTS region text,                       -- coarse region only, e.g. "Norditalien"
  ADD COLUMN IF NOT EXISTS active_since integer,              -- year, e.g. 2015
  ADD COLUMN IF NOT EXISTS rating numeric(2,1) DEFAULT 0,     -- 0.0 – 5.0
  ADD COLUMN IF NOT EXISTS completed_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_response_hours numeric(5,1),
  ADD COLUMN IF NOT EXISTS confirmation_rate numeric(4,3);    -- 0 .. 1, feeds the quality score

-- 2. Scheduling (bookings) — native scheduling; calendar sync (P4) wired later.
--    Booking = the paid lead + the point identity is revealed (Stufe 3).
CREATE TABLE IF NOT EXISTS public.scheduling (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key text NOT NULL REFERENCES public.providers(provider_key),
  user_id uuid REFERENCES auth.users(id),
  guest_key text,                                             -- pre-registration anchoring (rare; booking normally requires auth)
  slot_start timestamptz NOT NULL,
  slot_end timestamptz,
  status text NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
  message text,
  lead_charged boolean NOT NULL DEFAULT false,               -- provider billed for this lead
  identity_revealed boolean NOT NULL DEFAULT false,          -- name+contact exchanged (Stufe 3)
  reminder_24h_sent boolean NOT NULL DEFAULT false,
  reminder_1h_sent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS scheduling_provider_idx ON public.scheduling(provider_key);
CREATE INDEX IF NOT EXISTS scheduling_user_idx ON public.scheduling(user_id);
CREATE INDEX IF NOT EXISTS scheduling_slot_idx ON public.scheduling(slot_start);

-- 3. Reviews — two-sided, only from real bookings. Feeds provider quality score
--    (user->provider) and internal lead-quality (provider->user).
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.scheduling(id),
  provider_key text REFERENCES public.providers(provider_key),
  from_role text NOT NULL CHECK (from_role IN ('user', 'provider')),
  to_role text NOT NULL CHECK (to_role IN ('user', 'provider')),
  rating numeric(2,1),
  categories text[],
  body text,
  verified boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reviews_provider_idx ON public.reviews(provider_key);
CREATE INDEX IF NOT EXISTS reviews_booking_idx ON public.reviews(booking_id);

-- RLS: deny-all to anon/authenticated; all access is server-side via the
-- compliance-api service role (same posture as magic_link_tokens / documents).
ALTER TABLE public.scheduling ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- New monetisation / lifecycle event types (event_log.type is free text, no
-- schema change needed): provider_detail_opened, scheduling_started,
-- scheduling_confirmed, provider_lead_charged, reminder_24h, reminder_1h,
-- provider_cancelled, user_cancelled, outcome_check, review_request,
-- review_submitted, no_show.
