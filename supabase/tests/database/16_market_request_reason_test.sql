-- ─── Marktanfragen: wofuer die Anfrage steht ─────────────────────────────────
--
-- Gehoert zu 20261012000100_market_request_reason.sql. Geprueft wird:
--
--   1. Ohne Angabe ist eine Anfrage 'market' — so bleiben die Altzeilen.
--   2. Nur die beiden bekannten Gruende.
--   3. Eine Abdeckungs-Anfrage nennt mindestens einen Bereich.

begin;
select plan(6);

select has_column('public', 'market_requests', 'reason', 'market_requests hat die Spalte reason');

-- ─── 1. Default ─────────────────────────────────────────────────────────────

insert into public.market_requests (requester_key, guest_key, market)
values ('guest:guest-rsn-0001', 'guest-rsn-0001', 'BR');
select is((select reason from public.market_requests where guest_key = 'guest-rsn-0001'), 'market',
  'Ohne Angabe ist eine Anfrage eine Laender-Anfrage');

-- ─── 2. Bekannte Gruende ────────────────────────────────────────────────────

insert into public.market_requests (requester_key, guest_key, market, domains, reason)
values ('guest:guest-rsn-0002', 'guest-rsn-0002', 'DE', '{tax-vat}', 'provider_coverage');
select is((select reason from public.market_requests where guest_key = 'guest-rsn-0002'), 'provider_coverage',
  'Eine Abdeckungs-Anfrage haelt ihren Grund fest');

select throws_ok(
  $$ insert into public.market_requests (requester_key, guest_key, market, reason) values ('guest:guest-rsn-0003', 'guest-rsn-0003', 'BR', 'upsell') $$,
  '23514', null, 'Nur market und provider_coverage');

select throws_ok(
  $$ insert into public.market_requests (requester_key, guest_key, market, reason) values ('guest:guest-rsn-0004', 'guest-rsn-0004', 'BR', null) $$,
  '23502', null, 'Der Grund ist nie leer');

-- ─── 3. Bereiche ────────────────────────────────────────────────────────────

select throws_ok(
  $$ insert into public.market_requests (requester_key, guest_key, market, reason) values ('guest:guest-rsn-0005', 'guest-rsn-0005', 'DE', 'provider_coverage') $$,
  '23514', null, 'Eine Abdeckungs-Anfrage ohne Bereich sagt nicht, was fehlt');

select * from finish();
rollback;
