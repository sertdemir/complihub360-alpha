-- ─── Anonymes Matching: ist der Ref opak, und ist das Register vollstaendig? ─
--
-- Gehoert zu 20260928000000_provider_anonymity.sql. Geprueft werden die
-- Eigenschaften, wegen derer die Migration existiert:
--
--   1. Jeder Anbieter hat einen public_ref, auch der Bestand (Backfill).
--   2. Der Ref hat die feste Form und ist eindeutig.
--   3. Der Ref enthaelt nichts vom Namen — er ist nicht ableitbar.
--   4. Das Register kennt die Dossier-Felder; provider_key und das abgeloeste
--      pseudonym_label sind ausdruecklich 'internal'.
--   5. anon und authenticated lesen weiterhin nichts.

begin;
select plan(12);

-- ─── 1. Backfill und Default ────────────────────────────────────────────────

insert into public.providers (provider_key, name, partner_status, lifecycle_status)
values ('t-anon-a', 'Anonymkanzlei Alpha GmbH', 'active', 'active'),
       ('t-anon-b', 'Anonymkanzlei Beta S.r.l.', 'inactive', 'draft');

select is((select count(*)::int from public.providers where public_ref is null), 0,
          'Kein Anbieter ohne public_ref — Bestand ist nachgezogen, neue Zeilen bekommen einen Default');

select isnt((select public_ref from public.providers where provider_key = 't-anon-a'),
            (select public_ref from public.providers where provider_key = 't-anon-b'),
            'Zwei Anbieter, zwei Refs');

-- ─── 2. Form und Eindeutigkeit ──────────────────────────────────────────────

select matches((select public_ref from public.providers where provider_key = 't-anon-a'), '^[0-9a-f]{12}$',
               'public_ref sind zwoelf Hex-Zeichen');

select throws_ok(
  $$ update public.providers set public_ref = (select public_ref from public.providers where provider_key = 't-anon-a') where provider_key = 't-anon-b' $$,
  '23505', null, 'Ein Ref kann nicht zweimal vergeben werden');

select throws_ok(
  $$ update public.providers set public_ref = 'anonymkanzlei' where provider_key = 't-anon-b' $$,
  '23514', null, 'Ein sprechender Ref scheitert an der Form');

-- ─── 3. Nicht ableitbar ─────────────────────────────────────────────────────
--
-- Der Schluessel aus dem Namen ("t-anon-a") und der Name selbst kommen im Ref
-- nicht vor. Das ist kein Beweis fuer Zufall, aber der Fehler, den es zu
-- verhindern gilt (provider_key auf dem Draht), faellt hier auf.

select ok((select position('anon' in public_ref) = 0 and position('alpha' in public_ref) = 0
             from public.providers where provider_key = 't-anon-a'),
          'Der Ref traegt weder provider_key noch Namensbestandteile');

-- ─── 4. Register ────────────────────────────────────────────────────────────

select is((select visibility_class from public.provider_field_visibility where field_path = 'providers.public_ref'), 'anonymous',
          'public_ref ist anonymous');
select is((select visibility_class from public.provider_field_visibility where field_path = 'providers.provider_key'), 'internal',
          'provider_key ist ausdruecklich internal');
select is((select visibility_class from public.provider_field_visibility where field_path = 'providers.pseudonym_label'), 'internal',
          'pseudonym_label ist abgeloest und internal');
select is((select count(*)::int from public.provider_field_visibility
            where field_path in ('providers.services', 'providers.credentials', 'providers.excluded_services', 'providers.work_mode', 'providers.pricing_table', 'providers.availability')
              and visibility_class = 'anonymous'), 6,
          'Die sechs Dossier-Felder sind anonymous klassiert');
select is((select visibility_class from public.provider_field_visibility where field_path = 'providers.name'), 'revealed',
          'Der Klarname bleibt revealed');

-- ─── 5. Zugriff ─────────────────────────────────────────────────────────────

set local role anon;
select is((select count(*)::int from public.providers), 0, 'anon liest keinen Anbieter, auch nicht den Ref');
reset role;

select * from finish();
rollback;
