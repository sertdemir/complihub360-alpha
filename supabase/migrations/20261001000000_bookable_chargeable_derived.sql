-- ════════════════════════════════════════════════════════════════════════════
-- Zahlungsbereitschaft wird berechnet — und verlaesst die View
-- Nutzer-Entscheidungen 2026-10-01 · Ticket TKT-PROV-06
-- ════════════════════════════════════════════════════════════════════════════
--
-- BEFUND. `providers.billing_ready` hatte DEFAULT false und KEINEN Schreiber:
-- im ganzen Repository nur Lesezugriffe und Fixtures. `bookable_chargeable`
-- meldete damit fuer jeden Anbieter false, und jeder Buchungsversuch endete in
-- 409 BILLING_NOT_READY. Auf Staging am 2026-10-01 nachgezaehlt: 4 Anbieter,
-- 0 mit billing_ready, 0 buchbare Zeilen.
--
-- ENTSCHEIDUNG. Buchbar ist, wer einen laufenden bezahlten Tarif hat, und das
-- wird bei jeder Abfrage neu bestimmt statt als Flag gepflegt.
--
-- WARUM NICHT HIER IM VIEW. Naheliegend waere, es im View zu berechnen. Das
-- scheitert an einem Waechter, den jemand aus guten Gruenden gesetzt hat:
-- 04_provider_pricing_test.sql prueft, dass die View von KEINER Pricing-Tabelle
-- abhaengt — "wer das Abo je in die Sichtbarkeit zieht, scheitert hier". Der
-- Waechter kann SELECT-Liste und WHERE nicht unterscheiden, und ihn zu
-- lockern, um die eigene Loesung durchzulassen, waere das Falscheste: die
-- Regel dahinter ist §14. Deshalb verlaesst `bookable_chargeable` die View,
-- und die Frage "kann abgerechnet werden" beantwortet die API an einer Stelle
-- (chargeableFromSubscription in billing.ts, rein und getestet).
--
-- Die View behaelt damit genau eine Aufgabe: darf dieser Anbieter erscheinen.
-- Die Abrechnung redet dort nicht mehr mit — auch nicht als gemeldete Spalte.
--
-- WAS §21.1 NENNT UND NOCH FEHLT — bewusst, nicht vergessen:
--   · Gueltige Zahlungsmethode, Mandat, zurueckgezogene Ermaechtigung: dazu
--     muesste der Zahlungsdienstleister Meldungen schicken; es gibt keine
--     Stelle, die sie annimmt.
--   · Ueberfaellige Rechnung: braucht eine Kulanzfrist. Die Zahl ist am
--     2026-10-01 ausdruecklich OFFEN und zu besprechen — deshalb sperrt sie
--     nicht. Keine erfundene Frist im Code.
--   · Konto pausiert oder gesperrt: faellt schon durch das WHERE heraus.
--
-- `provider_subscriptions` hat selbst noch keinen Schreiber. Diese Migration
-- macht niemanden buchbar — sie ersetzt ein totes Flag durch eine Regel, die
-- greift, sobald ein Tarif entstehen kann.

-- CREATE OR REPLACE kann keine Spalte entfernen, deshalb DROP. Ohne CASCADE:
-- haengt doch etwas daran, soll die Migration scheitern und nicht stillschweigend
-- etwas mitreissen.
DROP VIEW IF EXISTS public.matchable_provider_services;

CREATE VIEW public.matchable_provider_services AS
SELECT
  s.id                AS service_id,
  s.provider_key,
  s.service_code,
  s.service_name,
  c.id                AS coverage_id,
  c.country_code,
  c.jurisdiction_code,
  c.limitations       AS coverage_limitations,

  -- Matching-Eingaben je Leistung, nicht je Anbieter (§10, §15)
  s.approved_synonyms,
  s.exclusions,
  s.price_min,
  s.price_max,
  s.currency,
  s.pricing_basis,
  s.response_time_hours,
  s.completion_days_estimate,
  s.capacity_status,

  -- Nebenachsen: gemeldet, nicht gefiltert.
  p.availability      AS provider_availability,
  p.lifecycle_status  AS provider_lifecycle_status,

  -- Der Bereich, in dem diese Leistung zaehlt. Bei einem Bereich er selbst,
  -- bei einer Unterkategorie der Elternbereich.
  COALESCE(sc.parent_code, sc.code) AS area_code
FROM public.provider_services s
JOIN public.provider_service_coverage c ON c.service_id = s.id
JOIN public.providers p                 ON p.provider_key = s.provider_key
JOIN public.service_categories sc       ON sc.code = s.service_code
WHERE
  (
    p.lifecycle_status IN ('active', 'limited')
    OR (p.lifecycle_status = 'reverification_due'
        AND p.reverification_grace_until IS NOT NULL
        AND p.reverification_grace_until > now())
  )
  AND s.status IN ('approved', 'limited')
  AND c.status IN ('approved', 'limited')
  AND (c.expires_at IS NULL OR c.expires_at > now());

-- Nach DROP sind Optionen und Rechte weg, also neu setzen. Der Wert wird
-- LITERAL gespeichert, deshalb `true` und nicht `on` — 03_public_access_test.sql
-- prueft darauf.
ALTER VIEW public.matchable_provider_services SET (security_invoker = true);
REVOKE ALL ON public.matchable_provider_services FROM anon, authenticated;

COMMENT ON VIEW public.matchable_provider_services IS
  'Die einzige Antwort auf "darf dieser Anbieter hier erscheinen" (Spec §3 × §4 × §19). Kein gespeichertes Flag: ein abgelaufener Nachweis oder eine entzogene Zulassung wirkt sofort, ohne dass jemand einen Status nachzieht. Seit 2026-10-01 traegt die View KEINE Abrechnungsinformation mehr — "kann abgerechnet werden" beantwortet die API aus dem laufenden Tarif (§21.1 sperrt die Buchung, nicht das Matching; §14 verbietet, dass der Zahlungsstatus über die Sichtbarkeit entscheidet). area_code rollt eine Unterkategorie auf ihren Bereich hoch, damit das Matching die Taxonomie nicht nachbauen muss.';

COMMENT ON COLUMN public.providers.billing_ready IS
  'ABGELÖST am 2026-10-01 (TKT-PROV-06). Hatte DEFAULT false und nie einen Schreiber. Die Zahlungsbereitschaft wird in der API aus provider_subscriptions berechnet; diese Spalte zu lesen ist ab jetzt ein Fehler. Sie bleibt stehen, bis entschieden ist, ob sie entfallen kann.';
