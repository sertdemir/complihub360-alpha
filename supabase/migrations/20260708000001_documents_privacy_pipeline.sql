-- P0 remediation (Backend-Konzil 2026-06-25, finding #5: document privacy pipeline)
-- Documents table wired to the redaction library: only the SANITIZED content is
-- persisted here (raw uploads go to the raw vault, never to this table). The
-- AI gate (sanitized_ready + ai_allowed) becomes enforceable data.

CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  engagement_id uuid REFERENCES public.engagement_requests(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  filename text NOT NULL,
  mime_type text,
  content_sanitized text NOT NULL,
  redaction_report jsonb NOT NULL,
  classification text NOT NULL CHECK (classification IN ('public', 'internal', 'confidential', 'restricted')),
  sanitized_ready boolean NOT NULL DEFAULT false,
  ai_allowed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_documents_engagement ON public.documents(engagement_id);
CREATE INDEX IF NOT EXISTS idx_documents_user ON public.documents(user_id);

-- Own-row read for users; writes only via the service role (API applies the
-- redaction gate before any insert — no client-side inserts).
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own documents" ON public.documents;
CREATE POLICY "Users can read own documents" ON public.documents FOR SELECT USING (auth.uid() = user_id);
