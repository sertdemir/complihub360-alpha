-- Wave B8: change of the provider contact e-mail with a verify step. The new
-- address must click a single-use link (1h expiry) before the change applies —
-- the old address stays active until then. Only the SHA-256 hash is stored.

CREATE TABLE IF NOT EXISTS public.email_change_tokens (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_key text NOT NULL,
  new_email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- All access goes through the API (service role).
ALTER TABLE public.email_change_tokens ENABLE ROW LEVEL SECURITY;
