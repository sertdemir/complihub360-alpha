-- ─── „Gilt ab": haelt das Schema die Einplanung zusammen? ────────────────────
--
-- Gehoert zu 20261004000000_change_schedule.sql:
--
--   1. Ein eingeplanter Vorgang (held, approved, nicht uebernommen) braucht
--      ein Datum; ein uebernommener oder ein Ereignis nicht.
--   2. Ein eingeplanter Vorgang blockiert keinen neuen wartenden Vorgang
--      desselben Ziels — der Index "ein offener wartender" zaehlt ihn nicht.
--   3. Den Teilindex fuer den Waechter gibt es.

begin;
select plan(5);

insert into public.providers (provider_key, name, lifecycle_status)
values ('cs-test', 'CS Test GmbH', 'active');
insert into public.provider_services (id, provider_key, service_code, service_name, status, status_since)
values ('00000000-0000-0000-0000-0000000000d1', 'cs-test', 'tax-vat', 'USt', 'approved', now());

select throws_ok(
  $$ insert into public.provider_change_requests (provider_key, service_id, change_type, deadline_class, effect, status)
     values ('cs-test', '00000000-0000-0000-0000-0000000000d1', 'pricing', 'before_effective_date', 'held', 'approved') $$,
  '23514', null, 'Eingeplant ohne Datum geht nicht');

select lives_ok(
  $$ insert into public.provider_change_requests (provider_key, service_id, change_type, deadline_class, effect, status, effective_at)
     values ('cs-test', '00000000-0000-0000-0000-0000000000d1', 'pricing', 'before_effective_date', 'held', 'approved', now() + interval '30 days') $$,
  'Eingeplant mit Datum geht');

select lives_ok(
  $$ insert into public.provider_change_requests (provider_key, service_id, change_type, deadline_class, effect, status, applied_at)
     values ('cs-test', '00000000-0000-0000-0000-0000000000d1', 'pricing', 'before_effective_date', 'held', 'approved', now()) $$,
  'Uebernommen braucht kein Datum mehr');

select lives_ok(
  $$ insert into public.provider_change_requests (provider_key, service_id, change_type, deadline_class, effect, status, effective_at)
     values ('cs-test', '00000000-0000-0000-0000-0000000000d1', 'pricing', 'before_effective_date', 'held', 'submitted', now() + interval '60 days') $$,
  'Neben einem eingeplanten darf ein neuer wartender Vorgang stehen');

select has_index('public', 'provider_change_requests', 'provider_change_requests_scheduled_idx', 'Teilindex fuer den Waechter');

select * from finish();
rollback;
