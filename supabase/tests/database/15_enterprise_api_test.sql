-- pgTAP: Provider Phase 7 — Enterprise-API (ADR-0010, TKT-PROV-15)
-- Gehoert zu 20261012000000_enterprise_api.sql:
-- Clients mit Lebenszyklus, nur Hash, Protokoll, Lead-Status; deny-all.
BEGIN;
SELECT plan(11);

SELECT has_table('public', 'api_clients', 'api_clients existiert');
SELECT has_table('public', 'api_request_log', 'api_request_log existiert');
SELECT has_column('public', 'scheduling', 'ext_status', 'scheduling.ext_status existiert');

-- Anbieter fuer die Zeilen
INSERT INTO public.providers (provider_key, name) VALUES ('p7-api', 'Phase 7 API Kanzlei')
ON CONFLICT (provider_key) DO NOTHING;

-- Antrag ohne Schluessel ist erlaubt
SELECT lives_ok($$
  INSERT INTO public.api_clients (provider_key, name, use_case, contact_email, requested_scopes, terms_version)
  VALUES ('p7-api', 'CRM', 'HubSpot-Anbindung', 'it@example.test', ARRAY['leads:read'], 'api-terms-v1')
$$, 'Antrag ohne Schluessel');

-- active verlangt einen Hash
SELECT throws_ok($$
  INSERT INTO public.api_clients (provider_key, name, use_case, contact_email, terms_version, status)
  VALUES ('p7-api', 'CRM2', 'x', 'it@example.test', 'api-terms-v1', 'active')
$$, '23514', NULL, 'active ohne key_hash ist verboten');

-- suspended verlangt einen Grund
SELECT throws_ok($$
  INSERT INTO public.api_clients (provider_key, name, use_case, contact_email, terms_version, status, key_hash)
  VALUES ('p7-api', 'CRM3', 'x', 'it@example.test', 'api-terms-v1', 'suspended', 'h3')
$$, '23514', NULL, 'suspended ohne Grund ist verboten');

-- der Hash ist eindeutig
INSERT INTO public.api_clients (provider_key, name, use_case, contact_email, terms_version, status, key_hash, key_prefix)
VALUES ('p7-api', 'CRM4', 'x', 'it@example.test', 'api-terms-v1', 'active', 'hash-a', 'chk_live_aaaa');
SELECT throws_ok($$
  INSERT INTO public.api_clients (provider_key, name, use_case, contact_email, terms_version, status, key_hash, key_prefix)
  VALUES ('p7-api', 'CRM5', 'x', 'it@example.test', 'api-terms-v1', 'active', 'hash-a', 'chk_live_aaaa')
$$, '23505', NULL, 'derselbe Hash zweimal ist verboten');

-- Rate Limit im erlaubten Bereich
SELECT throws_ok($$
  INSERT INTO public.api_clients (provider_key, name, use_case, contact_email, terms_version, rate_limit_per_minute)
  VALUES ('p7-api', 'CRM6', 'x', 'it@example.test', 'api-terms-v1', 0)
$$, '23514', NULL, 'Rate Limit 0 ist verboten');

-- Protokoll haengt am Client
SELECT lives_ok($$
  INSERT INTO public.api_request_log (client_id, provider_key, method, route, status, duration_ms)
  SELECT id, provider_key, 'GET', '/api/v1/ext/leads', 200, 84 FROM public.api_clients WHERE name = 'CRM4'
$$, 'Protokollzeile');

-- Lead-Status nur aus der Liste (CHECK-Constraint auf der Spalte)
SELECT ok(EXISTS (
  SELECT 1 FROM pg_constraint
  WHERE conrelid = 'public.scheduling'::regclass AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%ext_status%proposal_sent%'
), 'ext_status traegt einen CHECK auf die Statusliste');

-- deny-all
SELECT ok(
  NOT has_table_privilege('anon', 'public.api_clients', 'SELECT')
  AND NOT has_table_privilege('authenticated', 'public.api_request_log', 'SELECT'),
  'anon und authenticated lesen weder Clients noch Protokoll');

SELECT * FROM finish();
ROLLBACK;
