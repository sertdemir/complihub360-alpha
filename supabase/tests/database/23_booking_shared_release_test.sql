-- ─── Offenlegung erst nach dem Audit ─────────────────────────────────────────
--
-- Gehoert zu 20261023000000_booking_shared_release.sql. Geprueft wird:
--
--   1. scheduling.shared_released_at gibt es, nullable, als timestamptz.
--   2. Ein Audit lead.revealed je Buchung — das zweite scheitert (23505).
--   3. Andere Ereignistypen mit derselben bookingId bleiben moeglich.

begin;
select plan(5);

select has_column('public', 'scheduling', 'shared_released_at', 'scheduling hat shared_released_at');
select col_type_is('public', 'scheduling', 'shared_released_at', 'timestamp with time zone', 'als timestamptz');
select col_is_null('public', 'scheduling', 'shared_released_at', 'nullable: NULL heisst noch nicht freigegeben');

insert into public.event_log (type, payload) values ('lead.revealed', '{"bookingId": "00000000-0000-0000-0000-0000000000b1"}');
select throws_ok($$ insert into public.event_log (type, payload) values ('lead.revealed', '{"bookingId": "00000000-0000-0000-0000-0000000000b1"}') $$,
  '23505', null, 'ein Audit je Buchung');
select lives_ok($$ insert into public.event_log (type, payload) values ('scheduling_confirmed', '{"bookingId": "00000000-0000-0000-0000-0000000000b1"}') $$,
  'andere Ereignisse mit derselben bookingId bleiben moeglich');

select * from finish();
rollback;
