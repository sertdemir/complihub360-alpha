-- ─── B8: ein Schluessel je Buchungsversuch ───────────────────────────────────
--
-- Gehoert zu 20261018000100_ledger_request_key.sql. Geprueft wird:
--
--   1. Derselbe Schluessel desselben Nutzers: der zweite Insert scheitert.
--   2. Derselbe Schluessel bei einem anderen Nutzer ist erlaubt.
--   3. Ohne Schluessel (alte Clients) ist nichts doppelt.
--   4. Der Schluessel laesst sich nicht nachtraeglich setzen (append-only).

begin;
select plan(5);

select has_column('public', 'provider_lead_ledger', 'request_key', 'provider_lead_ledger hat die Spalte request_key');

insert into public.providers (provider_key, name, partner_status, lifecycle_status)
values ('b8-kanzlei', 'B8 Kanzlei', 'active', 'active');

insert into public.provider_lead_ledger (id, kind, provider_key, user_id, computed_band, standard_fee_cents, final_fee_cents, payment_status, policy_version, request_key)
values ('00000000-0000-4000-8000-00000000b801', 'charge', 'b8-kanzlei', '00000000-0000-4000-8000-0000000000b8', 2, 9900, 9900, 'pending', 'lead-fee-policy-v1', 'req-1');

-- ─── 1. Zwilling ────────────────────────────────────────────────────────────

select throws_ok(
  $$ insert into public.provider_lead_ledger (kind, provider_key, user_id, computed_band, standard_fee_cents, final_fee_cents, payment_status, policy_version, request_key)
     values ('charge', 'b8-kanzlei', '00000000-0000-4000-8000-0000000000b8', 2, 9900, 9900, 'pending', 'lead-fee-policy-v1', 'req-1') $$,
  '23505', null, 'Derselbe Versuch desselben Nutzers erzeugt keine zweite Ledger-Zeile');

-- ─── 2. Anderer Nutzer ──────────────────────────────────────────────────────

select lives_ok(
  $$ insert into public.provider_lead_ledger (kind, provider_key, user_id, computed_band, standard_fee_cents, final_fee_cents, payment_status, policy_version, request_key)
     values ('charge', 'b8-kanzlei', '00000000-0000-4000-8000-0000000000b9', 2, 9900, 9900, 'pending', 'lead-fee-policy-v1', 'req-1') $$,
  'Der Schluessel gilt je Nutzer');

-- ─── 3. Ohne Schluessel ─────────────────────────────────────────────────────

select lives_ok(
  $$ insert into public.provider_lead_ledger (kind, provider_key, user_id, computed_band, standard_fee_cents, final_fee_cents, payment_status, policy_version)
     values ('charge', 'b8-kanzlei', '00000000-0000-4000-8000-0000000000b8', 2, 9900, 9900, 'pending', 'lead-fee-policy-v1'),
            ('charge', 'b8-kanzlei', '00000000-0000-4000-8000-0000000000b8', 2, 9900, 9900, 'pending', 'lead-fee-policy-v1') $$,
  'Ohne Schluessel (alte Clients) bleibt alles wie vorher');

-- ─── 4. Append-only ─────────────────────────────────────────────────────────

select throws_ok(
  $$ update public.provider_lead_ledger set request_key = 'req-2' where id = '00000000-0000-4000-8000-00000000b801' $$,
  '23001', null, 'Der Schluessel wird mit der Zeile geschrieben, nie danach');

select * from finish();
rollback;
