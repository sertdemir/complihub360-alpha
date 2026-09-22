-- ════════════════════════════════════════════════════════════════════════════
-- Die Matching-View gab preis, was die Tabellen darunter verschlossen halten
-- ════════════════════════════════════════════════════════════════════════════
--
-- BEFUND 22.09.2026, beim Einspielen von 20260920000000 auf Staging: mit dem
-- oeffentlichen anon-Schluessel liefert `matchable_provider_services` alle
-- Zeilen aus — Klarschluessel des Anbieters, Lifecycle und Abrechnungsstand
-- inklusive:
--
--   set role anon;
--   select provider_key, provider_lifecycle_status, bookable_chargeable
--     from public.matchable_provider_services;
--   -- dahlmann-cpa | active | false
--   -- madrid-tax   | active | false
--
-- Die Tabellen darunter tragen alle RLS ohne Policy, sind also dicht. Die View
-- umgeht das.
--
-- ─── Warum die Annahme in 20260920000000 falsch war ─────────────────────────
--
-- Dort steht als Begruendung, kein `security_invoker` zu setzen:
--
--   "Postgres prueft ohnehin gegen den View-Owner nur bei SECURITY DEFINER"
--
-- Das ist genau verkehrt herum. Eine View IST in Postgres per Voreinstellung
-- SECURITY DEFINER; `security_invoker` kam erst mit 15 und steht auf `off`,
-- wenn niemand es einschaltet. Die View laeuft damit als ihr Eigentuemer
-- (`postgres`) und geht an der RLS der Basistabellen vorbei — sie erbt die
-- Rechte eben NICHT, sondern ersetzt sie.
--
-- ─── Warum das mehr ist als ein Lint-Befund ─────────────────────────────────
--
-- Dieselbe Migration legt in `provider_field_visibility` fest:
--
--   ('providers.lifecycle_status', 'internal', …)
--   ('providers.billing_ready',    'billing',  …)
--
-- und der Kommentar an der View sagt, sie sei "nur ueber die Service-Rolle
-- erreichbar". Das Register verbietet also, was die View danebenstehend
-- ausliefert. Dazu §15: vor einer Buchung traegt ein Anbieter ein Pseudonym.
-- `provider_key` ist der Klarschluessel — genau das Identitaetsmerkmal, das
-- die Anonymisierung in der API herausrechnet.
--
-- ─── Die Aenderung ──────────────────────────────────────────────────────────
--
-- Zweimal dasselbe Ziel, damit es nicht an einer einzigen Einstellung haengt:
--
--   1. `security_invoker = on` — die View fragt mit den Rechten des Aufrufers.
--      anon und authenticated haben keine Policy auf den Basistabellen und
--      sehen damit null Zeilen, statt alle.
--   2. REVOKE fuer anon und authenticated — was ohnehin niemand lesen darf,
--      braucht auch kein Recht darauf. `service_role` behaelt seins; die
--      compliance-api laeuft darueber.
--
-- Es bricht nichts: die Umstellung des Matchings auf diese View steht noch
-- aus (Punkt 1 unter "Was als Naechstes ansteht" in 20260920000000), heute
-- liest sie niemand.

ALTER VIEW public.matchable_provider_services SET (security_invoker = on);

REVOKE ALL ON public.matchable_provider_services FROM anon, authenticated;

COMMENT ON VIEW public.matchable_provider_services IS
  'Die einzige Antwort auf "darf dieser Anbieter hier erscheinen" (Spec §3 × §4 × §19). Kein gespeichertes Flag: ein abgelaufener Nachweis oder eine entzogene Zulassung wirkt sofort, ohne dass jemand einen Status nachzieht. billing_ready ist absichtlich KEIN Filter — sonst entschiede der Zahlungsstatus über die Sichtbarkeit, was §14 verbietet. area_code rollt eine Unterkategorie auf ihren Bereich hoch, damit das Matching die Taxonomie nicht nachbauen muss. security_invoker = on: die View fragt mit den Rechten des Aufrufers und geht NICHT an der RLS der Basistabellen vorbei — ohne das liefert sie mit dem anon-Schlüssel provider_key und Abrechnungsstand aus.';
