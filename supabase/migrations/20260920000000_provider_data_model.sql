-- ─── Das Anbieter-Datenmodell: drei Statusachsen, eine abgeleitete Wahrheit ──
--
-- Grundlage: "Provider Verification and Dashboard Implementation Specification"
-- v1.0 (20.09.2026). Das Dokument beschreibt Verhalten sehr genau und Struktur
-- gar nicht — es nennt rund 200 Felder in Prosa-Tabellen, aber keine Entitaet,
-- keine Kardinalitaet, keinen Zustandsuebergang. Diese Migration ist die
-- Uebersetzung.
--
-- ─── Das Problem, das zuerst geloest werden muss ─────────────────────────────
--
-- Die Spec nennt an drei Stellen einen Status, ohne zu sagen, welcher gewinnt:
--
--   §3  Provider-Lifecycle, elf Werte. "Limited → Partially matchable" und
--       "Reverification due → Configurable" sind dabei keine Zustaende,
--       sondern offene Fragen im Tabellenformat.
--   §4  "Approval must be granular: a provider may be approved for one service
--       and country but not another."
--   §19 Ein neuer Service startet in "Pending Verification" und ist bis zur
--       Freigabe nicht matchbar.
--
-- Wer daraus ein Schema baut, muss entscheiden: gilt der Provider-Status, der
-- Service-Status oder die Freigabe je Land? Die Antwort hier: alle drei, und
-- keiner davon allein.
--
-- Die drei Achsen bleiben getrennt, weil sie verschiedene Fragen beantworten:
--
--   providers.lifecycle_status        Darf dieses Konto ueberhaupt?
--   provider_services.status          Ist diese Leistung geprueft?
--   provider_service_coverage.status  Ist sie in DIESEM Markt freigegeben?
--
-- "Matchbar" ist dann kein viertes Flag, das jemand konsistent halten muesste,
-- sondern eine UND-Kette in der View `matchable_provider_services`. Ein Flag
-- waere die naheliegende Loesung und die falsche: sobald ein Zeugnis ablaeuft,
-- eine Zulassung entzogen wird oder eine Rechnung offen bleibt, muesste es
-- jemand nachziehen — und genau das vergisst man. Eine View kann nicht
-- veralten.
--
-- ─── Was NICHT in dieser Migration steckt ───────────────────────────────────
--
-- Die Spec priorisiert in §29 P0 und P1 so breit, dass beides zusammen das
-- ganze Produkt ist. Hier steht nur, was Software sein MUSS, weil es sich
-- nachtraeglich teuer einbaut:
--
--   Sichtbarkeitsklassen · Aktivierungs-Gate · Nachweis-Kette ·
--   Aenderungsprotokoll mit Vorher/Nachher · Preis-Schnappschuss
--
-- Review-Arbeitsplatz (§25), Performance-Schleife (§17), Widerspruchs-Workflow
-- (§24) und neun der zwoelf Dashboard-Module (§16) fehlen absichtlich. Bei
-- einer zweistelligen Zahl handverlesener Anbieter macht ein Mensch die
-- Pruefung besser als eine Queue, und der Prozess laesst sich spaeter
-- automatisieren, ohne das Schema anzufassen.
--
-- ─── Rueckwaertskompatibilitaet ─────────────────────────────────────────────
--
-- `providers.partner_status` bleibt. Das laufende Matching in
-- services/compliance-api/src/index.ts filtert darauf, und eine Migration, die
-- das Matching mitbricht, ist keine. Stattdessen: `lifecycle_status` wird aus
-- `partner_status` befuellt, die bestehenden `categories`/`countries_supported`
-- werden zu echten Service- und Coverage-Zeilen aufgeloest, und die View ist
-- ab dem ersten Tag nicht leer. Die Umstellung des Matchings auf die View ist
-- eine Verhaltensaenderung und gehoert in einen eigenen Schritt.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. Sichtbarkeitsklassen (§13)
-- ════════════════════════════════════════════════════════════════════════════
--
-- Die Spec verlangt: "Tag every field as public, anonymous, revealed, internal,
-- confidential verification or billing." Ein Tag allein ist allerdings eine
-- Bitte, keine Kontrolle — es wirkt nur, wenn die API-Schicht danach fragt.
-- Deshalb zwei Ebenen: dieses Register sagt, welche Klasse ein Feld hat, und
-- die vertraulichen Felder liegen zusaetzlich in einer eigenen Tabelle mit
-- deny-all RLS (siehe Abschnitt 7). Wer die falsche Tabelle joint, bekommt
-- nichts — nicht bloss ein schlechtes Gewissen.

CREATE TABLE IF NOT EXISTS public.provider_field_visibility (
  field_path        text PRIMARY KEY,          -- 'providers.name', 'provider_services.price_min'
  visibility_class  text NOT NULL CHECK (visibility_class IN (
                      'anonymous',    -- vor der Buchung sichtbar
                      'revealed',     -- erst nach Buchung
                      'internal',     -- Matching und autorisierte Mitarbeit
                      'confidential', -- Verifikation, Identitaet, Eigentum
                      'billing')),    -- Zahlung und Rechnung
  note              text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.provider_field_visibility IS
  'Feld → Sichtbarkeitsklasse (Spec §13). Die API-Schicht liest hieraus, welche Felder eine Antwort tragen darf; ein neues Feld ohne Eintrag gilt als "internal" und erscheint nirgends.';

-- ════════════════════════════════════════════════════════════════════════════
-- 2. Kontrollierte Taxonomie (§11)
-- ════════════════════════════════════════════════════════════════════════════
--
-- "Controlled taxonomy provides the primary matching structure." Bisher liegen
-- die Bereiche als Slug-Strings im API-Code (DOMAIN_TO_DB in index.ts) und die
-- Anbieter-Kategorien als text[] auf der Zeile. Damit kann kein Reviewer eine
-- Leistung freigeben, denn es gibt nichts, worauf eine Freigabe zeigen koennte.
--
-- Die `code`-Werte sind bewusst die Slugs, die der Wizard heute schon sendet.
-- Umbenennen waere sauberer und wuerde die laufende Suche brechen; die
-- korrigierten Begriffe aus der Terminologie-Liste stehen deshalb in
-- `label_en`, nicht im Schluessel.
--
-- ABWEICHUNG, die eine Entscheidung braucht: Spec §11 listet acht Bereiche,
-- die Plattform fuehrt neun. Die Spec fasst EPR und Verpackung zusammen, im
-- Code sind 'product-packaging' und 'environment' getrennt (WEEE, REACH,
-- Batterien laufen ueber 'environment'). Hier bleiben es neun, weil das dem
-- laufenden Routing entspricht — zusammenlegen ginge, Auseinanderziehen nicht.

CREATE TABLE IF NOT EXISTS public.service_categories (
  code         text PRIMARY KEY,
  parent_code  text REFERENCES public.service_categories(code),
  label_en     text NOT NULL,
  active       boolean NOT NULL DEFAULT true,
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS service_categories_parent_idx
  ON public.service_categories(parent_code);

COMMENT ON TABLE public.service_categories IS
  'Kontrollierte Leistungs-Taxonomie (Spec §11). Zwei Ebenen: parent_code IS NULL = Bereich, sonst Unterkategorie. Die Codes sind die Slugs, die der Wizard sendet; label_en traegt die freigegebenen Begriffe.';

-- Bereiche. `label_en` folgt der Terminologie-Liste der Acceptance-Checklist:
-- "Company Setup & Filings" statt "Corporate & Structure", "Legal Support"
-- statt "Legal Advisory". Die Slugs bleiben, weil der Wizard sie sendet.
INSERT INTO public.service_categories (code, parent_code, label_en, sort_order) VALUES
  ('tax-vat',             NULL, 'Tax and VAT',                1),
  ('product-packaging',   NULL, 'EPR and Packaging',          2),
  ('data-privacy',        NULL, 'Data and Privacy',           3),
  ('marketing-seo',       NULL, 'Marketing Compliance',       4),
  ('corporate-structure', NULL, 'Company Setup and Filings',  5),
  ('product-compliance',  NULL, 'Product Compliance',         6),
  ('logistics-customs',   NULL, 'Logistics and Customs',      7),
  ('legal-advisory',      NULL, 'Legal Support',              8),
  ('environment',         NULL, 'Environment and Substances', 9)
ON CONFLICT (code) DO NOTHING;

-- Unterkategorien aus Spec §11. WEEE, Batterien und REACH stehen dort unter
-- "EPR and Packaging", hier unter 'environment' — so routet der Code heute
-- (DOMAIN_TO_DB), und ein Anbieter, der nur Verpackung macht, ist kein
-- Stoffrecht-Anbieter.
INSERT INTO public.service_categories (code, parent_code, label_en, sort_order) VALUES
  ('tax-vat.registrations',              'tax-vat', 'VAT registrations',              1),
  ('tax-vat.returns',                    'tax-vat', 'VAT returns',                    2),
  ('tax-vat.oss-ioss',                   'tax-vat', 'OSS and IOSS',                   3),
  ('tax-vat.fiscal-representation',      'tax-vat', 'Fiscal representation',          4),
  ('tax-vat.deregistration',             'tax-vat', 'Deregistration',                 5),
  ('tax-vat.transaction-review',         'tax-vat', 'Transaction review',             6),
  ('tax-vat.threshold-monitoring',       'tax-vat', 'Threshold monitoring',           7),

  ('product-packaging.packaging',        'product-packaging', 'Packaging registration',   1),
  ('product-packaging.reporting',        'product-packaging', 'EPR reporting',            2),
  ('product-packaging.take-back',        'product-packaging', 'Take-back schemes',        3),
  ('product-packaging.eco-fees',         'product-packaging', 'Eco-fees',                 4),
  ('product-packaging.authorized-rep',   'product-packaging', 'Authorized representation', 5),

  ('data-privacy.assessments',           'data-privacy', 'Privacy assessments',       1),
  ('data-privacy.notices',               'data-privacy', 'Privacy notices',           2),
  ('data-privacy.ropa',                  'data-privacy', 'Records of processing',     3),
  ('data-privacy.dpia',                  'data-privacy', 'Data protection impact assessments', 4),
  ('data-privacy.dpa',                   'data-privacy', 'Data processing agreements', 5),
  ('data-privacy.transfers',             'data-privacy', 'International transfers',   6),
  ('data-privacy.rights-requests',       'data-privacy', 'Rights requests',           7),
  ('data-privacy.breach-support',        'data-privacy', 'Breach support',            8),

  ('marketing-seo.cookies',              'marketing-seo', 'Cookies and tracking',     1),
  ('marketing-seo.consent',              'marketing-seo', 'Consent management',       2),
  ('marketing-seo.email-sms',            'marketing-seo', 'Email and SMS compliance', 3),
  ('marketing-seo.advertising-claims',   'marketing-seo', 'Advertising claims',       4),
  ('marketing-seo.influencer-affiliate', 'marketing-seo', 'Influencer and affiliate disclosures', 5),
  ('marketing-seo.suppression',          'marketing-seo', 'Suppression processes',    6),

  ('corporate-structure.formation',      'corporate-structure', 'Company formation',  1),
  ('corporate-structure.qualification',  'corporate-structure', 'Foreign qualification', 2),
  ('corporate-structure.annual-filings', 'corporate-structure', 'Annual filings',     3),
  ('corporate-structure.ownership-filings','corporate-structure','Ownership filings', 4),
  ('corporate-structure.registered-agent','corporate-structure','Registered agent',   5),
  ('corporate-structure.restructuring',  'corporate-structure', 'Restructuring',      6),
  ('corporate-structure.closure',        'corporate-structure', 'Closure',            7),

  ('product-compliance.gpsr',            'product-compliance', 'GPSR',                1),
  ('product-compliance.ce-marking',      'product-compliance', 'CE marking',          2),
  ('product-compliance.testing',         'product-compliance', 'Product testing',     3),
  ('product-compliance.documentation',   'product-compliance', 'Technical documentation', 4),
  ('product-compliance.labeling',        'product-compliance', 'Labeling',            5),
  ('product-compliance.responsible-person','product-compliance','Responsible person', 6),
  ('product-compliance.recalls',         'product-compliance', 'Recalls',             7),

  ('logistics-customs.customs-registration','logistics-customs','Customs registration', 1),
  ('logistics-customs.classification',   'logistics-customs', 'Tariff classification', 2),
  ('logistics-customs.declarations',     'logistics-customs', 'Customs declarations', 3),
  ('logistics-customs.broker',           'logistics-customs', 'Broker services',      4),
  ('logistics-customs.import-export',    'logistics-customs', 'Import and export',    5),
  ('logistics-customs.3pl',              'logistics-customs', 'Third-party logistics', 6),
  ('logistics-customs.warehousing',      'logistics-customs', 'Warehousing',          7),

  ('environment.weee',                   'environment', 'WEEE',                       1),
  ('environment.batteries',              'environment', 'Batteries',                  2),
  ('environment.reach',                  'environment', 'REACH and substances',       3)
ON CONFLICT (code) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. Anbieter-Lifecycle (§3)
-- ════════════════════════════════════════════════════════════════════════════
--
-- Elf Werte aus der Spec. Zwei davon waren dort keine Zustaende, sondern
-- Fragen — sie werden hier beantwortet:
--
--   'limited'             Die Spec sagt "Partially matchable". Das heisst hier:
--                         das Konto blockiert nicht mehr, die Entscheidung
--                         faellt allein auf Coverage-Ebene. Welche Leistung in
--                         welchem Markt noch laeuft, steht dort — nicht in
--                         einer zweiten Liste auf der Anbieter-Zeile.
--   'reverification_due'  Die Spec sagt "Configurable". Konkret: matchbar
--                         solange `reverification_grace_until` in der Zukunft
--                         liegt. Ist das Feld NULL oder vergangen, ist Schluss.
--                         Das Risiko steuert die Laenge der Frist, nicht ihr
--                         Vorhandensein.

ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS lifecycle_status text NOT NULL DEFAULT 'draft'
    CHECK (lifecycle_status IN (
      'draft',                  -- Antrag begonnen, nicht eingereicht
      'submitted',              -- vollstaendig, wartet auf Erstpruefung
      'more_info_required',     -- Nachweis oder Klaerung angefordert
      'under_verification',     -- Pruefung laeuft
      'approved_pending_activation', -- geprueft, Recht oder Abrechnung offen
      'active',                 -- alle Aktivierungsbedingungen erfuellt
      'limited',                -- nur freigegebene Leistungen/Maerkte laufen
      'reverification_due',     -- Erneuerung faellig, Frist laeuft
      'paused',                 -- voruebergehend nicht verfuegbar
      'suspended',              -- Vorfall, Untersuchung, verletzte Pflicht
      'terminated')),           -- Beziehung beendet
  ADD COLUMN IF NOT EXISTS lifecycle_status_since timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS lifecycle_status_reason text,
  ADD COLUMN IF NOT EXISTS reverification_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS reverification_grace_until timestamptz,
  -- §21.1: die Abrechnungs-Sperre ist eine eigene Achse. Ein Anbieter kann
  -- fachlich einwandfrei geprueft und trotzdem nicht buchbar sein, weil eine
  -- Rechnung offen ist. Die Gruende stehen daneben, damit das Dashboard sagen
  -- kann, WAS fehlt, statt nur "nicht buchbar".
  ADD COLUMN IF NOT EXISTS billing_ready boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS billing_block_reasons text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS providers_lifecycle_idx
  ON public.providers(lifecycle_status);

COMMENT ON COLUMN public.providers.lifecycle_status IS
  'Kontostatus nach Spec §3. Sperrt oder erlaubt das Konto als Ganzes — sagt aber NICHT, ob eine einzelne Leistung matchbar ist. Das entscheidet die View matchable_provider_services.';
COMMENT ON COLUMN public.providers.reverification_grace_until IS
  'Bis wann ein Anbieter mit faelliger Reverifizierung noch matchbar bleibt. NULL = keine Frist, also sofort raus. Die Laenge richtet sich nach dem Risiko der Kategorie.';
COMMENT ON COLUMN public.providers.billing_block_reasons IS
  'Offene Punkte aus dem Billing-Gate (Spec §21.1): no_payment_method, incomplete_billing_info, inactive_subscription, withdrawn_authorization, overdue_invoice, account_paused.';
COMMENT ON COLUMN public.providers.partner_status IS
  'VERALTET seit dem Anbieter-Datenmodell (20.09.2026). Ersetzt durch lifecycle_status; bleibt, weil das laufende Matching noch darauf filtert. Beim Umstellen des Matchings auf matchable_provider_services entfaellt die Spalte.';

-- ════════════════════════════════════════════════════════════════════════════
-- 4. Capability Profile — eine Zeile je Leistung (§10)
-- ════════════════════════════════════════════════════════════════════════════
--
-- Spec-Regel woertlich: "A provider must create a separate service record for
-- every service it wants CompliHub360 to match. Selecting only a broad
-- category is insufficient."
--
-- Genau das ist der Bruch mit `providers.categories text[]`. Ein Array aus
-- Bereichs-Slugs kann nicht sagen, was eine Leistung kostet, wie lange sie
-- dauert, was NICHT dabei ist und wer sie fachlich verantwortet. Die
-- Anonymous Match Card (§15) verlangt aber genau diese Angaben — Preisspanne,
-- Zeitrahmen, Ausschluesse — und zwar je Leistung, nicht je Anbieter.

CREATE TABLE IF NOT EXISTS public.provider_services (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key  text NOT NULL REFERENCES public.providers(provider_key) ON DELETE CASCADE,
  service_code  text NOT NULL REFERENCES public.service_categories(code),

  -- Klassifikation
  service_name       text NOT NULL,
  provider_keywords  text[] NOT NULL DEFAULT '{}',  -- Vorschlag des Anbieters
  approved_synonyms  text[] NOT NULL DEFAULT '{}',  -- von CompliHub360 freigegeben

  -- Umfang
  description             text,
  deliverables            text[] NOT NULL DEFAULT '{}',
  exclusions              text[] NOT NULL DEFAULT '{}',
  prerequisites           text[] NOT NULL DEFAULT '{}',
  required_user_documents text[] NOT NULL DEFAULT '{}',

  -- Passung
  business_models    text[] NOT NULL DEFAULT '{}',
  industries         text[] NOT NULL DEFAULT '{}',
  company_size_bands text[] NOT NULL DEFAULT '{}',

  -- Kommerziell. Waehrung und Basis sind Pflicht, sobald eine Spanne steht
  -- (Spec §27) — eine Zahl ohne Waehrung ist keine Information, sondern eine
  -- Falle.
  pricing_model   text CHECK (pricing_model IN ('fixed', 'hourly', 'retainer', 'project', 'mixed')),
  price_min       numeric(12,2),
  price_max       numeric(12,2),
  currency        char(3),
  pricing_basis   text,
  min_engagement  text,
  additional_costs text,

  -- Lieferung
  response_time_hours       integer,
  completion_days_estimate  integer,
  capacity_status           text NOT NULL DEFAULT 'open'
    CHECK (capacity_status IN ('open', 'limited', 'full')),

  -- Verantwortung
  responsible_role          text,
  supervising_professional  text,
  uses_subcontractors       boolean NOT NULL DEFAULT false,

  -- Status (§19). Eine neue Leistung startet in 'pending_verification' und ist
  -- bis zur Freigabe nicht matchbar — auch bei einem laengst aktiven Anbieter.
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_verification', 'approved', 'limited', 'paused', 'retired')),
  status_since timestamptz NOT NULL DEFAULT now(),
  retired_at   timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- §27: "Require currency and pricing basis whenever a price range is provided."
  CONSTRAINT provider_services_price_needs_currency CHECK (
    (price_min IS NULL AND price_max IS NULL)
    OR (currency IS NOT NULL AND pricing_basis IS NOT NULL)
  ),
  CONSTRAINT provider_services_price_order CHECK (
    price_min IS NULL OR price_max IS NULL OR price_min <= price_max
  )
);

CREATE INDEX IF NOT EXISTS provider_services_provider_idx
  ON public.provider_services(provider_key);
CREATE INDEX IF NOT EXISTS provider_services_code_idx
  ON public.provider_services(service_code, status);

COMMENT ON TABLE public.provider_services IS
  'Eine Zeile je Leistung, die ein Anbieter gematcht haben will (Spec §10). Ersetzt providers.categories als Matching-Eingang: ein Bereichs-Slug sagt nichts ueber Preis, Dauer, Ausschluesse und fachliche Verantwortung.';
COMMENT ON COLUMN public.provider_services.approved_synonyms IS
  'Von CompliHub360 geprüfte Synonyme. provider_keywords sind Vorschläge und gehen NICHT ins Matching — Spec §11.1: "A keyword must not activate a service or jurisdiction that has not passed verification."';
COMMENT ON COLUMN public.provider_services.exclusions IS
  'Was diese Leistung ausdrücklich nicht abdeckt. Steht auf der Match-Karte, weil eine genannte Grenze dem Nutzer ein Gespräch spart.';

-- ════════════════════════════════════════════════════════════════════════════
-- 5. Freigabe-Matrix — Leistung × Markt (§4, §25)
-- ════════════════════════════════════════════════════════════════════════════
--
-- Die folgenreichste Zeile der ganzen Spec: "Approval must be granular: a
-- provider may be approved for one service and country but not another."
--
-- Das ist die Tabelle, die man nicht nachruestet. Wer erst provider-global
-- freigibt und spaeter feststellt, dass eine Steuerberatung in Deutschland
-- zugelassen ist und in Italien nicht, muss jede Buchung, jede Match-Abfrage
-- und jede Verifikationsentscheidung ruekwirkend aufteilen.
--
-- `jurisdiction_code` ist NULL, wenn die Freigabe fuer das ganze Land gilt.
-- Fuer Maerkte mit Unterebenen (US-Bundesstaaten, siehe
-- 20260917000000_jurisdiction_levels) steht dort die Unterebene.

CREATE TABLE IF NOT EXISTS public.provider_service_coverage (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id        uuid NOT NULL REFERENCES public.provider_services(id) ON DELETE CASCADE,
  country_code      text NOT NULL,
  jurisdiction_code text,                       -- NULL = ganzes Land

  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'limited', 'suspended', 'expired')),
  limitations    text,                          -- was bei 'limited' genau gilt
  approved_at    timestamptz,
  approved_by    uuid,                          -- Reviewer
  expires_at     timestamptz,                   -- etwa an eine Zulassung gekoppelt
  next_review_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ein Markt je Leistung genau einmal. COALESCE, weil NULL in einem UNIQUE
-- nicht mit sich selbst kollidiert und sonst beliebig viele Landes-Zeilen
-- nebeneinander entstuenden.
CREATE UNIQUE INDEX IF NOT EXISTS provider_service_coverage_unique_idx
  ON public.provider_service_coverage(service_id, country_code, COALESCE(jurisdiction_code, ''));
CREATE INDEX IF NOT EXISTS provider_service_coverage_country_idx
  ON public.provider_service_coverage(country_code, status);

COMMENT ON TABLE public.provider_service_coverage IS
  'Freigabe je Leistung und Markt (Spec §4). Die kleinste Einheit, über die ein Reviewer entscheidet — und die einzige, die darüber bestimmt, ob ein Anbieter in einem Land erscheint.';
COMMENT ON COLUMN public.provider_service_coverage.expires_at IS
  'Ablauf der Freigabe, meist an einen Nachweis gekoppelt. Abgelaufen heißt nicht matchbar — die View prüft das, niemand muss den Status nachziehen.';

-- ════════════════════════════════════════════════════════════════════════════
-- 6. Nachweise (§7)
-- ════════════════════════════════════════════════════════════════════════════
--
-- Spec §1: "Every important provider claim must be associated with its
-- evidence, verification status, reviewer, verification date and renewal
-- date." Und als Abnahmekriterium (§28): jede geprüfte Aussage muss auf einen
-- Nachweis zurueckfuehrbar sein.
--
-- Heute steht in `providers.credentials` eine jsonb-Liste aus Label und Notiz.
-- Die traegt das Wort "Steuerberater-Zulassung (DE)", aber nicht, wer das
-- geprueft hat, wann, auf welcher Grundlage und wie lange es gilt. Damit ist
-- jede Anzeige davon eine Behauptung der Plattform, nicht eine Feststellung.
--
-- Datensparsamkeit (§7): wo eine Registerabfrage reicht, gehoert das ERGEBNIS
-- in die Zeile und nicht das Ausweisdokument in den Speicher. Deshalb
-- `source` mit 'registry_check' als gleichwertigem Weg neben 'document'.

CREATE TABLE IF NOT EXISTS public.provider_evidence (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key text NOT NULL REFERENCES public.providers(provider_key) ON DELETE CASCADE,

  evidence_type     text NOT NULL,   -- 'incorporation', 'professional_licence', 'insurance', …
  issuing_authority text,
  identifier        text,            -- Urkunden-, Register- oder Lizenznummer
  covered_entity    text,            -- Firma oder Person, auf die der Nachweis lautet

  source            text NOT NULL DEFAULT 'document'
    CHECK (source IN ('document', 'registry_check')),
  file_ref          text,            -- Referenz in den geschuetzten Speicher
  registry_reference text,           -- Abfrage-ID oder Register-URL

  received_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewer_id uuid,

  result text NOT NULL DEFAULT 'received'
    CHECK (result IN ('received', 'reviewed', 'independently_verified', 'rejected', 'expired')),

  issue_date     date,
  expires_at     date,
  next_review_at date,

  -- Worauf der Nachweis traegt. Leer heisst: gilt fuer den Anbieter als
  -- Ganzes (Handelsregisterauszug), nicht fuer eine bestimmte Leistung.
  supports_service_codes text[] NOT NULL DEFAULT '{}',
  supports_countries     text[] NOT NULL DEFAULT '{}',

  limitations   text,
  reviewer_notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT provider_evidence_date_order CHECK (
    issue_date IS NULL OR expires_at IS NULL OR issue_date <= expires_at
  )
);

CREATE INDEX IF NOT EXISTS provider_evidence_provider_idx
  ON public.provider_evidence(provider_key, result);
-- Fuer die Ablauf-Erinnerung (§26): was laeuft in den naechsten N Tagen ab.
CREATE INDEX IF NOT EXISTS provider_evidence_expiry_idx
  ON public.provider_evidence(expires_at)
  WHERE expires_at IS NOT NULL AND result <> 'rejected';

COMMENT ON TABLE public.provider_evidence IS
  'Nachweis-Kette (Spec §7). Jede geprüfte Aussage über einen Anbieter zeigt hierher — mit Quelle, Prüfer, Datum, Ablauf und Einschränkung.';
COMMENT ON COLUMN public.provider_evidence.source IS
  'registry_check statt document, wo eine Registerabfrage reicht: dann wird das Ergebnis gespeichert, nicht das Ausweisdokument (Datensparsamkeit, Spec §7).';

-- ════════════════════════════════════════════════════════════════════════════
-- 7. Vertrauliche Verifikationsdaten — physisch getrennt (§1, §13)
-- ════════════════════════════════════════════════════════════════════════════
--
-- Spec §1: "Confidential verification, personal identification and payment
-- data must be separated from public and matching data."
--
-- "Separated" als Spalten-Tag auf derselben Zeile ist keine Trennung. Ein
-- `SELECT *` auf `providers` holt es mit, ein vergessenes Feld in einer
-- API-Antwort auch. Deshalb eigene Tabelle, 1:1, deny-all RLS und kein
-- einziger Join im oeffentlichen Pfad. Wer hier hin will, braucht die
-- Service-Rolle — dieselbe Haltung wie bei `documents` und `scheduling`.

CREATE TABLE IF NOT EXISTS public.provider_confidential (
  provider_key text PRIMARY KEY REFERENCES public.providers(provider_key) ON DELETE CASCADE,

  -- Identitaet und Vertretung (§6)
  registration_number       text,
  entity_type               text,
  registered_address        text,
  operating_address         text,
  tax_number                text,
  representative_name       text,
  representative_title      text,
  representative_verified_at timestamptz,
  representative_id_ref     text,        -- Referenz beim Pruefdienst, nie das Dokument
  beneficial_owners         jsonb,

  -- Versicherung (§6). Oeffentlich wird daraus hoechstens "besteht" —
  -- Versicherer, Summe und Police bleiben hier.
  insurance_provider text,
  insurance_type     text,
  insurance_valid_until date,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.provider_confidential IS
  'Vertrauliche Verifikationsdaten, physisch getrennt von providers (Spec §1). Deny-all RLS: nur über die Service-Rolle erreichbar. Ein SELECT * auf providers kann hier nichts mitnehmen.';

-- ════════════════════════════════════════════════════════════════════════════
-- 8. Aenderungen mit Vorher/Nachher (§18, §19, §27)
-- ════════════════════════════════════════════════════════════════════════════
--
-- Zwei Anforderungen treffen sich hier: §18 staffelt Meldefristen nach
-- Schwere (sofort / drei Werktage / vor Wirksamkeit), §27 verlangt
-- "Retain before-and-after values for material changes".
--
-- Eine Tabelle fuer beides, weil es dieselbe Zeile ist: der Anbieter meldet
-- eine Aenderung, CompliHub360 entscheidet, ob sie geprueft werden muss, und
-- danach wird sie wirksam. Wer das trennt, hat am Ende ein Protokoll, in dem
-- die genehmigten Aenderungen fehlen.

CREATE TABLE IF NOT EXISTS public.provider_change_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key text NOT NULL REFERENCES public.providers(provider_key) ON DELETE CASCADE,
  service_id   uuid REFERENCES public.provider_services(id) ON DELETE CASCADE,

  change_type text NOT NULL,              -- 'pricing', 'licence', 'coverage', 'ownership', …
  field_path  text,                       -- 'provider_services.price_max'
  old_value   jsonb,
  new_value   jsonb,

  -- §18: die Frist haengt an der Schwere, nicht am Feld.
  deadline_class text NOT NULL
    CHECK (deadline_class IN ('immediate_24h', 'within_3_business_days', 'before_effective_date')),

  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected', 'applied', 'withdrawn')),

  requires_reverification boolean NOT NULL DEFAULT false,
  pauses_affected_services boolean NOT NULL DEFAULT false,  -- bei 'immediate_24h' die Regel
  user_impact text,                       -- was betroffene Nutzer erfahren muessen

  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at  timestamptz,
  reviewer_id  uuid,
  effective_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS provider_change_requests_provider_idx
  ON public.provider_change_requests(provider_key, status);
CREATE INDEX IF NOT EXISTS provider_change_requests_open_idx
  ON public.provider_change_requests(deadline_class, submitted_at)
  WHERE status IN ('submitted', 'under_review');

COMMENT ON TABLE public.provider_change_requests IS
  'Gemeldete Änderungen mit Vorher/Nachher (Spec §18, §27). Auch genehmigte Änderungen bleiben stehen — das Protokoll ist sonst lückenhaft genau an den Stellen, an denen es zählt.';

-- ════════════════════════════════════════════════════════════════════════════
-- 9. Zustimmungen und Vertragsstand (§23)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.provider_agreement_acceptance (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key text NOT NULL REFERENCES public.providers(provider_key) ON DELETE CASCADE,

  agreement_type text NOT NULL CHECK (agreement_type IN (
    'provider_agreement', 'privacy_notice', 'billing_authorization', 'commercial_terms')),
  version   text NOT NULL,
  language  char(2) NOT NULL DEFAULT 'en',

  accepted_at         timestamptz NOT NULL DEFAULT now(),
  accepted_by_name    text,
  accepted_by_title   text,
  accepted_by_user_id uuid,
  audit_ref           text,        -- technische Referenz: Request-ID, IP-Hash

  -- §23: "Reacceptance event when material terms change." Eine neue Fassung
  -- ersetzt die alte nicht, sie kommt daneben — sonst laesst sich spaeter
  -- nicht belegen, welcher Stand zum Zeitpunkt einer Buchung galt.
  superseded_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS provider_agreement_acceptance_provider_idx
  ON public.provider_agreement_acceptance(provider_key, agreement_type, accepted_at DESC);

COMMENT ON TABLE public.provider_agreement_acceptance IS
  'Welche Fassung wann von wem akzeptiert wurde (Spec §23). Append-only: eine neue Fassung ersetzt die alte nicht, sonst ist der Stand zum Buchungszeitpunkt nicht mehr belegbar.';

-- ════════════════════════════════════════════════════════════════════════════
-- 10. Buchung: Preis-Schnappschuss und Freigabe-Protokoll (§20, Checklist)
-- ════════════════════════════════════════════════════════════════════════════
--
-- Spec §20: "At booking, retain a snapshot of the displayed price/range,
-- currency, pricing basis, included items and applicable terms." Ohne das gibt
-- es bei jeder spaeteren Preisaenderung nur noch Aussage gegen Aussage.
--
-- Dazu zwei Spalten aus der Acceptance-Checklist, die dort als Tests stehen
-- und hier ihren Ort bekommen:
--
--   "Audit record — The system records user, provider, fields shared,
--    consent/confirmation, and timestamp."
--   "Data minimization — Only fields disclosed in the confirmation screen and
--    required for the request are shared."
--
-- Beide Tests sind unbeweisbar, solange nirgends steht, WELCHE Felder
-- tatsaechlich geflossen sind. `shared_fields` ist diese Liste, und sie ist
-- zugleich die Spalte, gegen die der Test laeuft: was dort steht, muss der
-- Nutzer im Bestaetigungs-Dialog gesehen haben.

ALTER TABLE public.scheduling
  ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.provider_services(id),
  ADD COLUMN IF NOT EXISTS price_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS shared_fields text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sharing_confirmed_at timestamptz;

COMMENT ON COLUMN public.scheduling.price_snapshot IS
  'Preisstand zum Buchungszeitpunkt (Spec §20): {price_min, price_max, currency, pricing_basis, included[], terms_version, captured_at}. Eine spätere Preisänderung des Anbieters berührt eine laufende Buchung nicht.';
COMMENT ON COLUMN public.scheduling.shared_fields IS
  'Welche Nutzerfelder an diesen Anbieter gegangen sind. Muss deckungsgleich sein mit dem, was der Bestätigungs-Dialog gezeigt hat — daran hängen die Tests "Audit record" und "Data minimization" der Acceptance-Checklist.';
COMMENT ON COLUMN public.scheduling.sharing_confirmed_at IS
  'Zeitpunkt der ausdrücklichen Freigabe im Dialog "Review what will be shared". NULL heißt: nichts wurde geteilt — auch nicht bei einer fehlgeschlagenen Buchung.';

-- ════════════════════════════════════════════════════════════════════════════
-- 11. Die UND-Kette: was ist matchbar (§3 × §4 × §19)
-- ════════════════════════════════════════════════════════════════════════════
--
-- Hier loest sich die Mehrdeutigkeit der Spec auf. Kein Flag, keine
-- Rangfolge zwischen den Statusachsen, sondern eine Konjunktion: matchbar ist
-- eine Leistung in einem Markt genau dann, wenn das Konto sie erlaubt, die
-- Leistung geprueft ist und die Freigabe fuer diesen Markt gilt und nicht
-- abgelaufen ist.
--
-- ─── Was hier bewusst NICHT drinsteht ──────────────────────────────────────
--
-- `billing_ready`. Die Versuchung ist gross, weil §21.1 so klar klingt. Aber
-- das Gate dort sperrt "chargeable booking eligibility" — die Buchung, nicht
-- das Matching. Wer die Abrechnung ins Matching zieht, baut genau das, was
-- §14 verbietet: ein Zahlungsstatus entscheidet dann mit darueber, wer
-- ueberhaupt erscheint. Deshalb steht `bookable_chargeable` als eigene Spalte
-- daneben — sichtbar fuer die Buchungsstrecke, unsichtbar fuer das Ranking.
--
-- `availability = 'ooo'`. Bleibt drin und wird nur als Spalte gemeldet. Das
-- laufende Ranking halbiert dafuer den Score (index.ts), statt auszuschliessen
-- — "weniger sichtbar, nicht unsichtbar". Diese Entscheidung gehoert dem
-- Ranker, nicht der Sichtbarkeitsgrenze.

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

  -- Nebenachsen: gemeldet, nicht gefiltert. Siehe Kommentar oben.
  p.availability      AS provider_availability,
  p.billing_ready     AS bookable_chargeable,
  p.lifecycle_status  AS provider_lifecycle_status
FROM public.provider_services s
JOIN public.provider_service_coverage c ON c.service_id = s.id
JOIN public.providers p                 ON p.provider_key = s.provider_key
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
  'Die einzige Antwort auf "darf dieser Anbieter hier erscheinen" (Spec §3 × §4 × §19). Kein gespeichertes Flag: ein abgelaufener Nachweis oder eine entzogene Zulassung wirkt sofort, ohne dass jemand einen Status nachzieht. billing_ready ist absichtlich KEIN Filter — sonst entschiede der Zahlungsstatus über die Sichtbarkeit, was §14 verbietet.';

-- ════════════════════════════════════════════════════════════════════════════
-- 12. Befuellung aus dem Bestand
-- ════════════════════════════════════════════════════════════════════════════
--
-- Eine leere View ist eine kaputte View: wer das Matching darauf umstellt,
-- haette null Treffer. Also wird der Bestand aufgeloest — aus einem
-- `categories text[]` und einem `countries_supported text[]` werden echte
-- Leistungs- und Freigabe-Zeilen.
--
-- Der Schluessel-Wirrwarr ist dabei real: die Anbieter-Zeilen tragen alte
-- DB-Kategorien ('vat', 'epr', 'gdpr'), der Wizard sendet die Bereichs-Slugs
-- ('tax-vat', 'product-packaging'). Die Umsetzung unten ist die Umkehrung von
-- DOMAIN_TO_DB aus services/compliance-api/src/index.ts. Sie gehoert
-- eigentlich nicht in eine Migration, sondern in die Taxonomie — aber solange
-- beide Vokabulare leben, muss sie irgendwo stehen, und hier ist sie
-- wenigstens einmal vollstaendig aufgeschrieben.

-- 12.1 Lifecycle aus partner_status.
--
-- 'downgraded' wird zu 'active', nicht zu 'limited'. Das sieht falsch aus und
-- ist richtig: 'limited' heisst nach §3, dass nur noch einzelne Leistungen
-- oder Maerkte laufen — eine Einschraenkung des Umfangs. 'downgraded' ist
-- dagegen eine Qualitaetsstrafe des Review-Watchdogs, die die Sichtbarkeit
-- senkt, ohne den Umfang anzutasten. Diese Strafe lebt weiter in
-- partner_status und im Ranking; sie in den Lifecycle zu uebersetzen wuerde
-- sie zu etwas machen, das sie nicht ist.
UPDATE public.providers SET
  lifecycle_status = CASE partner_status
    WHEN 'active'     THEN 'active'
    WHEN 'downgraded' THEN 'active'
    ELSE 'draft'
  END,
  lifecycle_status_reason = CASE partner_status
    WHEN 'downgraded' THEN 'Uebernommen aus partner_status=downgraded (Review-Watchdog). Sichtbarkeit reduziert, Umfang unveraendert.'
    ELSE 'Uebernommen aus partner_status bei Einfuehrung des Lifecycle-Modells.'
  END
WHERE lifecycle_status = 'draft';

-- 12.2 Leistungen aus `categories` — und in derselben Anweisung die Maerkte.
--
-- Die beiden Schritte haengen zusammen und muessen es auch bleiben. Getrennt
-- geschrieben liefe der Markt-Teil bei jeder Wiederholung ueber ALLE
-- Leistungen, auch ueber die, die ein Anbieter spaeter selbst angelegt hat —
-- und wuerde ihnen stillschweigend jedes Land aus `countries_supported`
-- zuschreiben. Genau das verbietet §19: eine neue Leistung ist bis zur
-- Freigabe nicht matchbar, und sie holt sich ihre Maerkte nicht aus einem
-- Altbestand.
--
-- Mit dem CTE gilt: was 12.2 nicht neu anlegt, bekommt hier auch keine
-- Freigabe. Beim zweiten Lauf ist `uebernommen` leer, und es passiert nichts.
--
-- Jede uebernommene Leistung gilt zunaechst in jedem Land, das der Anbieter
-- angegeben hat — das ist exakt das heutige Verhalten des Matchings, also
-- keine neue Behauptung, sondern die bestehende, nur explizit. Die erste
-- echte Pruefung duennt diese Zeilen aus; dafuer ist die Tabelle da.
WITH legacy_map(legacy_key, area_code) AS (
  VALUES
    ('vat','tax-vat'), ('vat_oss','tax-vat'), ('tax','tax-vat'), ('tax-vat','tax-vat'),
    ('epr','product-packaging'), ('packaging','product-packaging'), ('product-packaging','product-packaging'),
    ('privacy','data-privacy'), ('gdpr','data-privacy'), ('dat','data-privacy'), ('data-privacy','data-privacy'),
    ('marketing','marketing-seo'), ('seo','marketing-seo'), ('advertising_law','marketing-seo'),
    ('agency','marketing-seo'), ('content','marketing-seo'), ('paid_media','marketing-seo'),
    ('marketing-seo','marketing-seo'),
    ('corporate','corporate-structure'), ('cst','corporate-structure'), ('corporate-structure','corporate-structure'),
    ('product_compliance','product-compliance'), ('psf','product-compliance'), ('ce','product-compliance'),
    ('product-compliance','product-compliance'),
    ('logistics','logistics-customs'), ('customs','logistics-customs'), ('logistics-customs','logistics-customs'),
    ('legal','legal-advisory'), ('oth','legal-advisory'), ('legal-advisory','legal-advisory'),
    ('environment','environment'), ('weee','environment'), ('reach','environment'), ('batteries','environment')
),
uebernommen AS (
  INSERT INTO public.provider_services (provider_key, service_code, service_name, status, status_since)
  SELECT DISTINCT
    p.provider_key,
    m.area_code,
    sc.label_en,
    CASE WHEN p.lifecycle_status = 'active' THEN 'approved' ELSE 'draft' END,
    now()
  FROM public.providers p
  CROSS JOIN LATERAL unnest(COALESCE(p.categories, '{}')) AS cat(key)
  JOIN legacy_map m                 ON m.legacy_key = cat.key
  JOIN public.service_categories sc ON sc.code = m.area_code
  WHERE NOT EXISTS (
    SELECT 1 FROM public.provider_services ex
    WHERE ex.provider_key = p.provider_key AND ex.service_code = m.area_code
  )
  RETURNING id, provider_key, status
)
INSERT INTO public.provider_service_coverage (service_id, country_code, status, approved_at)
SELECT
  u.id,
  c.country,
  CASE WHEN u.status = 'approved' THEN 'approved' ELSE 'pending' END,
  CASE WHEN u.status = 'approved' THEN now() ELSE NULL END
FROM uebernommen u
JOIN public.providers p ON p.provider_key = u.provider_key
CROSS JOIN LATERAL unnest(COALESCE(p.countries_supported, '{}')) AS c(country);

-- 12.4 Nachweise aus `providers.credentials`.
--
-- Die jsonb-Liste dort traegt Label und Notiz, sonst nichts. Sie wird
-- uebernommen, aber ehrlich: `result = 'received'`, kein Pruefer, kein Datum.
-- Damit ist jede uebernommene Zeile sichtbar ungeprueft, und die Anzeige
-- kann aufhoeren, sie als geprueft auszugeben.
INSERT INTO public.provider_evidence (provider_key, evidence_type, identifier, source, result, reviewer_notes)
SELECT
  p.provider_key,
  'legacy_credential',
  cred->>'label',
  'document',
  'received',
  COALESCE(cred->>'note', '') || ' [uebernommen aus providers.credentials, nicht nachgeprueft]'
FROM public.providers p
CROSS JOIN LATERAL jsonb_array_elements(p.credentials) AS cred
WHERE jsonb_typeof(p.credentials) = 'array'
  AND NOT EXISTS (
    SELECT 1 FROM public.provider_evidence ex
    WHERE ex.provider_key = p.provider_key
      AND ex.evidence_type = 'legacy_credential'
      AND ex.identifier = cred->>'label'
  );

-- ════════════════════════════════════════════════════════════════════════════
-- 13. Das Sichtbarkeits-Register (§13, §15)
-- ════════════════════════════════════════════════════════════════════════════
--
-- Die Liste ist die Uebersetzung der Anonymous Match Card (§15) und der
-- Identity-Protection-Regel darunter: "Do not show names, logos, exact award
-- names, certificate links, social handles, direct contact details, unique
-- wording or other information that reasonably reveals identity before
-- booking."
--
-- Praktisch ist das die Quelle, gegen die der Privacy-Test der Checklist
-- laeuft ("Browser payload — Identifying provider data is absent, not merely
-- hidden with CSS"). Ein Feld, das hier nicht steht, gilt als 'internal' und
-- darf in keiner Antwort auftauchen — Standard zu, nicht Standard auf.

INSERT INTO public.provider_field_visibility (field_path, visibility_class, note) VALUES
  -- Vor der Buchung sichtbar (§15)
  ('providers.pseudonym_label',                 'anonymous', 'Kein Klarname'),
  ('providers.region',                          'anonymous', 'Grobe Region, kein Ort'),
  ('providers.active_since',                    'anonymous', NULL),
  ('providers.languages',                       'anonymous', NULL),
  ('providers.rating',                          'anonymous', NULL),
  ('providers.completed_count',                 'anonymous', NULL),
  ('providers.avg_response_hours',              'anonymous', NULL),
  ('providers.billing_model',                   'anonymous', NULL),
  ('providers.availability',                    'anonymous', NULL),
  ('provider_services.service_code',            'anonymous', NULL),
  ('provider_services.service_name',            'anonymous', NULL),
  ('provider_services.exclusions',              'anonymous', NULL),
  ('provider_services.price_min',               'anonymous', NULL),
  ('provider_services.price_max',               'anonymous', NULL),
  ('provider_services.currency',                'anonymous', NULL),
  ('provider_services.pricing_basis',           'anonymous', NULL),
  ('provider_services.response_time_hours',     'anonymous', NULL),
  ('provider_services.completion_days_estimate','anonymous', NULL),
  ('provider_services.capacity_status',         'anonymous', NULL),
  ('provider_service_coverage.country_code',    'anonymous', NULL),

  -- Erst nach der Buchung (§13)
  ('providers.name',        'revealed', 'Klarname — Identitaetsmerkmal'),
  ('providers.website_url', 'revealed', 'Domain verraet den Anbieter'),
  ('providers.contact_email','revealed', NULL),

  -- Matching und autorisierte Mitarbeit
  ('providers.categories',                    'internal', 'Altbestand, ersetzt durch provider_services'),
  ('providers.countries_supported',           'internal', 'Altbestand, ersetzt durch provider_service_coverage'),
  ('providers.confirmation_rate',             'internal', NULL),
  ('providers.breach_count',                  'internal', NULL),
  ('providers.lifecycle_status',              'internal', NULL),
  ('provider_services.provider_keywords',     'internal', 'Vorschlaege, ungeprueft'),
  ('provider_services.approved_synonyms',     'internal', NULL),
  ('provider_services.supervising_professional','internal', 'Personenname'),
  ('provider_service_coverage.limitations',   'internal', NULL),

  -- Vertrauliche Verifikation (§13). Liegen zusaetzlich in einer eigenen
  -- Tabelle mit deny-all RLS — der Eintrag hier ist die zweite Sperre, nicht
  -- die einzige.
  ('provider_confidential.registration_number',   'confidential', NULL),
  ('provider_confidential.tax_number',            'confidential', NULL),
  ('provider_confidential.registered_address',    'confidential', NULL),
  ('provider_confidential.representative_name',   'confidential', NULL),
  ('provider_confidential.representative_id_ref', 'confidential', 'Niemals ausliefern, auch intern nicht'),
  ('provider_confidential.beneficial_owners',     'confidential', NULL),
  ('provider_confidential.insurance_provider',    'confidential', 'Oeffentlich hoechstens "besteht"'),
  ('provider_evidence.file_ref',                  'confidential', NULL),
  ('provider_evidence.reviewer_notes',            'confidential', NULL),

  -- Abrechnung
  ('providers.stripe_customer_id', 'billing', NULL),
  ('providers.vat_id',             'billing', NULL),
  ('providers.billing_ready',      'billing', NULL)
ON CONFLICT (field_path) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- 14. RLS
-- ════════════════════════════════════════════════════════════════════════════
--
-- Gleiche Haltung wie bei `documents`, `scheduling` und `reviews`: deny-all
-- gegenueber anon und authenticated, der Zugriff laeuft ueber die
-- Service-Rolle in der compliance-api. Kein Grant an den Client, weil jede
-- Policy, die "der Anbieter darf seine eigene Zeile sehen" ausdrueckt, an
-- einem Modell scheitert, in dem ein Anbieter kein auth-Konto, sondern einen
-- `provider_key` hat. Das kommt, wenn die Anbieter-Anmeldung kommt.
--
-- `service_categories` ist die Ausnahme: die Taxonomie ist oeffentlich
-- lesbar, sie steht so auch in der Navigation.

ALTER TABLE public.provider_field_visibility   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_services           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_service_coverage   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_evidence           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_confidential       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_change_requests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_agreement_acceptance ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service categories are globally readable" ON public.service_categories;
CREATE POLICY "Service categories are globally readable"
  ON public.service_categories FOR SELECT USING (true);

-- Die View erbt die Rechte der zugrundeliegenden Tabellen (kein
-- security_invoker noetig, Postgres prueft ohnehin gegen den View-Owner nur
-- bei SECURITY DEFINER). Sie ist damit ebenfalls nur ueber die Service-Rolle
-- erreichbar — beabsichtigt: `matchable_provider_services` traegt neben den
-- anonymen Feldern auch `provider_key`, `lifecycle_status` und
-- `bookable_chargeable`. Die Anonymisierung fuer den Draht passiert in der
-- API, wie bisher, nicht in dieser View.

-- ════════════════════════════════════════════════════════════════════════════
-- 15. Was als Naechstes ansteht (bewusst NICHT in dieser Migration)
-- ════════════════════════════════════════════════════════════════════════════
--
--  1. Matching auf `matchable_provider_services` umstellen. Verhaltens-
--     aenderung, eigener Schritt, eigener Test: heute filtert index.ts auf
--     partner_status + countries_supported und scort ueber categories.
--  2. Anonymisierung gegen `provider_field_visibility` fahren statt gegen die
--     handgeschriebene Feldliste in index.ts — erst dann traegt das Register.
--  3. `partner_status`, `providers.categories` und `providers.countries_supported`
--     entfernen, sobald 1 und 2 stehen.
--  4. Billing-Gate (§21.1) befuellen: heute setzt niemand `billing_ready`.
--     Bis dahin ist es false, und `bookable_chargeable` meldet ueberall false
--     — sichtbar falsch ist besser als unsichtbar falsch.
