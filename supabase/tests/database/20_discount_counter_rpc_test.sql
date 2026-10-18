-- ─── B9: Rabattzaehler atomar ────────────────────────────────────────────────
--
-- Gehoert zu 20261018000300_discount_counter_rpc.sql. Geprueft wird:
--
--   1. Erster Aufruf legt die Zeile an und gibt 1 zurueck.
--   2. Zweiter Aufruf erhoeht und gibt 2 zurueck — ohne Read-before-write.
--   3. Ein negativer Schritt zaehlt als null.
--   4. anon darf die Funktion nicht ausfuehren.

begin;
select plan(5);

insert into public.providers (provider_key, name, partner_status, lifecycle_status)
values ('b9-kanzlei', 'B9 Kanzlei', 'active', 'active');

select is(public.increment_discount_counter('b9-kanzlei', '2026-10-01', 1), 1, 'Erster Lead im Zyklus: 1');
select is(public.increment_discount_counter('b9-kanzlei', '2026-10-01', 1), 2, 'Zweiter Lead: 2, atomar erhoeht');
select is(public.increment_discount_counter('b9-kanzlei', '2026-10-01', -5), 2, 'Ein negativer Schritt aendert nichts');
select is((select used from public.provider_discount_counter where provider_key = 'b9-kanzlei' and cycle_start = '2026-10-01'), 2,
  'Die Zeile traegt den Stand');

set local role anon;
select throws_ok(
  $$ select public.increment_discount_counter('b9-kanzlei', '2026-10-01', 1) $$,
  '42501', null, 'anon darf den Zaehler nicht anfassen');
reset role;

select * from finish();
rollback;
