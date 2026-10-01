-- ─── Marktanfragen: Sprache und Adresse fuer den Versand des Updates ─────────
--
-- Gehoert zu 20261001184141_market_request_notify.sql. Geprueft wird:
--
--   1. Die Sprache ist eine der vier Produktsprachen oder leer.
--   2. Die Adresse kommt nur fuer einen bestaetigten, lebenden Login heraus.
--   3. Nur die Service-Rolle darf die Funktion ausfuehren, und sie ist gegen
--      einen fremden search_path gesichert.

begin;
select plan(9);

-- ─── 1. Sprache ─────────────────────────────────────────────────────────────

insert into public.market_requests (requester_key, guest_key, market, locale)
values ('guest:guest-loc-0001', 'guest-loc-0001', 'BR', 'de');
select is((select locale from public.market_requests where guest_key = 'guest-loc-0001'), 'de', 'Eine Anfrage haelt ihre Sprache fest');

insert into public.market_requests (requester_key, guest_key, market)
values ('guest:guest-loc-0002', 'guest-loc-0002', 'BR');
select is((select locale from public.market_requests where guest_key = 'guest-loc-0002'), null, 'Ohne Sprache bleibt sie leer (aeltere Zeilen)');

select throws_ok(
  $$ insert into public.market_requests (requester_key, guest_key, market, locale) values ('guest:guest-loc-0003', 'guest-loc-0003', 'BR', 'fr') $$,
  '23514', null, 'Nur die vier Produktsprachen');

-- ─── 2. Adresse ─────────────────────────────────────────────────────────────

insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-4000-8000-0000000000a1', 'bestaetigt@example.com', now()),
  ('00000000-0000-4000-8000-0000000000a2', 'offen@example.com', null),
  ('00000000-0000-4000-8000-0000000000a3', 'geloescht@example.com', now());
update auth.users set deleted_at = now() where id = '00000000-0000-4000-8000-0000000000a3';

select is(public.auth_user_email_by_id('00000000-0000-4000-8000-0000000000a1'), 'bestaetigt@example.com',
  'Ein bestaetigter Login gibt seine Adresse heraus');
select is(public.auth_user_email_by_id('00000000-0000-4000-8000-0000000000a2'), null,
  'Eine unbestaetigte Adresse wird nicht angeschrieben');
select is(public.auth_user_email_by_id('00000000-0000-4000-8000-0000000000a3'), null,
  'Ein geloeschtes Konto wird nicht angeschrieben');

-- ─── 3. Zugriff ─────────────────────────────────────────────────────────────

select is((select prosecdef from pg_proc where oid = 'public.auth_user_email_by_id(uuid)'::regprocedure),
  true, 'Die Funktion laeuft als Definer — sonst erreicht sie auth.users nicht');
select ok((select proconfig from pg_proc where oid = 'public.auth_user_email_by_id(uuid)'::regprocedure)
  @> ARRAY['search_path=pg_catalog, public, auth, pg_temp'], 'Fest verdrahteter search_path');
select is((select count(*)::int from information_schema.routine_privileges
           where routine_schema = 'public' and routine_name = 'auth_user_email_by_id'
             and grantee in ('anon', 'authenticated', 'PUBLIC')),
  0, 'anon und authenticated duerfen keine Adressen nachschlagen');

select * from finish();
rollback;
