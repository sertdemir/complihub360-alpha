-- ─── Eingespielte Migrationen auch am Namen erkennen ────────────────────────
--
-- Staging, 24.10.2026: Viele aeltere Migrationen stehen dort mit dem
-- Zeitstempel des Einspielens als version und dem blossen Namen ohne
-- Zeitstempel (z. B. 20260922200428 / provider_data_model fuer die Datei
-- 20260920000000_provider_data_model.sql). Der Abgleich ueber Zeitstempel
-- allein haette 41 von 63 Dateien als fehlend gemeldet und jeden
-- Staging-Deploy rot gemacht.
--
-- Die Funktion liefert deshalb zusaetzlich 'name:<Name ohne Zeitstempel>'.
-- schemaCheck.ts zaehlt eine Datei als eingespielt, wenn ihr Zeitstempel
-- ODER ihr Name auftaucht. Aeltere APIs, die nur Zeitstempel kennen,
-- ignorieren die neuen Zeilen.

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
    UNION
    SELECT 'name:' || regexp_replace(name, '^\d{14}_', '') FROM supabase_migrations.schema_migrations
     WHERE name IS NOT NULL AND name <> ''
  $q$;
END;
$$;

REVOKE ALL ON FUNCTION public.applied_migration_versions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.applied_migration_versions() TO service_role;

COMMENT ON FUNCTION public.applied_migration_versions() IS
  'Versionen der eingespielten Migrationen (auch MCP-eingespielte, ueber den Zeitstempel im Namen) und ihre Namen als name:<Name>. Nur Service-Rolle; die API vergleicht sie mit dem Repo (schemaCheck.ts).';
