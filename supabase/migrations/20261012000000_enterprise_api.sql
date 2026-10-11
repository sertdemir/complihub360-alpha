-- ════════════════════════════════════════════════════════════════════════════
-- Provider Phase 7: Enterprise-API — Clients, Scopes, gehashte Schluessel,
-- Rate Limits, Aufruf-Protokoll, Lead-Status aus dem CRM
-- ════════════════════════════════════════════════════════════════════════════
--
-- Spec B "Global enterprise API": nur unter Global und auch dann nicht
-- automatisch — der Anbieter beantragt, das Team gibt frei (Use-Case,
-- Felder, Auth, Rate Limit). Scoped Credentials, Audit-Protokoll, Sperre
-- und Widerruf. ADR-0010, TKT-PROV-15.
--
-- Was hier NICHT steht: der Schluessel im Klartext. Gespeichert wird nur
-- der SHA-256-Hash; das Praefix dient der Anzeige. Ein verlorener Schluessel
-- wird rotiert, nie wiederhergestellt.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. Clients: Antrag → Freigabe → Schluessel → aktiv; Sperre, Widerruf
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.api_clients (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key           text        NOT NULL REFERENCES public.providers(provider_key) ON DELETE CASCADE,
  name                   text        NOT NULL,
  status                 text        NOT NULL DEFAULT 'requested'
                                     CHECK (status IN ('requested', 'approved', 'active', 'suspended', 'revoked', 'rejected')),
  use_case               text        NOT NULL,
  contact_name           text,
  contact_email          text        NOT NULL,
  requested_scopes       text[]      NOT NULL DEFAULT '{}',
  scopes                 text[]      NOT NULL DEFAULT '{}',
  rate_limit_per_minute  integer     NOT NULL DEFAULT 120 CHECK (rate_limit_per_minute BETWEEN 1 AND 10000),
  terms_version          text        NOT NULL,
  key_hash               text        UNIQUE,
  key_prefix             text,
  key_created_at         timestamptz,
  -- Rotation: der vorige Hash gilt noch bis previous_key_valid_until.
  previous_key_hash      text,
  previous_key_valid_until timestamptz,
  last_used_at           timestamptz,
  last_used_ip           text,
  approved_by            uuid,
  approved_at            timestamptz,
  fee_note               text,
  decision_note          text,
  suspended_at           timestamptz,
  suspended_reason       text,
  revoked_at             timestamptz,
  revoked_by             text        CHECK (revoked_by IN ('provider', 'admin')),
  created_by             uuid,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'active' OR key_hash IS NOT NULL),
  CHECK (status <> 'suspended' OR suspended_reason IS NOT NULL),
  CHECK (previous_key_hash IS NULL OR previous_key_valid_until IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS api_clients_provider_idx ON public.api_clients (provider_key, created_at DESC);
CREATE INDEX IF NOT EXISTS api_clients_previous_hash_idx ON public.api_clients (previous_key_hash) WHERE previous_key_hash IS NOT NULL;

COMMENT ON TABLE public.api_clients IS
  'Enterprise-API-Zugaenge (Spec B "Global enterprise API"). Ein Client je Antrag: requested → approved (Team) → active (Anbieter erzeugt den Schluessel) → suspended/revoked. Nur der SHA-256-Hash des Schluessels liegt hier; scopes vergibt das Team, requested_scopes ist der Wunsch des Anbieters.';
COMMENT ON COLUMN public.api_clients.scopes IS
  'leads:read, leads:write, events:read, billing:read, availability:write (nur mit eigener Freigabe).';
COMMENT ON COLUMN public.api_clients.fee_note IS
  'Implementierungsgebuehr als Notiz des Teams — manuell abgerechnet, keine Automatik.';

-- ════════════════════════════════════════════════════════════════════════════
-- 2. Aufruf-Protokoll (Audit), 90 Tage
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.api_request_log (
  id              bigserial   PRIMARY KEY,
  client_id       uuid        NOT NULL REFERENCES public.api_clients(id) ON DELETE CASCADE,
  provider_key    text        NOT NULL,
  method          text        NOT NULL,
  route           text        NOT NULL,
  status          integer     NOT NULL,
  duration_ms     integer,
  correlation_id  text,
  ip              text,
  at              timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS api_request_log_client_at_idx ON public.api_request_log (client_id, at DESC);

COMMENT ON TABLE public.api_request_log IS
  'Eine Zeile je Aufruf der Enterprise-API: Route, Status, Dauer, Korrelation. Der Watcher loescht Zeilen aelter als 90 Tage. Keine Nutzlast, keine Nutzerdaten.';

-- ════════════════════════════════════════════════════════════════════════════
-- 3. Lead-Status aus dem System des Anbieters
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.scheduling
  ADD COLUMN IF NOT EXISTS ext_status    text CHECK (ext_status IN ('new', 'contacted', 'proposal_sent', 'won', 'lost', 'closed')),
  ADD COLUMN IF NOT EXISTS ext_status_at timestamptz;

COMMENT ON COLUMN public.scheduling.ext_status IS
  'Lead-Status, den der Anbieter ueber die Enterprise-API zurueckschreibt (Spec B "Update internal lead status"). Reine Selbstauskunft; fliesst nicht ins Ranking.';

-- ════════════════════════════════════════════════════════════════════════════
-- Zugriff: deny-all, nur der Service-Role-Schluessel der API
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.api_clients      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_request_log  ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.api_clients     FROM anon, authenticated;
REVOKE ALL ON public.api_request_log FROM anon, authenticated;
