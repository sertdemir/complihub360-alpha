-- Wave B (wiring map B1/B2/B11): the engagement thread. Every reply — from the
-- dashboard or via magic link — lands here, so both sides see one history.

CREATE TABLE IF NOT EXISTS public.engagement_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  engagement_id uuid NOT NULL REFERENCES public.engagement_requests(id) ON DELETE CASCADE,
  author text NOT NULL CHECK (author IN ('user', 'provider', 'system')),
  body text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_engagement_messages_engagement
  ON public.engagement_messages(engagement_id, created_at);

-- Reads/writes go through the API (service role); registered users read rows
-- of their own engagements once real user linkage lands.
ALTER TABLE public.engagement_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own engagement messages" ON public.engagement_messages;
CREATE POLICY "Users read own engagement messages" ON public.engagement_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.engagement_requests e WHERE e.id = engagement_id AND e.user_id = auth.uid()));
