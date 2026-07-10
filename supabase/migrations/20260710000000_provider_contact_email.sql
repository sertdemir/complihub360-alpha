-- Funnel completion: providers need a delivery address for magic-link e-mails.
-- Nullable on purpose — providers without an address fall back to the
-- e-mail outbox log (no send attempt, event_log records the gap).

ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS contact_email text;

COMMENT ON COLUMN public.providers.contact_email IS
  'Delivery address for engagement notifications (magic-link e-mails). Not exposed via the public read policy consumers use for matching.';
