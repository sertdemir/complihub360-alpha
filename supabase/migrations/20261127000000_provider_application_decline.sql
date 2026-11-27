-- ─── Bewerbung ablehnen ──────────────────────────────────────────────────────
--
-- Nutzerentscheidung 27.11.2026: Der Admin-Bereich kann eine Bewerbung
-- ablehnen. Die Seite /provider-apply verspricht eine begruendete Antwort;
-- eine Ablehnung geht deshalb nie still: sie verschickt eine Mail mit dem
-- Grund, und erst wenn die Mail draussen ist, steht der Stand auf 'declined'.
--
--   * decline_reason ist der Text, den die Bewerberin gelesen hat, nicht eine
--     interne Notiz. So sieht das Team spaeter, was gesagt wurde.
--   * Abgelehnt ist nicht endgueltig: eine abgelehnte Bewerbung kann spaeter
--     eingeladen werden (die Felder werden dann geleert).
--   * Eine Bewerbung mit Konto ('onboarding') wird hier nicht abgelehnt; ab
--     dort entscheidet die Pruefung des Anbieters.

ALTER TABLE public.provider_applications
  ADD COLUMN IF NOT EXISTS declined_at    timestamptz,
  ADD COLUMN IF NOT EXISTS declined_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS decline_reason text;

ALTER TABLE public.provider_applications
  DROP CONSTRAINT IF EXISTS provider_applications_status_check;
ALTER TABLE public.provider_applications
  ADD CONSTRAINT provider_applications_status_check
  CHECK (status IN ('received', 'invited', 'onboarding', 'declined'));

COMMENT ON COLUMN public.provider_applications.decline_reason IS
  'Der Grund, wie er in der Mail an die Bewerberin stand.';
