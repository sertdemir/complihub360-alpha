-- ─── Ein Abo kann entstehen: die Tabelle traegt den Schreiber ────────────────
--
-- Gehoert zu 20261001010000_subscription_writer.sql. Geprueft wird:
--
--   1. Das Entscheidungsprotokoll nimmt 'subscription' an (und nichts Beliebiges).
--   2. `source` ist Pflicht, hat einen Default und laesst nur zwei Werte zu.
--   3. Hoechstens EIN nicht beendetes Abo je Anbieter — der Invariant, an dem
--      die Tarifwahl ihre 409 festmacht.
--   4. 'ended' und `ended_at` gehoeren zusammen.
--   5. Das Abo bleibt aus dem Matching heraus: `matchable_provider_services`
--      haengt an keiner Abo-Spalte. Spec A §14, Spec B "Ranking benefit: Never".

begin;
select plan(9);

insert into public.providers (provider_key, name, partner_status, lifecycle_status)
values ('abo-test-1', 'Abo Testkanzlei', 'active', 'active'), ('abo-test-2', 'Abo Zweitkanzlei', 'active', 'active');

-- ─── 1. Protokoll ───────────────────────────────────────────────────────────

insert into public.provider_review_log (provider_key, subject, action, actor_kind)
values ('abo-test-1', 'subscription', 'subscription_started', 'provider');
select is(
  (select count(*)::int from public.provider_review_log where provider_key = 'abo-test-1' and subject = 'subscription'),
  1, 'Das Entscheidungsprotokoll nimmt subject = subscription an');

select throws_ok(
  $$ insert into public.provider_review_log (provider_key, subject, action, actor_kind)
     values ('abo-test-1', 'tarif', 'x', 'provider') $$,
  '23514', null, 'Ein erfundenes subject bleibt draussen');

-- ─── 2. Herkunft ────────────────────────────────────────────────────────────

insert into public.provider_subscriptions
  (provider_key, plan_code, plan_version, cadence, current_period_start, current_period_end)
values ('abo-test-1', 'growth', 1, 'monthly', date '2026-10-01', date '2026-11-01');

select is((select source from public.provider_subscriptions where provider_key = 'abo-test-1'),
  'admin', 'Ohne Angabe gilt admin als Herkunft');

select col_not_null('public', 'provider_subscriptions', 'source', 'Die Herkunft ist Pflicht');

select throws_ok(
  $$ insert into public.provider_subscriptions
       (provider_key, plan_code, plan_version, cadence, current_period_start, current_period_end, source)
     values ('abo-test-2', 'growth', 1, 'monthly', date '2026-10-01', date '2026-11-01', 'stripe_checkout') $$,
  '23514', null, 'Nur provider_self_serve und admin');

-- ─── 3. Hoechstens ein offenes Abo ──────────────────────────────────────────

select throws_ok(
  $$ insert into public.provider_subscriptions
       (provider_key, plan_code, plan_version, cadence, current_period_start, current_period_end)
     values ('abo-test-1', 'global', 1, 'monthly', date '2026-10-01', date '2026-11-01') $$,
  '23505', null, 'Ein zweites offenes Abo kollidiert — darauf baut die 409 der Tarifwahl');

-- Beendet man das erste, ist der Platz frei. Genau die zwei Schritte, die die
-- Admin-Zuweisung verlangt, statt eines stillen Wechsels.
update public.provider_subscriptions
   set status = 'ended', ended_at = now()
 where provider_key = 'abo-test-1';

insert into public.provider_subscriptions
  (provider_key, plan_code, plan_version, cadence, current_period_start, current_period_end, source)
values ('abo-test-1', 'global', 1, 'monthly', date '2026-11-01', date '2026-12-01', 'provider_self_serve');
select is((select count(*)::int from public.provider_subscriptions where provider_key = 'abo-test-1'),
  2, 'Nach dem Beenden geht das naechste Abo — die Historie bleibt');

-- ─── 4. ended_at nur mit status ended ───────────────────────────────────────

select throws_ok(
  $$ update public.provider_subscriptions set ended_at = now()
      where provider_key = 'abo-test-1' and ended_at is null $$,
  '23514', null, 'ended_at ohne status = ended bleibt draussen');

-- ─── 5. Das Abo beruehrt das Matching nicht ─────────────────────────────────

select is((
  select count(*)::int
    from pg_depend d
    join pg_rewrite r on r.oid = d.objid
    join pg_class dep on dep.oid = d.refobjid
    join pg_attribute a on a.attrelid = dep.oid and a.attnum = d.refobjsubid
   where r.ev_class = 'public.matchable_provider_services'::regclass
     and dep.relname = 'provider_subscriptions'
), 0, 'matchable_provider_services liest keine Abo-Spalte — der Tarif kauft keine Sichtbarkeit');

select * from finish();
rollback;
