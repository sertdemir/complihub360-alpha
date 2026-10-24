-- ─── Gemerkte Anbieter ───────────────────────────────────────────────────────
--
-- Gehoert zu 20261025000000_saved_providers.sql. Geprueft wird:
--
--   1. Ein Nutzer merkt sich einen Anbieter einmal (Primaerschluessel).
--   2. Nur existierende Anbieter (FK); geloeschter Anbieter → Eintrag faellt mit.
--   3. anon und authenticated sehen keine Zeile (RLS ohne Policy).
--   4. Nur existierende Nutzer (FK); geloeschtes Konto → Merkliste faellt mit.

begin;
select plan(7);

insert into public.providers (provider_key, name) values ('test-saved-provider', 'Test Saved Provider')
  on conflict (provider_key) do nothing;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000b1', 'merkliste@example.com');

insert into public.saved_providers (user_id, provider_key)
  values ('00000000-0000-0000-0000-0000000000b1', 'test-saved-provider');
select throws_ok($$ insert into public.saved_providers (user_id, provider_key) values ('00000000-0000-0000-0000-0000000000b1', 'test-saved-provider') $$,
  '23505', null, 'derselbe Anbieter nur einmal je Nutzer');
select throws_ok($$ insert into public.saved_providers (user_id, provider_key) values ('00000000-0000-0000-0000-0000000000b1', 'gibt-es-nicht') $$,
  '23503', null, 'nur existierende Anbieter');
select throws_ok($$ insert into public.saved_providers (user_id, provider_key) values ('00000000-0000-0000-0000-0000000000b9', 'test-saved-provider') $$,
  '23503', null, 'nur existierende Nutzer');

set local role anon;
select is((select count(*)::int from public.saved_providers), 0, 'anon liest keine Merkliste');
reset role;
set local role authenticated;
select is((select count(*)::int from public.saved_providers), 0, 'authenticated liest keine Merkliste (nur die API)');
reset role;

delete from auth.users where id = '00000000-0000-0000-0000-0000000000b1';
select is((select count(*)::int from public.saved_providers where user_id = '00000000-0000-0000-0000-0000000000b1'), 0, 'geloeschtes Konto: Merkliste faellt mit');

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000b2', 'merkliste2@example.com');
insert into public.saved_providers (user_id, provider_key) values ('00000000-0000-0000-0000-0000000000b2', 'test-saved-provider');
delete from public.providers where provider_key = 'test-saved-provider';
select is((select count(*)::int from public.saved_providers where provider_key = 'test-saved-provider'), 0, 'geloeschter Anbieter: Eintrag faellt mit');

select * from finish();
rollback;
