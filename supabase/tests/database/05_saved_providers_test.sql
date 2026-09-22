-- Das Anbieter-Lesezeichen: wem gehoert eine Merkliste?
--
-- Gehoert zu 20260923010000_saved_providers.sql. Geprueft wird nicht, dass die
-- Tabelle existiert — das waere eine Tautologie —, sondern die drei
-- Eigenschaften, wegen der sie so aussieht: ein Gast darf merken, zweimal
-- merken aendert nichts, und niemand ausser dem Eigentuemer sieht die Zeile.

begin;
select plan(13);

-- ─── Fixture ────────────────────────────────────────────────────────────────
insert into public.providers (provider_key, name, partner_status)
values ('test-kanzlei', 'Testkanzlei', 'active') on conflict do nothing;
insert into public.providers (provider_key, name, partner_status)
values ('test-zweite', 'Zweite Kanzlei', 'active') on conflict do nothing;

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'merker@complihub.test') on conflict do nothing;
insert into public.users (id, email, role) values
  ('11111111-1111-1111-1111-111111111111', 'merker@complihub.test', 'registered') on conflict do nothing;

-- ─── Ein Gast darf merken ───────────────────────────────────────────────────
-- Die DNA-Begruendung steht in der Migration: ein Merken-Knopf, der zuerst ein
-- Konto verlangt, erzeugt Reibung, bevor der Nutzer etwas von uns will.
insert into public.saved_providers (guest_key, provider_key, source)
values ('gast-abc12345', 'test-kanzlei', 'risk_map');

select is((select count(*)::int from public.saved_providers where guest_key = 'gast-abc12345'),
          1, 'Ein Gast kann ohne Konto merken');

-- ─── Aber nicht ohne jeden Eigentuemer ──────────────────────────────────────
select throws_ok(
  $$ insert into public.saved_providers (provider_key, source)
     values ('test-kanzlei', 'risk_map') $$,
  '23514', null,
  'Eine Zeile ohne Gast UND ohne Konto wird abgewiesen');

-- ─── Zweimal merken aendert nichts ──────────────────────────────────────────
select throws_ok(
  $$ insert into public.saved_providers (guest_key, provider_key, source)
     values ('gast-abc12345', 'test-kanzlei', 'provider_page') $$,
  '23505', null,
  'Derselbe Anbieter zweimal in derselben Gast-Merkliste wird abgewiesen');

insert into public.saved_providers (user_id, provider_key, source)
values ('11111111-1111-1111-1111-111111111111', 'test-kanzlei', 'thread');

select throws_ok(
  $$ insert into public.saved_providers (user_id, provider_key, source)
     values ('11111111-1111-1111-1111-111111111111', 'test-kanzlei', 'risk_map') $$,
  '23505', null,
  'Derselbe Anbieter zweimal in derselben Konto-Merkliste wird abgewiesen');

-- Verschiedene Eigentuemer duerfen denselben Anbieter merken — sonst waere das
-- Lesezeichen des einen eine Sperre fuer den anderen.
select lives_ok(
  $$ insert into public.saved_providers (guest_key, provider_key, source)
     values ('gast-zweiter', 'test-kanzlei', 'risk_map') $$,
  'Ein anderer Gast darf denselben Anbieter merken');

select lives_ok(
  $$ insert into public.saved_providers (guest_key, provider_key, source)
     values ('gast-abc12345', 'test-zweite', 'risk_map') $$,
  'Derselbe Gast darf einen anderen Anbieter merken');

-- ─── Nur die drei Flaechen ──────────────────────────────────────────────────
-- Ein freier String als Herkunft waere in der Liste spaeter nicht anzeigbar.
select throws_ok(
  $$ insert into public.saved_providers (guest_key, provider_key, source)
     values ('gast-dritter', 'test-kanzlei', 'irgendwo') $$,
  '23514', null,
  'Eine Herkunft ausserhalb der drei Flaechen wird abgewiesen');

-- ─── Herkunft ueberlebt den Verlust der Sitzung ─────────────────────────────
insert into public.sessions (id, guest_key, country)
values ('22222222-2222-2222-2222-222222222222', 'gast-abc12345', 'FR');
insert into public.saved_providers (guest_key, provider_key, source, session_id)
values ('gast-vierter', 'test-kanzlei', 'risk_map', '22222222-2222-2222-2222-222222222222');

delete from public.sessions where id = '22222222-2222-2222-2222-222222222222';

select is((select count(*)::int from public.saved_providers where guest_key = 'gast-vierter'),
          1, 'Die geloeschte Risk Map nimmt das Lesezeichen nicht mit');
select is((select session_id from public.saved_providers where guest_key = 'gast-vierter'),
          null, 'Nur die Herkunft ist fort, nicht die Zeile');

-- ─── Der Anbieter dagegen nimmt sie mit ─────────────────────────────────────
-- Ein Lesezeichen auf einen Anbieter, den es nicht mehr gibt, waere ein
-- Eintrag, der ins Leere zeigt.
insert into public.providers (provider_key, name, partner_status)
values ('test-verschwindet', 'Verschwindet', 'active') on conflict do nothing;
insert into public.saved_providers (guest_key, provider_key, source)
values ('gast-fuenfter', 'test-verschwindet', 'provider_page');
delete from public.providers where provider_key = 'test-verschwindet';

select is((select count(*)::int from public.saved_providers where guest_key = 'gast-fuenfter'),
          0, 'Faellt der Anbieter weg, faellt das Lesezeichen mit');

-- ─── Zeilenschutz ───────────────────────────────────────────────────────────
select is((select relrowsecurity from pg_class where oid = 'public.saved_providers'::regclass),
          true, 'saved_providers braucht RLS');

-- Genau EINE Policy, und sie liest nur eigene Konto-Zeilen. Gast-Zeilen haben
-- keine Policy: an sie kommt nur die Service-Rolle, weil die API nach
-- guest_key filtert.
select policies_are('public', 'saved_providers',
  ARRAY['Users can read own saved providers'],
  'Nur die eine Lese-Policy fuer eigene Zeilen');

set local role anon;
select is((select count(*)::int from public.saved_providers),
          0, 'anon sieht keine einzige Merkliste — auch keine Gast-Zeile');
reset role;

select * from finish();
rollback;
