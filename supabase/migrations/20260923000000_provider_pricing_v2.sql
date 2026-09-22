-- ════════════════════════════════════════════════════════════════════════════
-- Provider Pricing v2 — Plaene, Lead-Baender, Rabattzaehler, Ledger
-- ════════════════════════════════════════════════════════════════════════════
--
-- Grundlage: "Provider Dashboard Pricing and Operations Implementation
-- Specification" v1.0 (09/2026), Entscheidung des Nutzers vom 2026-09-22:
-- Spec B ersetzt das Pricing Phase 1 vom 2026-08-09 vollstaendig, in USD.
-- Begruendung und Abloesung: docs/decisions/ADR-0003-provider-pricing-v2.md.
--
-- Was hier steht, ist KONFIGURATION, nicht Preislogik. Die Spec verlangt an
-- sechs Stellen "must remain configurable" (Plaene, Baender, Zuordnung,
-- Rabatte, Kulanzfristen, CPC). Deshalb tragen Katalog und Baender eine
-- Version und ein Gueltigkeitsdatum, und die API liest sie statt Konstanten.
--
-- ─── Was hier bewusst NICHT passiert ────────────────────────────────────────
--
--   * Kein automatischer Umzug von `providers.subscription_plan`
--     ('monthly'/'annual', Phase 1). Welchem der drei neuen Plaene ein
--     Bestandsabo entspricht, sagt die Spec nicht — das entscheidet der
--     Admin je Anbieter. Die Altspalte bleibt, ist als abgeloest kommentiert
--     und wird von nichts mehr gelesen.
--   * Keine Zuordnung Kategorie → Band. `lead_band_rules` ist leer; die
--     Berechnung faellt auf Band 1. Die Spec: "Final category-to-band mapping
--     remains configurable and will be completed separately."
--   * Kein Blog, kein CPC. `included_blog_articles` wird gespeichert, wirkt
--     aber nicht — Phase 8 ist bis zu einer DNA-Klaerung blockiert.
--   * Keine Belastung. Wer wann die Karte belastet, ist Phase 4 (Buchung).
--     Hier entsteht nur das Buch, in das sie schreibt.
--
-- ─── Die eine Regel, die ueber allem steht (Spec B, Spec A §14, DNA §3) ─────
--
-- Nichts aus diesen Tabellen darf je ins Matching oder Ranking. Die View
-- `matchable_provider_services` liest sie nicht, der Scorer in index.ts
-- liest sie nicht, und ein Test in services/compliance-api haelt fest, dass
-- derselbe Anbieter mit Essential und mit Global denselben Score bekommt.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. Plan-Katalog
-- ════════════════════════════════════════════════════════════════════════════
--
-- Eine Zeile je Plan und Version. `effective_from` erlaubt Preisaenderungen
-- ohne UPDATE auf der alten Zeile: neue Version anlegen, alte behaelt ihre
-- Wahrheit fuer Rechnungen, die sie zitieren.

CREATE TABLE IF NOT EXISTS public.plan_catalog (
  code                    text        NOT NULL CHECK (code IN ('essential', 'growth', 'global')),
  version                 integer     NOT NULL DEFAULT 1,
  label                   text        NOT NULL,
  currency                text        NOT NULL DEFAULT 'USD' CHECK (currency = upper(currency) AND length(currency) = 3),
  monthly_cents           integer     NOT NULL CHECK (monthly_cents >= 0),
  -- Spec: "Annual subscriptions charge ten months of the applicable monthly
  -- price and provide twelve months of access." Gespeichert, nicht gerechnet,
  -- damit eine Rechnung den Betrag zitieren kann, der galt.
  annual_cents            integer     NOT NULL CHECK (annual_cents >= 0),
  -- NULL = alle freigegebenen Hauptkategorien (Global).
  category_allowance      integer     CHECK (category_allowance IS NULL OR category_allowance >= 1),
  lead_discount_pct       integer     NOT NULL DEFAULT 0 CHECK (lead_discount_pct BETWEEN 0 AND 100),
  lead_discount_count     integer     NOT NULL DEFAULT 0 CHECK (lead_discount_count >= 0),
  included_blog_articles  integer     NOT NULL DEFAULT 0 CHECK (included_blog_articles >= 0),
  api_eligible            boolean     NOT NULL DEFAULT false,
  analytics_level         text        NOT NULL CHECK (analytics_level IN ('basic', 'enhanced', 'advanced')),
  effective_from          date        NOT NULL DEFAULT current_date,
  PRIMARY KEY (code, version)
);

COMMENT ON TABLE public.plan_catalog IS
  'Spec B Subscription configuration. Eine Zeile je Plan und Version; die API '
  'liest die juengste Version mit effective_from <= heute. NIE ins Matching.';

INSERT INTO public.plan_catalog
  (code, version, label, currency, monthly_cents, annual_cents, category_allowance,
   lead_discount_pct, lead_discount_count, included_blog_articles, api_eligible, analytics_level, effective_from)
VALUES
  ('essential', 1, 'Essential', 'USD',  5900,  59000, 1,    0, 0, 0, false, 'basic',    DATE '2026-09-22'),
  ('growth',    1, 'Growth',    'USD',  9900,  99000, 5,   10, 3, 1, false, 'enhanced', DATE '2026-09-22'),
  ('global',    1, 'Global',    'USD', 18900, 189000, NULL, 15, 6, 2, true,  'advanced', DATE '2026-09-22')
ON CONFLICT (code, version) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. Abos je Anbieter
-- ════════════════════════════════════════════════════════════════════════════
--
-- Ersetzt `providers.subscription_plan` / `subscription_since`. Ein Anbieter
-- hat hoechstens EIN nicht beendetes Abo (Partial Unique Index unten).
-- Upgrade/Downgrade = neues Abo, altes bekommt `ended_at`; so bleibt
-- nachvollziehbar, welcher Plan zu welchem Zeitpunkt galt (Ledger zitiert
-- `plan_code_at_charge`).

CREATE TABLE IF NOT EXISTS public.provider_subscriptions (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key          text        NOT NULL REFERENCES public.providers(provider_key) ON DELETE CASCADE,
  plan_code             text        NOT NULL,
  plan_version          integer     NOT NULL DEFAULT 1,
  cadence               text        NOT NULL CHECK (cadence IN ('monthly', 'annual')),
  status                text        NOT NULL DEFAULT 'active'
                                    CHECK (status IN ('active', 'past_due', 'cancelled', 'ended')),
  -- Der Zyklus, gegen den Rabattzaehler und Abo-Rechnung laufen.
  current_period_start  date        NOT NULL DEFAULT current_date,
  current_period_end    date        NOT NULL,
  renewal_date          date,
  stripe_subscription_id text,
  started_at            timestamptz NOT NULL DEFAULT now(),
  ended_at              timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (plan_code, plan_version) REFERENCES public.plan_catalog(code, version),
  CHECK (current_period_end > current_period_start),
  CHECK (ended_at IS NULL OR status = 'ended')
);

CREATE UNIQUE INDEX IF NOT EXISTS provider_subscriptions_one_open
  ON public.provider_subscriptions (provider_key) WHERE ended_at IS NULL;

CREATE INDEX IF NOT EXISTS provider_subscriptions_provider_idx
  ON public.provider_subscriptions (provider_key, started_at DESC);

COMMENT ON COLUMN public.providers.subscription_plan IS
  'ABGELOEST 2026-09-22 (ADR-0003): Phase-1-Abo, wird von nichts mehr gelesen. '
  'Massgeblich ist provider_subscriptions.';
COMMENT ON COLUMN public.providers.subscription_since IS
  'ABGELOEST 2026-09-22 (ADR-0003), siehe provider_subscriptions.';

-- ════════════════════════════════════════════════════════════════════════════
-- 3. Lead-Baender und ihre Zuordnung
-- ════════════════════════════════════════════════════════════════════════════
--
-- Spec B: "The lead fee must be based on the opportunity, not the size of
-- the provider." Vier Baender mit Preis; die Zuordnung Kategorie × Land ×
-- Komplexitaet → Band ist eine EIGENE Tabelle, weil sie sich aendern wird
-- und beim Start leer ist (Default Band 1, siehe billing.ts).

CREATE TABLE IF NOT EXISTS public.lead_band_config (
  band            integer     NOT NULL CHECK (band BETWEEN 1 AND 4),
  version         integer     NOT NULL DEFAULT 1,
  label           text        NOT NULL,
  fee_cents       integer     NOT NULL CHECK (fee_cents >= 0),
  currency        text        NOT NULL DEFAULT 'USD',
  effective_from  date        NOT NULL DEFAULT current_date,
  PRIMARY KEY (band, version)
);

INSERT INTO public.lead_band_config (band, version, label, fee_cents, currency, effective_from) VALUES
  (1, 1, 'Focused',    9900, 'USD', DATE '2026-09-22'),
  (2, 1, 'Core',      14900, 'USD', DATE '2026-09-22'),
  (3, 1, 'Advanced',  29900, 'USD', DATE '2026-09-22'),
  (4, 1, 'Strategic', 49900, 'USD', DATE '2026-09-22')
ON CONFLICT (band, version) DO NOTHING;

-- Regeln: die SPEZIFISCHSTE passende Zeile gewinnt (hoechste `priority`).
-- Muster fuer Land: ISO-2, 'EU', oder '*' fuer alle. `min_countries` und
-- `min_services` sind Komplexitaets-Schwellen ("multi-country", "connected
-- services" aus Spec B). Leer beim Start — ausdruecklich.
CREATE TABLE IF NOT EXISTS public.lead_band_rules (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  area_code       text        REFERENCES public.service_categories(code),   -- NULL = jeder Bereich
  service_code    text        REFERENCES public.service_categories(code),   -- NULL = jede Leistung
  country_pattern text        NOT NULL DEFAULT '*',
  min_countries   integer     NOT NULL DEFAULT 1 CHECK (min_countries >= 1),
  min_services    integer     NOT NULL DEFAULT 1 CHECK (min_services >= 1),
  recurring       boolean,                                                  -- NULL = egal
  band            integer     NOT NULL CHECK (band BETWEEN 1 AND 4),
  priority        integer     NOT NULL DEFAULT 0,
  note            text,
  effective_from  date        NOT NULL DEFAULT current_date,
  effective_to    date,
  CHECK (effective_to IS NULL OR effective_to > effective_from)
);

COMMENT ON TABLE public.lead_band_rules IS
  'Zuordnung Opportunity -> Band. Beim Start leer: "final category-to-band '
  'mapping … will be completed separately" (Spec B). Ohne Treffer gilt Band 1.';

-- ════════════════════════════════════════════════════════════════════════════
-- 4. Wo Lead-Gebuehren ueberhaupt erlaubt sind
-- ════════════════════════════════════════════════════════════════════════════
--
-- Spec A §21: "Lead, booking, referral and affiliate charges must remain
-- configurable and disabled where counsel has not approved them,
-- particularly for regulated professions." In Deutschland verbietet § 49b
-- Abs. 3 BRAO Anwaelten die Zahlung fuer die Vermittlung von Mandaten; in
-- anderen Laendern gelten aehnliche Regeln fuer Steuerberater und
-- Wirtschaftspruefer. Deshalb: Legal Support startet ueberall AUS, alles
-- andere AN, bis die Rechtsberatung je Land etwas anderes sagt.
--
-- Die spezifischste Zeile gewinnt: (area, country) vor (area, '*') vor
-- (NULL, '*').

CREATE TABLE IF NOT EXISTS public.lead_fee_eligibility (
  area_code       text        NOT NULL REFERENCES public.service_categories(code),
  country_code    text        NOT NULL DEFAULT '*',
  enabled         boolean     NOT NULL,
  reason          text,
  decided_at      date        NOT NULL DEFAULT current_date,
  PRIMARY KEY (area_code, country_code)
);

-- Hier stehen nur die AUSNAHMEN vom Standard "erlaubt". Eine Pseudo-Kategorie
-- '*' fuer den Standard gibt es bewusst nicht — sie waere eine Zeile in der
-- Taxonomie, die keine Leistung ist.

INSERT INTO public.lead_fee_eligibility (area_code, country_code, enabled, reason, decided_at) VALUES
  ('legal-advisory', '*', false,
   'Regulierter Beruf: Vermittlungsentgelt fuer Anwaelte in DE (§ 49b Abs. 3 BRAO) und weiteren Laendern unzulaessig. AN erst nach Freigabe der Rechtsberatung je Land.',
   DATE '2026-09-22')
ON CONFLICT (area_code, country_code) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- 5. Das Buch: jede Lead-Belastung, unveraenderlich
-- ════════════════════════════════════════════════════════════════════════════
--
-- Spec B "Lead fee audit fields", wortgetreu als Spalten. Append-only: kein
-- UPDATE, kein DELETE — ein Trigger verhindert beides. Korrekturen sind neue
-- Zeilen (`kind = 'credit'` / `'adjustment'`), die auf die Ursprungszeile
-- zeigen. So kann der Nutzer und der Anbieter jederzeit nachvollziehen, was
-- wann warum berechnet wurde (DNA: "Trust is proven when something goes wrong").

CREATE TABLE IF NOT EXISTS public.provider_lead_ledger (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  kind                    text        NOT NULL DEFAULT 'charge'
                                      CHECK (kind IN ('charge', 'credit', 'adjustment')),
  -- Bezug
  lead_id                 uuid        NOT NULL DEFAULT gen_random_uuid(),
  provider_key            text        NOT NULL REFERENCES public.providers(provider_key),
  user_id                 uuid,
  booking_id              uuid        REFERENCES public.scheduling(id),
  -- Bewertung der Opportunity
  area_code               text        REFERENCES public.service_categories(code),
  subcategories           text[]      NOT NULL DEFAULT '{}',
  countries               text[]      NOT NULL DEFAULT '{}',
  computed_band           integer     NOT NULL CHECK (computed_band BETWEEN 1 AND 4),
  band_version            integer     NOT NULL DEFAULT 1,
  -- Preis
  standard_fee_cents      integer     NOT NULL CHECK (standard_fee_cents >= 0),
  plan_code_at_charge     text,
  plan_version_at_charge  integer,
  discount_sequence       integer,                       -- 1..n innerhalb des Zyklus, NULL = kein Rabatt
  discount_pct            integer     NOT NULL DEFAULT 0 CHECK (discount_pct BETWEEN 0 AND 100),
  final_fee_cents         integer     NOT NULL CHECK (final_fee_cents >= 0),
  currency                text        NOT NULL DEFAULT 'USD',
  -- Status und Nachweis. `payment_status` ist der Stand BEIM SCHREIBEN der
  -- Zeile; jede Aenderung danach steht in provider_lead_ledger_payment_events.
  payment_status          text        NOT NULL DEFAULT 'pending'
                                      CHECK (payment_status IN ('pending', 'authorized', 'captured', 'failed', 'refunded', 'n/a')),
  stripe_payment_intent_id text,
  policy_version          text        NOT NULL,
  refers_to               uuid        REFERENCES public.provider_lead_ledger(id),   -- Ursprungszeile bei credit/adjustment
  admin_override_by       uuid,
  admin_override_reason   text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  CHECK (final_fee_cents <= standard_fee_cents OR kind <> 'charge'),
  CHECK (kind = 'charge' OR refers_to IS NOT NULL),
  CHECK (admin_override_by IS NULL OR admin_override_reason IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS provider_lead_ledger_provider_idx
  ON public.provider_lead_ledger (provider_key, created_at DESC);
CREATE INDEX IF NOT EXISTS provider_lead_ledger_booking_idx
  ON public.provider_lead_ledger (booking_id);

CREATE OR REPLACE FUNCTION public.provider_lead_ledger_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'provider_lead_ledger ist append-only: % nicht erlaubt (Zeile %)', TG_OP, OLD.id
    USING ERRCODE = 'restrict_violation';
END $$;

DROP TRIGGER IF EXISTS provider_lead_ledger_no_update ON public.provider_lead_ledger;
CREATE TRIGGER provider_lead_ledger_no_update
  BEFORE UPDATE OR DELETE ON public.provider_lead_ledger
  FOR EACH ROW EXECUTE FUNCTION public.provider_lead_ledger_immutable();

-- Der Zahlungsstatus MUSS sich aber aendern koennen (pending -> captured).
-- Nicht per UPDATE auf der Zeile, sondern als eigene Statusspur — sonst
-- waere "append-only" eine Luege mit Ausnahme.
CREATE TABLE IF NOT EXISTS public.provider_lead_ledger_payment_events (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ledger_id     uuid        NOT NULL REFERENCES public.provider_lead_ledger(id),
  status        text        NOT NULL CHECK (status IN ('pending', 'authorized', 'captured', 'failed', 'refunded')),
  stripe_ref    text,
  detail        text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS provider_lead_ledger_payment_events_idx
  ON public.provider_lead_ledger_payment_events (ledger_id, created_at DESC);

-- ════════════════════════════════════════════════════════════════════════════
-- 6. Guthaben (Spec B: 30 % bei ausbleibender Neubuchung, nie Auszahlung)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.provider_credits (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key  text        NOT NULL REFERENCES public.providers(provider_key),
  amount_cents  integer     NOT NULL CHECK (amount_cents <> 0),   -- positiv = gutgeschrieben, negativ = verbraucht
  currency      text        NOT NULL DEFAULT 'USD',
  reason        text        NOT NULL CHECK (reason IN ('user_no_rebook_30pct', 'platform_failure', 'admin', 'consumed')),
  ledger_id     uuid        REFERENCES public.provider_lead_ledger(id),
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS provider_credits_provider_idx
  ON public.provider_credits (provider_key, created_at DESC);

-- ════════════════════════════════════════════════════════════════════════════
-- 7. Rabattzaehler je Abrechnungszyklus
-- ════════════════════════════════════════════════════════════════════════════
--
-- Spec B: "The counter resets on the monthly billing-cycle date and does not
-- roll over. A plan change must not generate duplicate discounted allowances
-- in the same cycle." Der Zaehler haengt deshalb am ANBIETER und am
-- Zyklusbeginn, nicht am Abo: wechselt der Plan im Zyklus, findet der neue
-- Plan denselben Zaehler vor und kann das Kontingent nur bis zu seinem
-- eigenen `lead_discount_count` ausschoepfen — nie von vorn.

CREATE TABLE IF NOT EXISTS public.provider_discount_counter (
  provider_key  text        NOT NULL REFERENCES public.providers(provider_key) ON DELETE CASCADE,
  cycle_start   date        NOT NULL,
  used          integer     NOT NULL DEFAULT 0 CHECK (used >= 0),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider_key, cycle_start)
);

-- ════════════════════════════════════════════════════════════════════════════
-- 8. RLS: alles deny-all. Die API spricht ueber die Service-Rolle.
-- ════════════════════════════════════════════════════════════════════════════
--
-- Spec B: "Subscription information is visible only to the provider and
-- authorized CompliHub360 administrators." Kein Browser-Key liest hier.
-- `plan_catalog` und `lead_band_config` sind Preislisten, keine Geheimnisse —
-- aber auch sie gehen ueber die API, damit die Matching-Flaeche sie nie
-- versehentlich mitliest (Acceptance-Checklist: "Subscription fields never
-- appear in the user matching interface").

ALTER TABLE public.plan_catalog                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_subscriptions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_band_config                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_band_rules                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_fee_eligibility                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_lead_ledger                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_lead_ledger_payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_credits                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_discount_counter           ENABLE ROW LEVEL SECURITY;
