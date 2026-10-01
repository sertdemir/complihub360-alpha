-- ════════════════════════════════════════════════════════════════════════════
-- Ein Abo kann entstehen — provider_subscriptions bekommt einen Schreiber
-- ════════════════════════════════════════════════════════════════════════════
--
-- Bis hierher hatte `provider_subscriptions` (aus 20260923000000) KEINEN
-- Schreiber: kein Checkout, keine Admin-Zuweisung. Damit konnte kein Tarif
-- entstehen, und weil `billingReadiness` ein laufendes Abo verlangt, war
-- niemand buchbar. Die Tabelle selbst bleibt unveraendert richtig; es fehlten
-- nur zwei Dinge am Rand.
--
-- Zeitstempel bewusst 01:00 und nicht 00:00: auf `main` liegen bereits
-- 20261001000000_booking_charge.sql und 20261001000000_market_request_notify.sql
-- mit identischem Praefix. Im Ledger ist `version` Primaerschluessel.
--
-- Was hier NICHT passiert: nichts an Preisen, nichts am Matching. Der
-- pgTAP-Waechter aus 04_provider_pricing_test.sql (Test 28) haelt jede
-- Pricing-Tabelle aus `matchable_provider_services` heraus — das Abo ist und
-- bleibt kein Sichtbarkeitsmerkmal (Spec A §14, Spec B "Ranking benefit: Never").

-- ─── 1. Das Entscheidungsprotokoll kennt jetzt 'subscription' ───────────────
--
-- Spec B: "All sensitive actions create audit logs and use versioned policies."
-- Ein Tarifwechsel gehoert in die Historie, die der Anbieter selbst sieht
-- (`GET /application` liefert `history` aus dieser Tabelle) — nicht nur ins
-- event_log, das nur wir lesen.

ALTER TABLE public.provider_review_log DROP CONSTRAINT IF EXISTS provider_review_log_subject_check;
ALTER TABLE public.provider_review_log ADD CONSTRAINT provider_review_log_subject_check
  CHECK (subject IN ('evidence', 'coverage', 'service', 'lifecycle', 'request', 'application', 'subscription'));

-- ─── 2. Woher ein Abo kommt ─────────────────────────────────────────────────
--
-- Reine Herkunftsangabe fuer die Nachvollziehbarkeit. Sie entscheidet NICHTS:
-- ein Abo aus der Admin-Zuweisung gilt genauso wie eines aus der Tarifwahl.
-- Bestehende Zeilen gibt es nicht (die Tabelle ist leer, weil sie keinen
-- Schreiber hatte), der Default deckt den Fall trotzdem ab.

ALTER TABLE public.provider_subscriptions
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'admin'
    CHECK (source IN ('provider_self_serve', 'admin'));

COMMENT ON COLUMN public.provider_subscriptions.source IS
  'Woher das Abo kommt: provider_self_serve (Tarifwahl im Portal) oder admin '
  '(Zuweisung durch CompliHub360). Reine Herkunft — entscheidet nichts.';

COMMENT ON COLUMN public.provider_subscriptions.stripe_subscription_id IS
  'Bleibt heute leer. Die Abo-GEBUEHR laeuft NICHT ueber ein Stripe-Abo, '
  'sondern ueber den Monatslauf (POST /api/v1/admin/billing/run), der je '
  'Periode eine Stripe-Rechnung ausstellt (send_invoice, 14 Tage). Wer hier je '
  'ein Stripe-Abo eintraegt, muss zuerst den Monatslauf davon ausnehmen — '
  'sonst wird zweimal abgerechnet.';
