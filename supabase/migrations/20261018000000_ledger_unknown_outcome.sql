-- ─── B1: der dritte Ausgang einer Belastung ──────────────────────────────────
--
-- Silent-Failure-Durchgang 2026-10-16, Befund B1: ein Stripe-Aufruf ohne
-- Antwort (Timeout, Verbindungsabbruch, 5xx) wurde als `failed` verbucht.
-- Hatte Stripe trotzdem belastet, erstattete niemand, und der naechste
-- Versuch des Nutzers belastete mit neuem Ledger-Schluessel ein zweites Mal.
--
-- Jetzt gibt es `unknown`: „Stripe hat nicht verwertbar geantwortet". Der
-- Watcher (leadCharge.ts, runChargeReconcileTick) schaut in der Liste der
-- PaymentIntents nach und schreibt danach `failed` oder `captured` +
-- `refunded`. Solange eine Zeile `unknown` ist, sperrt `payment_unresolved`
-- den Anbieter — nicht als Strafe, sondern gegen die Doppelbelastung.
--
-- `payment_status` der Ledger-Zeile selbst bleibt `pending` (append-only);
-- der wirksame Stand ist wie immer das juengste Ereignis.

ALTER TABLE public.provider_lead_ledger_payment_events
  DROP CONSTRAINT IF EXISTS provider_lead_ledger_payment_events_status_check;
ALTER TABLE public.provider_lead_ledger_payment_events
  ADD CONSTRAINT provider_lead_ledger_payment_events_status_check
  CHECK (status IN ('pending', 'authorized', 'captured', 'failed', 'refunded', 'unknown'));

COMMENT ON COLUMN public.provider_lead_ledger_payment_events.status IS
  'Statusspur der Belastung. unknown (B1): keine verwertbare Stripe-Antwort; der Abgleich-Tick schreibt danach failed oder captured + refunded.';

COMMENT ON COLUMN public.providers.billing_block_reasons IS
  'Offene Punkte aus dem Billing-Gate (Spec §21.1): no_payment_method, incomplete_billing_info, inactive_subscription, withdrawn_authorization, overdue_invoice, account_paused — seit Phase 4 payment_failed (letzte Belastung mit dem aktuellen Zahlungsmittel gescheitert), seit B1 payment_unresolved (eine Belastung ohne verwertbare Stripe-Antwort wartet auf den Abgleich).';
