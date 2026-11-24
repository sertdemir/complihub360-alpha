-- ─── Anbieter-Bewerbungen ────────────────────────────────────────────────────
--
-- Gehoert zu 20261125000000_provider_applications.sql. Geprueft wird:
--
--   1. anon und authenticated sehen keine Zeile (RLS ohne Policy).
--   2. Der Stand kennt nur die drei Werte.
--   3. Ein Einladungs-Hash gehoert zu genau einer Bewerbung.
--   4. Geloeschtes Konto und geloeschter Anbieter: die Bewerbung bleibt.

begin;
select plan(6);

insert into public.provider_applications (id, reference, contact_name, email, firm, credentials, invite_token_hash)
  values ('00000000-0000-0000-0000-0000000000c1', 'ref-1', 'Test Person', 'bewerbung@example.com', 'Test Firm', 'Tax adviser', 'hash-1');

set local role anon;
select is((select count(*)::int from public.provider_applications), 0, 'anon liest keine Bewerbung');
reset role;
set local role authenticated;
select is((select count(*)::int from public.provider_applications), 0, 'authenticated liest keine Bewerbung (nur die API)');
reset role;

select throws_ok($$ update public.provider_applications set status = 'verified' where id = '00000000-0000-0000-0000-0000000000c1' $$,
  '23514', null, 'der Stand kennt kein verified: das entscheidet die Pruefung, nicht die Einladung');
select throws_ok($$ insert into public.provider_applications (reference, contact_name, email, firm, credentials, invite_token_hash) values ('ref-2', 'Zwei', 'zwei@example.com', 'Zwei', 'x', 'hash-1') $$,
  '23505', null, 'ein Einladungs-Hash gehoert zu genau einer Bewerbung');

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000c2', 'bewerbung@example.com');
insert into public.providers (provider_key, name) values ('test-application-provider', 'Test Firm') on conflict (provider_key) do nothing;
update public.provider_applications set user_id = '00000000-0000-0000-0000-0000000000c2', provider_key = 'test-application-provider'
  where id = '00000000-0000-0000-0000-0000000000c1';
delete from auth.users where id = '00000000-0000-0000-0000-0000000000c2';
select is((select user_id from public.provider_applications where id = '00000000-0000-0000-0000-0000000000c1'), null, 'geloeschtes Konto: die Bewerbung bleibt, ohne Konto');
delete from public.providers where provider_key = 'test-application-provider';
select is((select provider_key from public.provider_applications where id = '00000000-0000-0000-0000-0000000000c1'), null, 'geloeschter Anbieter: die Bewerbung bleibt, ohne Anbieter');

select * from finish();
rollback;
