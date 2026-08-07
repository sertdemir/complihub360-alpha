-- Signup adoption (Wave A3 / backlog "Signup-Adoption"):
-- when a guest registers or signs in with real Supabase auth, the API
-- (POST /api/v1/auth/adopt) upserts their public.users row and backfills
-- sessions.user_id for every session anchored to their guest_key.
--
-- The live schema already carries everything this feature needs
-- (users.email/created_at from 20260304000000, sessions.user_id + guest
-- index from 20260711000000). All statements below are idempotent guards
-- so the migration is a safe no-op on an up-to-date database.

-- users: adoption upsert writes id + email (id references auth.users).
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;

-- sessions: adoption rewires guest rows onto the account.
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_sessions_guest ON public.sessions(guest_key);

-- New: fast lookup of not-yet-claimed guest sessions during adoption.
CREATE INDEX IF NOT EXISTS idx_sessions_guest_unclaimed
  ON public.sessions(guest_key)
  WHERE user_id IS NULL;
