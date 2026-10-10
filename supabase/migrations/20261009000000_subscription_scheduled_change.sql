-- ─── Tarifwechsel und Kündigung bekommen einen vorgemerkten Zustand ─────────
--
-- ADR-0006, Wahl B2 und C2 (Nutzer, 2026-10-07): Beides wirkt zum
-- Verlängerungstermin, nicht sofort. Bis dahin läuft das Abo unverändert
-- weiter — bezahlt ist bezahlt, und die Rücknahme bleibt möglich.
--
-- Der Stichtag ist `renewal_date`, NICHT `current_period_end`. Die beiden sind
-- nur bei monatlicher Zahlweise dasselbe: `current_period_*` ist der
-- Monatszyklus, an dem der Rabattzähler hängt, `renewal_date` der
-- Verlängerungstermin. Wer sie verwechselt, beendet ein bezahltes Jahresabo
-- nach vier Wochen.
--
-- Warum eigene Spalten und NICHT `status = 'cancelled'`:
-- `status` ist im Code eine Aussage über das JETZT. `billingReadiness` setzt
-- bei 'cancelled' den Grund `inactive_subscription`, und
-- `subscriptionChargeForPeriod` liefert dann keine Abo-Zeile mehr. Eine
-- vorgemerkte Kündigung über den Status abzubilden hiesse: der Anbieter
-- verliert die Buchbarkeit in der Sekunde, in der er kündigt, und wird für den
-- Rest der bezahlten Periode nicht mehr abgerechnet. Genau das Gegenteil von
-- "läuft bis zum Stichtag". Der Status bleibt deshalb 'active', bis der
-- Stichtag erreicht ist.

ALTER TABLE public.provider_subscriptions
  ADD COLUMN IF NOT EXISTS scheduled_action       text,
  ADD COLUMN IF NOT EXISTS scheduled_plan_code    text,
  ADD COLUMN IF NOT EXISTS scheduled_plan_version integer,
  ADD COLUMN IF NOT EXISTS scheduled_cadence      text,
  ADD COLUMN IF NOT EXISTS scheduled_effective_on date,
  ADD COLUMN IF NOT EXISTS scheduled_requested_at timestamptz;

-- Die Vormerkung ist entweder ganz da oder gar nicht. Ein halber Zustand
-- (Aktion ohne Stichtag, Zieltarif ohne Aktion) waere eine Zeile, die der
-- Waechter-Lauf nicht ausfuehren kann und niemand bemerkt.
ALTER TABLE public.provider_subscriptions
  DROP CONSTRAINT IF EXISTS provider_subscriptions_scheduled_coherent;
ALTER TABLE public.provider_subscriptions
  ADD CONSTRAINT provider_subscriptions_scheduled_coherent CHECK (
    (scheduled_action IS NULL
       AND scheduled_plan_code IS NULL AND scheduled_plan_version IS NULL
       AND scheduled_cadence IS NULL AND scheduled_effective_on IS NULL
       AND scheduled_requested_at IS NULL)
    OR (scheduled_action = 'cancellation'
       AND scheduled_plan_code IS NULL AND scheduled_plan_version IS NULL
       AND scheduled_cadence IS NULL
       AND scheduled_effective_on IS NOT NULL AND scheduled_requested_at IS NOT NULL)
    OR (scheduled_action = 'plan_change'
       AND scheduled_plan_code IS NOT NULL AND scheduled_plan_version IS NOT NULL
       AND scheduled_cadence IN ('monthly', 'annual')
       AND scheduled_effective_on IS NOT NULL AND scheduled_requested_at IS NOT NULL)
  );

ALTER TABLE public.provider_subscriptions
  DROP CONSTRAINT IF EXISTS provider_subscriptions_scheduled_plan_fk;
ALTER TABLE public.provider_subscriptions
  ADD CONSTRAINT provider_subscriptions_scheduled_plan_fk
  FOREIGN KEY (scheduled_plan_code, scheduled_plan_version)
  REFERENCES public.plan_catalog(code, version);

-- Der Waechter-Lauf sucht faellige Vormerkungen; ohne Index liest er dafuer
-- die ganze Tabelle.
CREATE INDEX IF NOT EXISTS provider_subscriptions_scheduled_due_idx
  ON public.provider_subscriptions (scheduled_effective_on)
  WHERE scheduled_action IS NOT NULL AND ended_at IS NULL;

COMMENT ON COLUMN public.provider_subscriptions.scheduled_action IS
  'Vorgemerkter Vorgang zum Verlaengerungstermin: plan_change oder cancellation (ADR-0006 B2/C2). NULL = nichts vorgemerkt. Bis zur Ausfuehrung bleibt status unveraendert ''active'' — der Anbieter behaelt Buchbarkeit und Abrechnung bis zum Stichtag.';

COMMENT ON COLUMN public.provider_subscriptions.scheduled_effective_on IS
  'Der Stichtag, zu dem die Vormerkung wirkt — gesetzt aus renewal_date, NICHT aus current_period_end. Bei jaehrlicher Zahlweise liegen die beiden bis zu elf Monatszyklen auseinander.';

COMMENT ON COLUMN public.provider_subscriptions.scheduled_requested_at IS
  'Wann der Anbieter die Vormerkung ausgeloest hat. Bis zum Stichtag ruecknehmbar; die Ruecknahme setzt alle scheduled_*-Spalten zurueck auf NULL.';
