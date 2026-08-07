-- Wave A (wiring map A1): wizard sessions become persistent, editable dossiers.
-- Guests anchor via guest_key (random client id); on registration the account
-- adopts the guest sessions (user_id backfill — Wave A3).

CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  guest_key text,
  country text,
  markets text[],
  categories text[],
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  risk_summary jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_guest ON public.sessions(guest_key);

-- Own-row read for registered users; guest access only via the service role
-- (the API scopes by guest_key — anon clients cannot query the table).
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own sessions" ON public.sessions;
CREATE POLICY "Users can read own sessions" ON public.sessions FOR SELECT USING (auth.uid() = user_id);
