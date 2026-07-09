-- P0 remediation (Backend-Konzil 2026-06-25, findings #1 + #2)
-- 1. Consolidate engagement_requests onto the canonical v1 status vocabulary
--    and remove the open v2 policies that were applied against the v1 table.
-- 2. Introduce magic_link_tokens so provider magic links become signed,
--    expiring, single-use credentials instead of guessable engagement UUIDs.

-- ── 1. engagement_requests consolidation ────────────────────────────────────
-- Canonical status set = the contract set from packages/types/src/engagement.ts:
-- created | delivered | viewed | confirmed | replied | declined | expired.
-- The v2 migration's CREATE TABLE body never materialized (IF NOT EXISTS), but
-- its policies did. Drop them; keep the own-row policies from v1.
DROP POLICY IF EXISTS "Anyone can create engagement requests" ON public.engagement_requests;
DROP POLICY IF EXISTS "Users can view own engagement requests" ON public.engagement_requests;

-- Preserve the one useful v2 addition: an optional wizard session reference.
ALTER TABLE public.engagement_requests ADD COLUMN IF NOT EXISTS session_id text;

-- Re-assert the canonical CHECK (idempotent: drop + re-add under a fixed name)
-- so any environment that materialized the v2 vocabulary converges on v1.
ALTER TABLE public.engagement_requests DROP CONSTRAINT IF EXISTS engagement_requests_status_check;
UPDATE public.engagement_requests SET status = 'confirmed' WHERE status = 'accepted';
UPDATE public.engagement_requests SET status = 'created' WHERE status = 'pending';
ALTER TABLE public.engagement_requests
  ADD CONSTRAINT engagement_requests_status_check
  CHECK (status IN ('created', 'delivered', 'viewed', 'confirmed', 'replied', 'declined', 'expired'));

-- ── 2. magic_link_tokens ─────────────────────────────────────────────────────
-- One row per issued link. Only the SHA-256 hash is stored; the raw token
-- travels in the e-mail link. Expiring (24h default at issuance) + single-use.
CREATE TABLE IF NOT EXISTS public.magic_link_tokens (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  engagement_id uuid NOT NULL REFERENCES public.engagement_requests(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('confirm', 'reply', 'decline')),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_hash ON public.magic_link_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_engagement ON public.magic_link_tokens(engagement_id);

-- Service-role only: RLS enabled with no policies → anon/authenticated cannot
-- read or write token rows; the API and edge functions use the service key.
ALTER TABLE public.magic_link_tokens ENABLE ROW LEVEL SECURITY;
