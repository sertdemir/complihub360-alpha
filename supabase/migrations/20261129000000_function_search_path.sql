-- ─── Fester Suchpfad fuer die sieben Funktionen ohne einen ──────────────────
--
-- Der Supabase-Pruefer meldet auf Staging und Beta dieselben sieben Funktionen
-- als "function_search_path_mutable" (Systemcheck 24.11.2026). Ohne festen
-- Suchpfad loest eine Funktion unqualifizierte Namen ueber den Suchpfad dessen
-- auf, der sie gerade ausfuehrt. Wer dort ein eigenes Schema vor `public`
-- stellen kann, schiebt der Funktion eine andere Tabelle oder Funktion gleichen
-- Namens unter. Alle sieben laufen als SECURITY INVOKER, die Gefahr ist hier
-- also klein; der feste Pfad schliesst sie trotzdem und haelt den Pruefer
-- ruhig, damit ein neuer, ernster Befund nicht in sieben alten untergeht.
--
-- Sechs der sieben benutzen nur Eingebautes (now(), md5(), random(), RAISE …).
-- Sie bekommen den leeren Pfad: pg_catalog wird immer durchsucht, sonst nichts.
--
-- match_knowledge_chunks braucht den Operator `<=>` der Erweiterung `vector`.
-- Ein Operator laesst sich nur ueber den Suchpfad finden (oder ueber die
-- sperrige Form OPERATOR(schema.<=>)). `vector` liegt in `public`; der Pruefer
-- raet, Erweiterungen nach `extensions` zu legen. Der Pfad nennt deshalb
-- beide, damit die Funktion einen solchen Umzug uebersteht. Ein Schema, das
-- es (noch) nicht gibt, ist im Suchpfad erlaubt und wird uebergangen.
--
-- Nebenwirkung, bewusst in Kauf genommen: Eine SQL-Funktion mit SET-Klausel
-- wird nicht mehr in die aufrufende Abfrage eingebettet. match_knowledge_chunks
-- sortiert nach dem errechneten Wert `1 - Abstand`, konnte den Vektor-Index
-- also auch eingebettet nicht fuer die Sortierung nutzen.
--
-- ACHTUNG fuer spaetere Migrationen: CREATE OR REPLACE FUNCTION ohne
-- SET search_path setzt die Einstellung wieder zurueck. Der Test
-- 29_function_search_path_test.sql faengt das ab.

ALTER FUNCTION public.gen_public_ref()                      SET search_path = '';
ALTER FUNCTION public.trigger_set_timestamp()               SET search_path = '';
ALTER FUNCTION public.providers_lifecycle_since()           SET search_path = '';
ALTER FUNCTION public.provider_lead_ledger_immutable()      SET search_path = '';
ALTER FUNCTION public.provider_review_log_immutable()       SET search_path = '';
ALTER FUNCTION public.user_agreement_acceptance_immutable() SET search_path = '';

-- Ueber den Namen statt ueber die Signatur: der Typ `vector` steht je nach
-- Datenbank in `public` oder `extensions`, und eine aeltere Ueberladung mit
-- drei Argumenten soll, wo es sie noch gibt, denselben Pfad bekommen.
DO $$
DECLARE
  f regprocedure;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = 'match_knowledge_chunks'
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, extensions, pg_temp', f);
  END LOOP;
END
$$;
