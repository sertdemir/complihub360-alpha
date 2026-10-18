-- ─── B1: Belastung mit offenem Ausgang ───────────────────────────────────────
--
-- Gehoert zu 20261018000000_ledger_unknown_outcome.sql. Geprueft wird:
--
--   1. `unknown` ist ein gueltiges Ereignis auf der Statusspur.
--   2. Der Katalog bleibt sonst geschlossen.
--   3. Die Ledger-Zeile selbst bleibt append-only — auch neben `unknown`.

begin;
select plan(4);

insert into public.providers (provider_key, name, partner_status, lifecycle_status)
values ('b1-kanzlei', 'B1 Kanzlei', 'active', 'active');

insert into public.provider_lead_ledger (id, kind, provider_key, computed_band, standard_fee_cents, final_fee_cents, payment_status, policy_version)
values ('00000000-0000-4000-8000-00000000b101', 'charge', 'b1-kanzlei', 2, 9900, 9900, 'pending', 'lead-fee-policy-v1');

-- ─── 1. unknown ─────────────────────────────────────────────────────────────

select lives_ok(
  $$ insert into public.provider_lead_ledger_payment_events (ledger_id, status, detail)
     values ('00000000-0000-4000-8000-00000000b101', 'unknown', 'unknown:outcome_unknown timeout') $$,
  'Ein offener Ausgang ist ein eigenes Ereignis, kein failed');

-- ─── 2. Katalog geschlossen ─────────────────────────────────────────────────

select throws_ok(
  $$ insert into public.provider_lead_ledger_payment_events (ledger_id, status)
     values ('00000000-0000-4000-8000-00000000b101', 'maybe') $$,
  '23514', null, 'Nur die sechs bekannten Zustaende');

-- ─── 3. Der Abgleich schreibt nach, loescht nichts ──────────────────────────

select lives_ok(
  $$ insert into public.provider_lead_ledger_payment_events (ledger_id, status, stripe_ref, detail)
     values ('00000000-0000-4000-8000-00000000b101', 'captured', 'pi_b1', 'reconciled after unknown outcome'),
            ('00000000-0000-4000-8000-00000000b101', 'refunded', 'pi_b1', 'reconciled: no booking') $$,
  'Nach dem Abgleich folgen captured und refunded auf unknown');

select throws_ok(
  $$ update public.provider_lead_ledger set payment_status = 'failed' where id = '00000000-0000-4000-8000-00000000b101' $$,
  '23001', null, 'Die Ledger-Zeile bleibt append-only');

select * from finish();
rollback;
