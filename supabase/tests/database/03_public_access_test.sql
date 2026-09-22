-- ─── Was sieht der oeffentliche Key wirklich? ───────────────────────────────
--
-- 01_rls_test prueft, ob RLS eingeschaltet ist und welche Policies heissen wie.
-- Das beantwortet nicht die Frage, die zaehlt: was bekommt jemand zurueck, der
-- mit dem anon-Key aus dem Browser-Bundle direkt gegen PostgREST fragt?
--
-- Diese Datei fragt genau das — als `anon` und als `authenticated`, gegen eine
-- echte Zeile. Anlass (2026-09-22): die Policy "Providers are globally
-- readable" gab jedem Besucher Name, Website, Kontakt-E-Mail, Stripe-Kunden-ID
-- und USt-ID jedes Anbieters, und die View `matchable_provider_services` lief
-- mit den Rechten ihres Owners an RLS vorbei. Beides widerspricht der
-- Anonymitaet vor der Buchung (Spec A §13, Spec B "Before booking").
--
-- Voraussetzung: der Stub bildet Supabases Rollen und Default-Grants nach
-- (supabase/tests/fixtures/00_supabase_stub.sql).

begin;
select plan(15);

-- ─── Fixture, als Owner angelegt ───────────────────────────────────────────

insert into public.providers (provider_key, name, website_url, contact_email,
                              partner_status, lifecycle_status, billing_ready)
values ('t-public', 'Geheime Kanzlei GmbH', 'https://geheim.example', 'kontakt@geheim.example',
        'active', 'active', true);

insert into public.provider_services (id, provider_key, service_code, service_name, status)
values ('bbbbbbbb-0000-0000-0000-000000000001', 't-public', 'tax-vat', 'Tax and VAT', 'approved');

insert into public.provider_service_coverage (service_id, country_code, status)
values ('bbbbbbbb-0000-0000-0000-000000000001', 'DE', 'approved');

insert into auth.users (id, email) values ('cccccccc-0000-0000-0000-000000000001', 'owner@geheim.example');
insert into public.provider_members (provider_key, user_id)
values ('t-public', 'cccccccc-0000-0000-0000-000000000001');

-- Gegenprobe: als Owner ist die Zeile da. Sonst beweisen die Nullen unten nichts.
select is((select count(*)::int from public.matchable_provider_services where provider_key = 't-public'),
          1, 'Fixture: die Leistung ist matchbar (Gegenprobe fuer die Nullen)');

-- ─── anon ──────────────────────────────────────────────────────────────────

set local role anon;

select is((select count(*)::int from public.providers),
          0, 'anon liest keine einzige Anbieter-Zeile — kein Name, keine E-Mail, keine Stripe-ID');
select throws_ok($$ select count(*) from public.matchable_provider_services $$, '42501', null,
          'anon liest die Matching-View nicht — sie traegt provider_key und lief am RLS vorbei');
select is((select count(*)::int from public.provider_services),
          0, 'anon liest keine Leistungen');
select is((select count(*)::int from public.provider_service_coverage),
          0, 'anon liest keine Freigaben');
select is((select count(*)::int from public.provider_members),
          0, 'anon sieht nicht, welcher Login zu welchem Anbieter gehoert');
select lives_ok($$ select count(*) from public.service_categories $$,
          'Die Taxonomie bleibt oeffentlich — sie steht so auch in der Navigation');

reset role;

-- ─── authenticated ─────────────────────────────────────────────────────────
-- Eingeloggt heisst nicht berechtigt. Der eigene Anbieter kommt ueber die
-- API, die Mitgliedschaft prueft — nicht ueber den direkten Tabellenzugriff.

set local role authenticated;

select is((select count(*)::int from public.providers),
          0, 'authenticated liest keine Anbieter-Zeile direkt');
select throws_ok($$ select count(*) from public.matchable_provider_services $$, '42501', null,
          'authenticated liest die Matching-View nicht');
select is((select count(*)::int from public.provider_members),
          0, 'authenticated liest keine Mitgliedschaften direkt');

reset role;

-- ─── Struktur ──────────────────────────────────────────────────────────────

select is((select count(*)::int from pg_policies
           where schemaname = 'public' and tablename = 'providers'
             and policyname = 'Providers are globally readable'),
          0, 'Die Policy "Providers are globally readable" existiert nicht mehr');

select is((select coalesce('security_invoker=true' = any(reloptions), false)
           from pg_class where oid = 'public.matchable_provider_services'::regclass),
          true, 'Die Matching-View prueft gegen den Aufrufer, nicht gegen ihren Owner');

-- ─── Die Adress-Nachschlage-Funktion (20260922010000) ──────────────────────
--
-- Sie ist SECURITY DEFINER und greift auf `auth.users` zu — also genau die
-- Bauart, die bei der Matching-View schon einmal mehr hergab als gedacht.
-- Drei Eigenschaften halten sie eng, und alle drei stehen hier.

select is((select prosecdef from pg_proc
           where oid = 'public.auth_user_id_by_email(text)'::regprocedure),
          true, 'Die Nachschlage-Funktion laeuft als Definer — sonst erreicht sie auth.users nicht');

-- Ohne festen search_path bestimmt der Aufrufer, welche Tabelle "auth.users"
-- meint. Bei SECURITY DEFINER ist das die Luecke, nicht eine Feinheit.
select ok((select proconfig from pg_proc
           where oid = 'public.auth_user_id_by_email(text)'::regprocedure)
          @> ARRAY['search_path=pg_catalog, public, auth, pg_temp'],
          'Die Nachschlage-Funktion hat einen fest verdrahteten search_path');

select is((select count(*)::int from information_schema.role_routine_grants
           where routine_schema = 'public'
             and routine_name   = 'auth_user_id_by_email'
             and grantee in ('anon', 'authenticated', 'PUBLIC')),
          0, 'anon und authenticated duerfen die Nachschlage-Funktion nicht ausfuehren');

select * from finish();
rollback;
