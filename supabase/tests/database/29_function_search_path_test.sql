-- ─── Jede eigene Funktion in public hat einen festen Suchpfad ───────────────
--
-- Gehoert zu 20261129000000_function_search_path.sql. Geprueft wird:
--
--   1. Keine eigene Funktion in `public` ist ohne festen Suchpfad. Das ist der
--      Waechter: Eine spaetere Migration, die eine Funktion mit
--      CREATE OR REPLACE neu anlegt und SET search_path vergisst, faellt hier
--      auf, mit dem Namen der Funktion in der Meldung.
--   2. Die sieben Funktionen der Migration tragen den erwarteten Pfad.
--   3. Sie tun mit festem Pfad noch, was sie sollen, auch wenn der Aufrufer
--      einen fremden Suchpfad mitbringt. Die drei Sperr-Funktionen pruefen
--      die Tests ihrer eigenen Tabellen.
--
-- Funktionen, die einer Erweiterung gehoeren (pgTAP, vector), zaehlen nicht:
-- die liegen in `public`, sind aber nicht unsere.

begin;
select plan(13);

select is_empty(
  $$ select p.oid::regprocedure::text
       from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.prokind in ('f', 'p')
        and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
        and not exists (select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) c where c like 'search_path=%')
      order by 1 $$,
  'keine eigene Funktion in public ohne festen Suchpfad'
);

create temp view fn_path as
  select p.proname, (select c from unnest(p.proconfig) c where c like 'search_path=%') as path
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public';

select is((select path from fn_path where proname = 'gen_public_ref'),                      'search_path=""', 'gen_public_ref: leerer Pfad');
select is((select path from fn_path where proname = 'trigger_set_timestamp'),               'search_path=""', 'trigger_set_timestamp: leerer Pfad');
select is((select path from fn_path where proname = 'providers_lifecycle_since'),           'search_path=""', 'providers_lifecycle_since: leerer Pfad');
select is((select path from fn_path where proname = 'provider_lead_ledger_immutable'),      'search_path=""', 'provider_lead_ledger_immutable: leerer Pfad');
select is((select path from fn_path where proname = 'provider_review_log_immutable'),       'search_path=""', 'provider_review_log_immutable: leerer Pfad');
select is((select path from fn_path where proname = 'user_agreement_acceptance_immutable'), 'search_path=""', 'user_agreement_acceptance_immutable: leerer Pfad');
select is(
  (select count(*)::int from fn_path where proname = 'match_knowledge_chunks' and path = 'search_path=public, extensions, pg_temp'),
  (select count(*)::int from fn_path where proname = 'match_knowledge_chunks'),
  'match_knowledge_chunks: jede Ueberladung mit public, extensions, pg_temp'
);
select cmp_ok((select count(*)::int from fn_path where proname = 'match_knowledge_chunks'), '>=', 1, 'match_knowledge_chunks gibt es');

-- Verhalten mit festem Pfad, aufgerufen mit einem fremden Suchpfad: Der
-- Aufrufer stellt ein eigenes Schema nach vorn und nimmt `public` heraus.
-- pgTAP selbst liegt in `public` und braucht den normalen Pfad. Deshalb laufen
-- die Aufrufe unter dem fremden Pfad und schreiben ihr Ergebnis weg; geprueft
-- wird danach. Scheitert ein Aufruf, bricht die Datei hier ab und der Plan
-- geht nicht auf.
create schema fremd;
insert into public.knowledge_chunks (content, metadata, embedding) values
  ('pfad', '{"country":"DE"}', array_fill(0.1::real, array[768])::vector);
insert into public.providers (provider_key, name, partner_status, lifecycle_status)
  values ('pfad-test', 'Pfad-Test', 'inactive', 'draft');

set local search_path = fremd, pg_temp;
create temp table unter_fremdem_pfad as
  select public.gen_public_ref() as ref,
         (select count(*)::int
            from public.match_knowledge_chunks(array_fill(0.1::real, array[768])::public.vector, 0.0, 10)) as treffer;
update public.providers set name = 'Pfad-Test 2' where provider_key = 'pfad-test';
update public.providers set lifecycle_status = 'submitted' where provider_key = 'pfad-test';
reset search_path;

select matches((select ref from unter_fremdem_pfad), '^[0-9a-f]{12}$',
  'gen_public_ref liefert zwoelf Hex-Zeichen, auch mit fremdem Suchpfad');
select cmp_ok((select treffer from unter_fremdem_pfad), '>=', 1,
  'match_knowledge_chunks findet den Vektor-Operator ueber den eigenen Pfad');
select is((select name from public.providers where provider_key = 'pfad-test'), 'Pfad-Test 2',
  'ein Update auf providers laeuft durch die Trigger-Funktionen mit leerem Pfad');
select isnt((select lifecycle_status_since from public.providers where provider_key = 'pfad-test'), null,
  'providers_lifecycle_since setzt den Zeitpunkt des Statuswechsels');

-- Dass die drei Sperr-Funktionen weiter sperren, pruefen die Tests ihrer
-- eigenen Tabellen (Ledger, Review-Log, Vereinbarungen); sie laufen gegen
-- denselben Stand, also mit dem festen Pfad.

select * from finish();
rollback;
