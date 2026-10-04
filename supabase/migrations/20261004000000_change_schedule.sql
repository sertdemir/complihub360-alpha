-- ════════════════════════════════════════════════════════════════════════════
-- „Gilt ab": geplante Konditionsaenderungen (Spec A §18, Canvas 2026-10-04)
-- ════════════════════════════════════════════════════════════════════════════
--
-- `effective_at` gibt es seit dem Datenmodell; bisher stand dort nur der
-- Zeitpunkt der Freigabe. Ab jetzt heisst es "geplant ab". Ein Vorgang mit
-- effect = 'held' und status = 'approved', der noch nicht uebernommen ist
-- (applied_at leer), ist eingeplant — der Waechter-Lauf uebernimmt ihn am
-- Datum (changeSchedule.ts). Ohne Datum gaebe es fuer ihn keinen Tag, an dem
-- er gilt; das schliesst die Bedingung unten aus.
--
-- Der Teilindex traegt genau die Abfrage des Waechters: faellige, noch nicht
-- uebernommene, freigegebene Vorgaenge nach Datum.

ALTER TABLE public.provider_change_requests
  DROP CONSTRAINT IF EXISTS provider_change_requests_scheduled_has_date;
ALTER TABLE public.provider_change_requests
  ADD CONSTRAINT provider_change_requests_scheduled_has_date CHECK (
    NOT (effect = 'held' AND status = 'approved' AND applied_at IS NULL AND effective_at IS NULL)
  );

CREATE INDEX IF NOT EXISTS provider_change_requests_scheduled_idx
  ON public.provider_change_requests (effective_at)
  WHERE effect = 'held' AND status = 'approved' AND applied_at IS NULL;

COMMENT ON COLUMN public.provider_change_requests.effective_at IS
  'Geplant ab (Tagesbeginn UTC). Bei held + approved + applied_at leer: eingeplant, der Waechter uebernimmt am Datum. Nach der Uebernahme: wann der Wert live ging (changeSchedule.ts).';
