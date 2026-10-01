-- ─── Change-Control: haelt das Schema, was §18 verspricht? ──────────────────
--
-- Gehoert zu 20261002000000_change_control.sql. Geprueft werden die
-- Eigenschaften, wegen derer die Migration existiert:
--
--   1. Die neuen Spalten gibt es, `effect` kennt genau drei Werte.
--   2. Ein Ereignis (pause) ist immer die 24-Stunden-Klasse und traegt
--      seinen Typ; ein normaler Vorgang traegt keinen.
--   3. Abgelehnt wird nie ohne Begruendung.
--   4. Hoechstens EIN offener wartender Vorgang je Partner und Ziel — ein
--      entschiedener oder ein sofort uebernommener zaehlt nicht mit.
--   5. Die Matching-View haengt nicht an der Tabelle.

begin;
select plan(12);

insert into public.providers (provider_key, name, lifecycle_status)
values ('cc-test', 'CC Test GmbH', 'active');
insert into public.provider_services (id, provider_key, service_code, service_name, status, status_since)
values ('00000000-0000-0000-0000-0000000000c1', 'cc-test', 'tax-vat', 'USt', 'approved', now());

-- ─── 1. Spalten ─────────────────────────────────────────────────────────────

select has_column('public', 'provider_change_requests', 'effect', 'effect gibt es');
select has_column('public', 'provider_change_requests', 'applied_at', 'applied_at gibt es');
select has_column('public', 'provider_change_requests', 'affected_service_ids', 'affected_service_ids gibt es');
select throws_ok(
  $$ insert into public.provider_change_requests (provider_key, change_type, deadline_class, effect)
     values ('cc-test', 'pricing', 'before_effective_date', 'maybe') $$,
  '23514', null, 'effect kennt nur held, applied, pause');

-- ─── 2. Form eines Ereignisses ──────────────────────────────────────────────

select throws_ok(
  $$ insert into public.provider_change_requests (provider_key, change_type, deadline_class, effect, event_type)
     values ('cc-test', 'material_event', 'within_3_business_days', 'pause', 'insurance_lost') $$,
  '23514', null, 'Ein Ereignis ist immer immediate_24h');
select throws_ok(
  $$ insert into public.provider_change_requests (provider_key, change_type, deadline_class, effect)
     values ('cc-test', 'material_event', 'immediate_24h', 'pause') $$,
  '23514', null, 'Ein Ereignis ohne Typ wird abgewiesen');
select lives_ok(
  $$ insert into public.provider_change_requests (provider_key, change_type, deadline_class, effect, event_type, affected_service_ids)
     values ('cc-test', 'material_event', 'immediate_24h', 'pause', 'insurance_lost', array['00000000-0000-0000-0000-0000000000c1']::uuid[]) $$,
  'Ein vollstaendiges Ereignis wird angenommen');

-- ─── 3. Ablehnung mit Begruendung ───────────────────────────────────────────

select throws_ok(
  $$ insert into public.provider_change_requests (provider_key, change_type, deadline_class, effect, status, reviewer_note)
     values ('cc-test', 'pricing', 'before_effective_date', 'held', 'rejected', '  ') $$,
  '23514', null, 'Abgelehnt ohne Begruendung geht nicht');

-- ─── 4. Ein offener wartender Vorgang je Ziel ───────────────────────────────

insert into public.provider_change_requests (provider_key, service_id, change_type, deadline_class, effect)
values ('cc-test', '00000000-0000-0000-0000-0000000000c1', 'pricing', 'before_effective_date', 'held');
select throws_ok(
  $$ insert into public.provider_change_requests (provider_key, service_id, change_type, deadline_class, effect)
     values ('cc-test', '00000000-0000-0000-0000-0000000000c1', 'scope', 'before_effective_date', 'held') $$,
  '23505', null, 'Ein zweiter offener wartender Vorgang fuer dieselbe Leistung wird abgewiesen');
select lives_ok(
  $$ insert into public.provider_change_requests (provider_key, service_id, change_type, deadline_class, effect, applied_at)
     values ('cc-test', '00000000-0000-0000-0000-0000000000c1', 'support', 'within_3_business_days', 'applied', now()) $$,
  'Ein sofort uebernommener Vorgang daneben ist erlaubt');
select lives_ok(
  $$ insert into public.provider_change_requests (provider_key, change_type, deadline_class, effect)
     values ('cc-test', 'legal_name', 'within_3_business_days', 'held') $$,
  'Ein wartender Vorgang fuer das Konto (ohne Leistung) ist ein eigenes Ziel');

-- ─── 5. Matching-View unabhaengig ───────────────────────────────────────────

select is((select count(*)::int from pg_depend d
            join pg_rewrite rw on rw.oid = d.objid
            join pg_class v on v.oid = rw.ev_class and v.relname = 'matchable_provider_services'
            join pg_class t on t.oid = d.refobjid and t.relname = 'provider_change_requests'), 0,
          'matchable_provider_services liest provider_change_requests nicht');

select * from finish();
rollback;
