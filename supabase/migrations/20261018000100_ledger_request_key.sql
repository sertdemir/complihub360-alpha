-- ─── B8: ein Schluessel je Buchungsversuch ───────────────────────────────────
--
-- Silent-Failure-Durchgang 2026-10-16, Befund B8: zwei parallele Anfragen
-- (Doppelklick, Client-Retry) passierten alle Pruefungen, schrieben zwei
-- Ledger-Zeilen und loesten zwei PaymentIntents aus; nur der Erstattungspfad
-- raeumte hinterher auf.
--
-- Jetzt schickt der Client je Buchungsversuch einen `request_id`. Er landet
-- als `request_key` an der Ledger-Zeile, eindeutig je Nutzer. Der zweite
-- Insert mit demselben Schluessel scheitert (23505), bevor Stripe gefragt
-- wird; eine Wiederholung nach Erfolg findet die Zeile und die Buchung dazu
-- und bekommt dieselbe Antwort noch einmal. NULL bleibt erlaubt (alte
-- Clients, Enterprise-API) und ist nie doppelt.

ALTER TABLE public.provider_lead_ledger
  ADD COLUMN IF NOT EXISTS request_key text;

CREATE UNIQUE INDEX IF NOT EXISTS provider_lead_ledger_request_key_uq
  ON public.provider_lead_ledger (user_id, request_key)
  WHERE request_key IS NOT NULL;

COMMENT ON COLUMN public.provider_lead_ledger.request_key IS
  'Schluessel des Buchungsversuchs vom Client (B8). Eindeutig je user_id; der zweite Versuch mit demselben Schluessel erzeugt keine zweite Belastung, sondern findet diese Zeile.';
