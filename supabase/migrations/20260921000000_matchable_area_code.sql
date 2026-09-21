-- ════════════════════════════════════════════════════════════════════════════
-- Der Bereich einer Leistung gehoert in die View, nicht in die API
-- ════════════════════════════════════════════════════════════════════════════
--
-- Damit das Matching auf `matchable_provider_services` umstellen kann, braucht
-- es eine Antwort auf "zu welchem der neun Bereiche gehoert diese Leistung?".
-- Der Wizard sendet Bereichs-Slugs ('tax-vat'); `provider_services.service_code`
-- darf aber nach §11 auch eine Unterkategorie sein ('oss-ioss'). Ohne den
-- Bereich muesste die API die Taxonomie ein zweites Mal nachbauen — und genau
-- so ist DOMAIN_TO_DB in index.ts entstanden, die Abbildung, die dieser Umbau
-- abloesen soll. Ein zweites Vokabular gegen ein drittes zu tauschen waere
-- kein Fortschritt.
--
-- `service_categories` weiss es bereits: parent_code IS NULL heisst Bereich.
-- Die View reicht es nur durch.
--
-- Der JOIN ist nicht einschraenkend: `provider_services.service_code` traegt
-- einen Fremdschluessel auf `service_categories.code`, jede Leistung hat also
-- genau eine Zeile dort. Die Anbietermenge der View aendert sich nicht.
--
-- `area_code` haengt hinten an. Das ist keine Kosmetik: CREATE OR REPLACE VIEW
-- laesst nur das zu — bestehende Spalten muessen in Name, Typ und Reihenfolge
-- bleiben. Wer hier umsortiert, bekommt einen Fehler statt eines stillen
-- Schemabruchs.

CREATE OR REPLACE VIEW public.matchable_provider_services AS
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
  p.billing_ready     AS bookable_chargeable,
  p.lifecycle_status  AS provider_lifecycle_status,

  -- Neu: der Bereich, in dem diese Leistung zaehlt. Bei einem Bereich er
  -- selbst, bei einer Unterkategorie der Elternbereich.
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

COMMENT ON VIEW public.matchable_provider_services IS
  'Die einzige Antwort auf "darf dieser Anbieter hier erscheinen" (Spec §3 × §4 × §19). Kein gespeichertes Flag: ein abgelaufener Nachweis oder eine entzogene Zulassung wirkt sofort, ohne dass jemand einen Status nachzieht. billing_ready ist absichtlich KEIN Filter — sonst entschiede der Zahlungsstatus über die Sichtbarkeit, was §14 verbietet. area_code rollt eine Unterkategorie auf ihren Bereich hoch, damit das Matching die Taxonomie nicht nachbauen muss.';
