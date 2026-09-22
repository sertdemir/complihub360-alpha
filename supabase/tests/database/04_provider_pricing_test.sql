-- ─── Pricing v2: haelt die Konfiguration, was die Spec verspricht? ──────────
--
-- Gehoert zu 20260923000000_provider_pricing_v2.sql. Geprueft werden nicht
-- die Tabellen (Tautologie), sondern die Eigenschaften, wegen derer es sie
-- gibt:
--
--   1. Die Zahlen aus Spec B stehen so drin, wie die Spec sie nennt.
--   2. Das Jahr kostet zehn Monate — fuer jeden Plan.
--   3. Ein Anbieter hat hoechstens ein offenes Abo.
--   4. Das Ledger ist append-only: UPDATE und DELETE scheitern.
--   5. Legal Support startet ohne Lead-Gebuehr.
--   6. Nichts davon ist fuer anon/authenticated lesbar.
--   7. Die Matching-View liest keine dieser Tabellen — das Abo ist kein
--      Sichtbarkeitsmerkmal (Spec A §14, Spec B Grundsaetze).

begin;
select plan(28);

-- ─── 1. Katalog nach Spec B ─────────────────────────────────────────────────

select is((select count(*)::int from public.plan_catalog where version = 1), 3, 'Drei Plaene in Version 1');
select is((select monthly_cents from public.plan_catalog where code = 'essential' and version = 1),  5900, 'Essential $59/Monat');
select is((select monthly_cents from public.plan_catalog where code = 'growth'    and version = 1),  9900, 'Growth $99/Monat');
select is((select monthly_cents from public.plan_catalog where code = 'global'    and version = 1), 18900, 'Global $189/Monat');
select is((select category_allowance from public.plan_catalog where code = 'essential' and version = 1), 1, 'Essential: eine Hauptkategorie');
select is((select category_allowance from public.plan_catalog where code = 'growth' and version = 1), 5, 'Growth: bis zu fuenf');
select is((select category_allowance from public.plan_catalog where code = 'global' and version = 1), null, 'Global: alle (NULL = unbegrenzt)');
select is((select lead_discount_pct || '/' || lead_discount_count from public.plan_catalog where code = 'growth' and version = 1), '10/3', 'Growth: 10 % auf die ersten 3 Leads');
select is((select lead_discount_pct || '/' || lead_discount_count from public.plan_catalog where code = 'global' and version = 1), '15/6', 'Global: 15 % auf die ersten 6 Leads');
select is((select api_eligible from public.plan_catalog where code = 'growth' and version = 1), false, 'Growth: keine API');
select is((select api_eligible from public.plan_catalog where code = 'global' and version = 1), true, 'Global: API-berechtigt (nach Freigabe)');

-- ─── 2. Das Jahr kostet zehn Monate ────────────────────────────────────────

select is((select count(*)::int from public.plan_catalog where annual_cents <> monthly_cents * 10), 0,
          'Jahrespreis = 10 Monatspreise, fuer jeden Plan');

-- ─── Baender ───────────────────────────────────────────────────────────────

select is((select array_agg(fee_cents order by band) from public.lead_band_config where version = 1),
          array[9900, 14900, 29900, 49900], 'Vier Baender: $99 / $149 / $299 / $499');
select is((select count(*)::int from public.lead_band_rules), 0,
          'Die Zuordnung Kategorie -> Band ist beim Start LEER (Spec: wird separat festgelegt)');

-- ─── 3. Ein offenes Abo je Anbieter ────────────────────────────────────────

insert into public.providers (provider_key, name, partner_status, lifecycle_status)
values ('t-pricing', 'Preiskanzlei', 'active', 'active');

insert into public.provider_subscriptions (provider_key, plan_code, plan_version, cadence, current_period_start, current_period_end)
values ('t-pricing', 'growth', 1, 'monthly', date '2026-09-01', date '2026-10-01');

select throws_ok(
  $$ insert into public.provider_subscriptions (provider_key, plan_code, plan_version, cadence, current_period_start, current_period_end)
     values ('t-pricing', 'global', 1, 'monthly', date '2026-09-15', date '2026-10-15') $$,
  '23505', null, 'Ein zweites offenes Abo scheitert am Partial Unique Index');

select lives_ok(
  $$ update public.provider_subscriptions set status = 'ended', ended_at = now() where provider_key = 't-pricing';
     insert into public.provider_subscriptions (provider_key, plan_code, plan_version, cadence, current_period_start, current_period_end)
     values ('t-pricing', 'global', 1, 'monthly', date '2026-09-15', date '2026-10-15') $$,
  'Nach dem Beenden geht ein neues Abo (Upgrade = neue Zeile)');

insert into public.providers (provider_key, name, partner_status, lifecycle_status)
values ('t-pricing-2', 'Zweite Preiskanzlei', 'active', 'active');
select throws_ok(
  $$ insert into public.provider_subscriptions (provider_key, plan_code, plan_version, cadence, current_period_start, current_period_end)
     values ('t-pricing-2', 'platinum', 1, 'monthly', date '2026-11-01', date '2026-12-01') $$,
  '23503', null, 'Ein Plan, den der Katalog nicht kennt, ist kein Plan');

-- ─── 4. Ledger append-only ─────────────────────────────────────────────────

insert into public.provider_lead_ledger
  (id, provider_key, area_code, countries, computed_band, standard_fee_cents,
   plan_code_at_charge, discount_sequence, discount_pct, final_fee_cents, policy_version)
values
  ('dddddddd-0000-0000-0000-000000000001', 't-pricing', 'tax-vat', array['DE'], 2, 14900,
   'growth', 1, 10, 13410, 'lead-fee-policy-v1');

select throws_ok(
  $$ update public.provider_lead_ledger set final_fee_cents = 0 where id = 'dddddddd-0000-0000-0000-000000000001' $$,
  '23001', null, 'UPDATE auf dem Ledger scheitert');
select throws_ok(
  $$ delete from public.provider_lead_ledger where id = 'dddddddd-0000-0000-0000-000000000001' $$,
  '23001', null, 'DELETE auf dem Ledger scheitert');
select lives_ok(
  $$ insert into public.provider_lead_ledger
       (kind, provider_key, computed_band, standard_fee_cents, final_fee_cents, policy_version, refers_to)
     values ('credit', 't-pricing', 2, 13410, 4023, 'lead-fee-policy-v1', 'dddddddd-0000-0000-0000-000000000001') $$,
  'Eine Korrektur ist eine neue Zeile, die auf die alte zeigt');
select throws_ok(
  $$ insert into public.provider_lead_ledger
       (kind, provider_key, computed_band, standard_fee_cents, final_fee_cents, policy_version)
     values ('credit', 't-pricing', 2, 100, 100, 'lead-fee-policy-v1') $$,
  '23514', null, 'Eine Korrektur ohne Ursprungszeile ist keine Korrektur');
select throws_ok(
  $$ insert into public.provider_lead_ledger
       (provider_key, computed_band, standard_fee_cents, final_fee_cents, policy_version)
     values ('t-pricing', 1, 9900, 12000, 'lead-fee-policy-v1') $$,
  '23514', null, 'Eine Belastung ueber dem Standardpreis gibt es nicht');
select lives_ok(
  $$ insert into public.provider_lead_ledger_payment_events (ledger_id, status, stripe_ref)
     values ('dddddddd-0000-0000-0000-000000000001', 'captured', 'pi_test') $$,
  'Der Zahlungsstatus wandert als Ereignis, nicht als UPDATE');

-- ─── 5. Legal Support ohne Lead-Gebuehr ────────────────────────────────────

select is((select enabled from public.lead_fee_eligibility where area_code = 'legal-advisory' and country_code = '*'),
          false, 'Legal Support: Lead-Gebuehr ueberall AUS, bis die Rechtsberatung freigibt');

-- ─── 6. Nichts davon fuer den Browser ──────────────────────────────────────

set local role anon;
select is((select count(*)::int from public.plan_catalog), 0, 'anon liest den Plan-Katalog nicht');
select is((select count(*)::int from public.provider_subscriptions), 0, 'anon liest keine Abos');
select is((select count(*)::int from public.provider_lead_ledger), 0, 'anon liest das Ledger nicht');
reset role;

-- ─── 7. Die View kennt das Abo nicht ───────────────────────────────────────
-- pg_depend: wovon haengt die View ab? Keine der Pricing-Tabellen darf
-- darunter sein. Wer das Abo je in die Sichtbarkeit zieht, scheitert hier.

select is((
  select count(*)::int
  from pg_depend d
  join pg_rewrite r on r.oid = d.objid
  join pg_class dep on dep.oid = d.refobjid
  where r.ev_class = 'public.matchable_provider_services'::regclass
    and dep.relname in ('plan_catalog', 'provider_subscriptions', 'lead_band_config', 'lead_band_rules',
                        'lead_fee_eligibility', 'provider_lead_ledger', 'provider_credits', 'provider_discount_counter')
), 0, 'matchable_provider_services haengt von keiner Pricing-Tabelle ab — das Abo ist kein Sichtbarkeitsmerkmal');

select * from finish();
rollback;
