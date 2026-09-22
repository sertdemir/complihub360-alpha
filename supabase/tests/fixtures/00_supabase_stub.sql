-- ─── Der Teil von Supabase, den ein nacktes Postgres nicht mitbringt ─────────
--
-- Die Migrationen greifen auf drei Dinge zu, die in einer Supabase-Instanz von
-- der Plattform kommen und in einem frisch gestarteten Postgres fehlen:
--
--   auth.users    Fremdschluesselziel in sessions, scheduling, documents u. a.
--   auth.uid()    steht in 15 RLS-Policies
--   auth.jwt()    steht in der Admin-Policy auf providers
--   anon, authenticated, service_role
--                 die drei Rollen, gegen die RLS ueberhaupt erst etwas
--                 bedeutet. Ein GRANT oder REVOKE auf eine nicht vorhandene
--                 Rolle ist in Postgres kein Hinweis, sondern ein Abbruch —
--                 eine Migration, die Rechte zurueckzieht, waere hier also
--                 nicht bloss ungeprueft, sondern wuerde den Lauf sprengen.
--
-- Ohne sie scheitert schon die erste Migration. Dieser Stub stellt sie her,
-- damit der Test-Lauf dieselben Migrationen fahren kann, die auch auf Staging
-- laufen — keine abgespeckte Variante.
--
-- WICHTIG: `auth.uid()` liefert hier immer NULL. Das ist Absicht und
-- gleichzeitig die Grenze dieses Harness: die RLS-Tests pruefen, ob eine
-- Policy EXISTIERT und ob RLS eingeschaltet ist, nicht ob sie den richtigen
-- Nutzer durchlaesst. Wer das pruefen will, braucht echte JWTs und damit
-- Supabase selbst. Steht auch so in 01_rls_test.sql.

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text
);

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
  LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;

CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb
  LANGUAGE sql STABLE AS $$ SELECT '{}'::jsonb $$;

-- ─── Die drei Supabase-Rollen ───────────────────────────────────────────────
--
-- NOLOGIN, weil hier niemand sich anmeldet; sie werden per `set role`
-- angenommen. Die Rechte, die Supabase ihnen sonst flaechig erteilt, gibt es
-- hier absichtlich NICHT: was eine Migration einer Rolle zugesteht, soll im
-- Test genau das sein, was die Migration schreibt — und nichts, was die
-- Plattform nebenher mitgeliefert hat.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
