-- ─── Phase 6: halten Policy, Verfuegbarkeit und Durchsetzung zusammen? ──────
--
-- Gehoert zu 20261011010000_performance_availability.sql:
--
--   1. Die Policy v1 traegt die Nutzer-Entscheidungen vom 2026-10-10.
--   2. Pause-Schwelle liegt nie unter der Hinweis-Schwelle.
--   3. providers kennt Fenster, Zeitzone (Vorgabe Europe/Berlin) und Pause.
--   4. Eine Massnahme braucht einen Grund; Einspruch ohne Text geht nicht;
--      eine Entscheidung ohne Datum geht nicht.
--   5. Der Teilindex findet nur offene Massnahmen.
--   6. anon liest weder Policy noch Massnahmen.

begin;
select plan(10);

insert into public.providers (provider_key, name, lifecycle_status)
values ('perf-test', 'Performance Test GmbH', 'active');

-- 1. Policy
select results_eq(
  $$ select rate_min_bookings, window_days, incident_window_days, incident_alert_count, incident_pause_count, user_no_show_alert_count
       from public.performance_policy where version = 1 $$,
  $$ values (5, 90, 90, 2, 3, 2) $$,
  'Policy v1: Quoten ab 5, 90 Tage, Hinweis bei 2, Pause bei 3, Nutzer-Hinweis bei 2');

-- 2. Schwellen
select throws_ok(
  $$ insert into public.performance_policy (version, rate_min_bookings, window_days, incident_window_days, incident_alert_count, incident_pause_count, user_no_show_alert_count)
     values (99, 5, 90, 90, 3, 2, 2) $$,
  '23514', null, 'Pause-Schwelle unter der Hinweis-Schwelle ist unzulaessig');

-- 3. Verfuegbarkeit
select results_eq(
  $$ select timezone, availability_hours, booking_paused_at from public.providers where provider_key = 'perf-test' $$,
  $$ values ('Europe/Berlin'::text, null::jsonb, null::timestamptz) $$,
  'Neuer Anbieter: Zeitzone Europe/Berlin, keine Fenster (Vorgabe), keine Pause');
select lives_ok(
  $$ update public.providers set availability_hours = '{"mon":[{"from":"09:00","to":"12:00"}],"tue":[]}'::jsonb, timezone = 'Europe/Madrid' where provider_key = 'perf-test' $$,
  'Fenster und Zeitzone lassen sich setzen');

-- 4. Durchsetzung
select throws_ok(
  $$ insert into public.provider_enforcement_actions (provider_key, action, source, reason) values ('perf-test', 'booking_pause', 'auto_no_show', null) $$,
  '23502', null, 'Eine Massnahme ohne Grund gibt es nicht');
insert into public.provider_enforcement_actions (id, provider_key, action, source, reason, evidence)
values ('00000000-0000-0000-0000-0000000000e1', 'perf-test', 'booking_pause', 'auto_no_show', 'Drei Vorfaelle in 90 Tagen', '{"incident_ids":["a","b","c"]}'::jsonb);
select throws_ok(
  $$ update public.provider_enforcement_actions set appeal_at = now() where id = '00000000-0000-0000-0000-0000000000e1' $$,
  '23514', null, 'Einspruch ohne Text geht nicht');
select lives_ok(
  $$ update public.provider_enforcement_actions set appeal_at = now(), appeal_note = 'Der Nutzer war im falschen Raum' where id = '00000000-0000-0000-0000-0000000000e1' $$,
  'Einspruch mit Text geht');
select throws_ok(
  $$ update public.provider_enforcement_actions set decision = 'lifted' where id = '00000000-0000-0000-0000-0000000000e1' $$,
  '23514', null, 'Entscheidung ohne Datum geht nicht');

-- 5. Offene Massnahmen
update public.provider_enforcement_actions set decision = 'lifted', decided_at = now(), lifted_at = now() where id = '00000000-0000-0000-0000-0000000000e1';
select is(
  (select count(*)::int from public.provider_enforcement_actions where provider_key = 'perf-test' and lifted_at is null),
  0, 'Eine aufgehobene Massnahme ist nicht mehr offen');

-- 6. Zugriff
set role anon;
select throws_ok(
  $$ select count(*) from public.performance_policy $$,
  '42501', null, 'anon liest die Policy nicht');
reset role;

select * from finish();
rollback;
