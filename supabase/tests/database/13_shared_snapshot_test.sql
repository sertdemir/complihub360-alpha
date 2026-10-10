-- ─── Schnappschuss der geteilten Werte: haelt das Schema die Form? ───────────
--
-- Gehoert zu 20261011000000_booking_shared_snapshot.sql:
--   1. Die Spalte gibt es, und aeltere Buchungen ohne Schnappschuss bleiben gueltig.
--   2. Nur die vier Schluessel email, company_name, message, topic.
--   3. Ein Wert steht nur, wenn sein Feld in shared_fields freigegeben ist.

begin;
select plan(5);

select has_column('public', 'scheduling', 'shared_snapshot', 'scheduling.shared_snapshot existiert');

insert into public.providers (provider_key, name, partner_status, lifecycle_status)
values ('t-snap', 'Schnappschusskanzlei', 'active', 'active');

select lives_ok(
  $$ insert into public.scheduling (provider_key, slot_start, slot_end, status, shared_fields, shared_snapshot)
     values ('t-snap', '2026-11-02 10:00+00', '2026-11-02 10:30+00', 'confirmed',
             array['email', 'company_name', 'message'],
             '{"email": "a@b.example", "company_name": "Acme GmbH", "message": null, "topic": {"area_code": "tax-vat", "countries": ["DE"]}}') $$,
  'Ein Schnappschuss mit den freigegebenen Feldern und dem Thema ist gueltig');

select lives_ok(
  $$ insert into public.scheduling (provider_key, slot_start, slot_end, status, shared_fields)
     values ('t-snap', '2026-11-02 11:00+00', '2026-11-02 11:30+00', 'confirmed', array['email']) $$,
  'Eine aeltere Buchung ohne Schnappschuss bleibt gueltig');

select throws_ok(
  $$ insert into public.scheduling (provider_key, slot_start, slot_end, status, shared_fields, shared_snapshot)
     values ('t-snap', '2026-11-02 12:00+00', '2026-11-02 12:30+00', 'confirmed',
             array['email', 'company_name', 'message'], '{"email": "a@b.example", "phone": "+49 1"}') $$,
  '23514', null, 'Ein weiterer Schluessel (phone) wird abgewiesen');

select throws_ok(
  $$ insert into public.scheduling (provider_key, slot_start, slot_end, status, shared_fields, shared_snapshot)
     values ('t-snap', '2026-11-02 13:00+00', '2026-11-02 13:30+00', 'confirmed',
             array['email'], '{"email": "a@b.example", "company_name": "Acme GmbH"}') $$,
  '23514', null, 'Eine Firma ohne Freigabe von company_name wird abgewiesen');

select * from finish();
rollback;
