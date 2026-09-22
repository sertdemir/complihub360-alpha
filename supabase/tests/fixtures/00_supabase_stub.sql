-- ─── Der Teil von Supabase, den ein nacktes Postgres nicht mitbringt ─────────
--
-- Die Migrationen greifen auf drei Dinge zu, die in einer Supabase-Instanz von
-- der Plattform kommen und in einem frisch gestarteten Postgres fehlen:
--
--   auth.users    Fremdschluesselziel in sessions, scheduling, documents u. a.
--   auth.uid()    steht in 15 RLS-Policies
--   auth.jwt()    steht in der Admin-Policy auf providers
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

-- `deleted_at` traegt Supabase selbst: ein geloeschtes Konto bleibt als Zeile
-- stehen und wird nur markiert. Wer danach filtert — etwa
-- `auth_user_id_by_email` aus 20260922010000, damit ein geloeschtes Konto eine
-- lebende Adresse nicht mehrdeutig macht — braucht die Spalte hier, sonst
-- scheitert die Migration im Testlauf an etwas, das in Wahrheit existiert.
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
  LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;

CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb
  LANGUAGE sql STABLE AS $$ SELECT '{}'::jsonb $$;

-- ─── Die Rollen, mit denen der Browser spricht ──────────────────────────────
--
-- Supabase legt `anon` und `authenticated` an und gibt ihnen per Default-
-- Privileges ALLE Rechte auf jede neue Tabelle und View in `public`. Was sie
-- dann noch sehen, entscheidet allein RLS — und bei Views, die ohne
-- security_invoker laufen, nicht einmal das: die pruefen gegen den Owner.
--
-- Ohne diese Nachbildung koennte kein Test sagen, was der oeffentliche Key
-- wirklich lesen kann. Mit ihr laesst sich `SET ROLE anon` fahren und zaehlen.

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
END $$;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA auth   TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
