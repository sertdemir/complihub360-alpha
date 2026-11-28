-- ─── Hat das angemeldete Konto ein Passwort? ────────────────────────────────
--
-- Gehoert zu 20261128000000_current_user_has_password.sql. Geprueft wird:
--
--   1. Die Funktion gibt es, sie laeuft als SECURITY DEFINER.
--   2. anon darf sie nicht aufrufen, authenticated schon.
--   3. Ohne Anmeldung (auth.uid() NULL) antwortet sie false.
--   4. Konto mit Hash → true, mit leerem Text oder NULL → false.
--   5. Sie antwortet nur fuer den eigenen Nutzer.
--
-- auth.uid() liefert im Stub immer NULL. Fuer 4 und 5 wird sie innerhalb
-- dieser Transaktion ersetzt; das rollback am Ende stellt den Stub wieder her.

begin;
select plan(8);

select has_function('public', 'current_user_has_password', array[]::text[], 'Funktion existiert');
select ok((select prosecdef from pg_proc where proname = 'current_user_has_password'), 'laeuft als SECURITY DEFINER');
select ok(not has_function_privilege('anon', 'public.current_user_has_password()', 'EXECUTE'), 'anon darf sie nicht aufrufen');
select ok(has_function_privilege('authenticated', 'public.current_user_has_password()', 'EXECUTE'), 'authenticated darf sie aufrufen');

select is(public.current_user_has_password(), false, 'ohne Anmeldung: false');

insert into auth.users (id, email, encrypted_password) values
  ('00000000-0000-0000-0000-00000000a001', 'mit@example.test',   '$2a$10$abcdefghijklmnopqrstuv'),
  ('00000000-0000-0000-0000-00000000a002', 'leer@example.test',  ''),
  ('00000000-0000-0000-0000-00000000a003', 'null@example.test',  null);

create or replace function auth.uid() returns uuid language sql stable
  as $$ select current_setting('test.uid', true)::uuid $$;

select set_config('test.uid', '00000000-0000-0000-0000-00000000a001', true);
select is(public.current_user_has_password(), true, 'Konto mit Hash: true');

select set_config('test.uid', '00000000-0000-0000-0000-00000000a002', true);
select is(public.current_user_has_password(), false, 'Konto mit leerem Hash (Anmeldelink, Google): false');

select set_config('test.uid', '00000000-0000-0000-0000-00000000a003', true);
select is(public.current_user_has_password(), false, 'Konto ohne Hash: false, und nicht das Ergebnis eines anderen Kontos');

select * from finish();
rollback;
