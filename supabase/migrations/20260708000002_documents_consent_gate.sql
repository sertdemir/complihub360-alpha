-- Launch blocker (privacy review 2026-07-08): AI consent gate
-- Security & Privacy Architecture §5 requires FOUR conditions for AI
-- processing; consent (Art. 6(1)(a) / Art. 7 GDPR) was designed but not
-- enforced. Consent is captured per upload (explicit, opt-in, default false)
-- and stored on the document row so the gate decision stays auditable.

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS consent_ai boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.documents.consent_ai IS
  'Explicit user consent to AI processing of the sanitized content, given at upload. Required (with sanitized_ready + classification) for ai_allowed.';
