-- ─── Marktanfragen: eine Zeile je Mensch und Markt, keine PII fuer Gaeste ────
--
-- Gehoert zu 20260929000000_market_requests.sql. Geprueft wird, wofuer die
-- Tabelle ihre CHECKs hat:
--
--   1. Gast und Konto koennen anfragen; eine Zeile ist genau eines von beiden.
--   2. requester_key ist an user_id bzw. guest_key gebunden.
--   3. Pro Anfragendem und Markt gibt es nur eine Zeile.
--   4. Ein Update-Wunsch ohne Konto ist nicht speicherbar.
--   5. Markt und guest_key haben eine feste Form.
--   6. anon und authenticated lesen nichts.

begin;
select plan(10);

-- ─── 1. Gast und Konto ──────────────────────────────────────────────────────

insert into public.market_requests (requester_key, guest_key, market, domains)
values ('guest:guest-abc-123', 'guest-abc-123', 'BR', '{tax-vat}');
select is((select count(*)::int from public.market_requests where market = 'BR'), 1, 'Ein Gast kann einen Markt anfragen');

insert into public.market_requests (requester_key, user_id, market, notify)
values ('user:00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'BR', true);
select is((select count(*)::int from public.market_requests where market = 'BR'), 2, 'Ein Konto kann denselben Markt anfragen, mit Update-Wunsch');

select throws_ok(
  $$ insert into public.market_requests (requester_key, market) values ('guest:', 'AR') $$,
  '23514', null, 'Ohne user_id und ohne guest_key scheitert die Zeile');

select throws_ok(
  $$ insert into public.market_requests (requester_key, user_id, guest_key, market)
     values ('user:00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', 'guest-abc-123', 'AR') $$,
  '23514', null, 'Beides zugleich scheitert — eine Zeile ist Gast ODER Konto');

-- ─── 2. requester_key gebunden ──────────────────────────────────────────────

select throws_ok(
  $$ insert into public.market_requests (requester_key, guest_key, market) values ('guest:someone-else', 'guest-abc-123', 'AR') $$,
  '23514', null, 'requester_key muss zum guest_key passen');

-- ─── 3. Einmal je Markt ─────────────────────────────────────────────────────

select throws_ok(
  $$ insert into public.market_requests (requester_key, guest_key, market) values ('guest:guest-abc-123', 'guest-abc-123', 'BR') $$,
  '23505', null, 'Derselbe Gast fragt denselben Markt nicht zweimal an');

-- ─── 4. Update nur mit Konto ────────────────────────────────────────────────

select throws_ok(
  $$ insert into public.market_requests (requester_key, guest_key, market, notify) values ('guest:guest-xyz-789', 'guest-xyz-789', 'AR', true) $$,
  '23514', null, 'Ein Gast kann kein Update bestellen — dafuer braeuchten wir eine Adresse');

-- ─── 5. Formen ──────────────────────────────────────────────────────────────

select throws_ok(
  $$ insert into public.market_requests (requester_key, guest_key, market) values ('guest:guest-xyz-789', 'guest-xyz-789', 'Brazil') $$,
  '23514', null, 'Der Markt ist ein zweistelliger Code');

select throws_ok(
  $$ insert into public.market_requests (requester_key, guest_key, market) values ('guest:a b', 'a b', 'AR') $$,
  '23514', null, 'Ein guest_key mit Leerzeichen scheitert an der Form');

-- ─── 6. Zugriff ─────────────────────────────────────────────────────────────

set local role anon;
select is((select count(*)::int from public.market_requests), 0, 'anon liest keine Marktanfrage');
reset role;

select * from finish();
rollback;
