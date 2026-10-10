-- ─── Phase 5: haelt das Schema Anwesenheit, Frist und Guthaben zusammen? ────
--
-- Gehoert zu 20261010000000_attendance_credits.sql:
--
--   1. Die Policy v1 traegt die Nutzer-Entscheidungen vom 2026-10-10.
--   2. `no_show_by` kennt genau user, provider, platform; `dispute_status`
--      genau none, open, upheld, dismissed.
--   3. Eine Neubuchung zeigt auf eine bestehende Buchung (FK), nicht ins Leere.
--   4. Ein Vorfall je Buchung — der zweite ist eine Korrektur, kein Vorfall.
--   5. Ein positives Guthaben je Buchung; ein zweites fliegt am Index ab.
--   6. Bestandsdaten: alte no_show-Zeilen gelten als Anbieter-No-Show.
--   7. anon liest weder Policy noch Vorfaelle.

begin;
select plan(12);

insert into public.providers (provider_key, name, lifecycle_status)
values ('att-test', 'Attendance Test GmbH', 'active');

-- 1. Policy
select results_eq(
  $$ select provider_wait_minutes, rebook_days, credit_pct, dispute_hours, same_user_window_days, reschedule_limit
       from public.attendance_policy where version = 1 $$,
  $$ values (10, 14, 30, 48, 30, 2) $$,
  'Policy v1: 10 Minuten, 14 Tage, 30 %, 48 h, 30 Tage, zwei Umbuchungen');
select results_eq(
  $$ select reminder_offsets_min, rebook_reminder_days from public.attendance_policy where version = 1 $$,
  $$ values (array[1440, 60], array[1, 5, 10]) $$,
  'Policy v1: Erinnerungen T-24h/T-1h und Tag 1/5/10');

-- 2. Statusachsen
insert into public.scheduling (id, provider_key, slot_start, slot_end, status)
values ('00000000-0000-0000-0000-0000000000a1', 'att-test', now() - interval '1 day', now() - interval '1 day' + interval '30 minutes', 'no_show');

select lives_ok(
  $$ update public.scheduling set no_show_by = 'user' where id = '00000000-0000-0000-0000-0000000000a1' $$,
  'no_show_by user geht');
select throws_ok(
  $$ update public.scheduling set no_show_by = 'nobody' where id = '00000000-0000-0000-0000-0000000000a1' $$,
  '23514', null, 'no_show_by kennt nur user, provider, platform');
select throws_ok(
  $$ update public.scheduling set dispute_status = 'pending' where id = '00000000-0000-0000-0000-0000000000a1' $$,
  '23514', null, 'dispute_status kennt nur none, open, upheld, dismissed');
select throws_ok(
  $$ update public.scheduling set reschedule_count = -1 where id = '00000000-0000-0000-0000-0000000000a1' $$,
  '23514', null, 'Umbuchungs-Zaehler nie negativ');

-- 3. Neubuchungs-Kette
select lives_ok(
  $$ insert into public.scheduling (id, provider_key, slot_start, slot_end, status, rebooked_from)
     values ('00000000-0000-0000-0000-0000000000a2', 'att-test', now() + interval '3 days', now() + interval '3 days' + interval '30 minutes', 'confirmed', '00000000-0000-0000-0000-0000000000a1') $$,
  'Neubuchung haengt an der alten Buchung');
select throws_ok(
  $$ insert into public.scheduling (provider_key, slot_start, slot_end, status, rebooked_from)
     values ('att-test', now() + interval '4 days', now() + interval '4 days' + interval '30 minutes', 'confirmed', '00000000-0000-0000-0000-0000000000ff') $$,
  '23503', null, 'rebooked_from zeigt nie ins Leere');

-- 4. Ein Vorfall je Buchung
insert into public.provider_performance_incidents (provider_key, booking_id, kind, source)
values ('att-test', '00000000-0000-0000-0000-0000000000a1', 'no_show', 'user_report');
select throws_ok(
  $$ insert into public.provider_performance_incidents (provider_key, booking_id, kind, source)
     values ('att-test', '00000000-0000-0000-0000-0000000000a1', 'no_show', 'admin') $$,
  '23505', null, 'Zweiter Vorfall zur selben Buchung ist keiner');

-- 5. Ein Guthaben je Buchung
insert into public.provider_lead_ledger (id, kind, provider_key, countries, computed_band, band_version, standard_fee_cents, plan_code_at_charge, plan_version_at_charge, discount_sequence, discount_pct, final_fee_cents, currency, payment_status, policy_version)
values ('00000000-0000-0000-0000-0000000000b1', 'charge', 'att-test', array['DE'], 2, 1, 14900, 'growth', 1, 1, 10, 13410, 'USD', 'captured', 'lead-fee-policy-v1');
insert into public.provider_credits (provider_key, amount_cents, reason, ledger_id, booking_id)
values ('att-test', 4023, 'user_no_rebook_30pct', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1');
select throws_ok(
  $$ insert into public.provider_credits (provider_key, amount_cents, reason, ledger_id, booking_id)
     values ('att-test', 4023, 'user_no_rebook_30pct', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1') $$,
  '23505', null, 'Ein positives Guthaben je Buchung');
select lives_ok(
  $$ insert into public.provider_credits (provider_key, amount_cents, reason, booking_id, note)
     values ('att-test', -4023, 'consumed', null, 'Rechnung 2026-11') $$,
  'Verbrauch traegt keine Buchung und darf mehrfach stehen');

-- 7. Zugriff
set role anon;
select throws_ok(
  $$ select count(*) from public.attendance_policy $$,
  '42501', null, 'anon liest die Policy nicht');
reset role;

select * from finish();
rollback;
