-- ─── Welche Migrationen in dieser Datenbank angekommen sind ─────────────────
--
-- Beta-Testbuchung 23.10.2026: Die Buchung scheiterte an einer Spalte, die es
-- in der Beta-Datenbank nicht gab. Sieben Migrationen fehlten dort seit dem
-- 12.10., weil der Deploy den Code ausliefert, die Datenbank aber nicht
-- nachzieht — und niemand es merkte.
--
-- Die API fragt diese Funktion beim Start und alle 10 Minuten (schemaCheck.ts)
-- und meldet im Health-Check, ob Migrationen fehlen; der Deploy wird dann rot.
--
-- Gezaehlt wird die Version UND der Zeitstempel am Anfang des Namens: Ueber
-- den MCP-Weg (apply_migration) eingespielte Dateien stehen mit eigenem
-- Zeitstempel als version und dem Dateinamen als name in der Tabelle.
--
-- plpgsql statt sql: Der Rumpf wird erst beim Aufruf aufgeloest, damit die
-- Funktion auch in der Test-Datenbank ohne supabase_migrations angelegt werden
-- kann; dort liefert sie eine leere Menge.

CREATE OR REPLACE FUNCTION public.applied_migration_versions()
RETURNS SETOF text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NULL THEN
    RETURN;
  END IF;
  RETURN QUERY EXECUTE $q$
    SELECT version::text FROM supabase_migrations.schema_migrations
    UNION
    SELECT substring(name FROM '^(\d{14})_') FROM supabase_migrations.schema_migrations
     WHERE name ~ '^\d{14}_'
  $q$;
END;
$$;

REVOKE ALL ON FUNCTION public.applied_migration_versions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.applied_migration_versions() TO service_role;

COMMENT ON FUNCTION public.applied_migration_versions() IS
  'Versionen der eingespielten Migrationen (auch MCP-eingespielte, ueber den Zeitstempel im Namen). Nur Service-Rolle; die API vergleicht sie mit dem Repo (schemaCheck.ts).';
