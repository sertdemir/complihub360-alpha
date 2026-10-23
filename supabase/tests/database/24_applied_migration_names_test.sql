-- ─── applied_migration_versions kennt auch die Namen ────────────────────────
--
-- Staging 24.10.2026: aeltere Migrationen stehen mit dem Zeitstempel des
-- Einspielens und blossem Namen in der Tabelle. Die Funktion liefert dafuer
-- 'name:<Name ohne Zeitstempel>'; schemaCheck.ts gleicht damit ab.
-- Die Testdatenbank hat kein supabase_migrations — der Test legt es an.

begin;
select plan(5);

create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (version text primary key, name text);
insert into supabase_migrations.schema_migrations (version, name) values
  ('20260922200428', 'provider_data_model'),
  ('20261018002404', '20261018000100_ledger_request_key');

select ok('20260922200428' in (select public.applied_migration_versions()), 'Version wie eingetragen');
select ok('20261018000100' in (select public.applied_migration_versions()), 'Zeitstempel aus dem Dateinamen');
select ok('name:provider_data_model' in (select public.applied_migration_versions()), 'Blosser Name als name:');
select ok('name:ledger_request_key' in (select public.applied_migration_versions()), 'Name ohne Zeitstempel als name:');
select ok(not has_function_privilege('anon', 'public.applied_migration_versions()', 'execute'), 'anon darf nicht aufrufen');

select * from finish();
rollback;
