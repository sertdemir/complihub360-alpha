-- ─── Embedding-Suche bleibt in einem Modell (ADR-0011) ──────────────────────
--
-- Drei Chunks mit identischem Vektor: Altbestand ohne Kennung, einer mit
-- Gemini-Kennung, einer mit Qwen. Ohne Parameter kommen alle, mit Parameter
-- nur das eine Modell — und zwar VOR dem LIMIT.

begin;
select plan(6);

insert into public.knowledge_chunks (content, metadata, embedding) values
  ('alt',    '{"country":"DE"}',                                       array_fill(0.1::real, array[768])::vector),
  ('gemini', '{"country":"DE","embed_model":"gemini-embedding-001"}',  array_fill(0.1::real, array[768])::vector),
  ('qwen',   '{"country":"DE","embed_model":"qwen3-embedding-8b"}',    array_fill(0.1::real, array[768])::vector);

select is((select count(*)::int from public.match_knowledge_chunks(array_fill(0.1::real, array[768])::vector, 0.0, 10)),
          3, 'Ohne Modell-Parameter: alle Treffer wie bisher (/search)');

select is((select count(*)::int from public.match_knowledge_chunks(array_fill(0.1::real, array[768])::vector, 0.0, 10, 'gemini-embedding-001')),
          2, 'Gemini: Altbestand ohne Kennung zaehlt als gemini-embedding-001');

select results_eq($$ select content from public.match_knowledge_chunks(array_fill(0.1::real, array[768])::vector, 0.0, 1, 'qwen3-embedding-8b') $$,
          $$ values ('qwen'::text) $$,
          'Qwen mit LIMIT 1: der Filter greift vor dem LIMIT');

select is((select count(*)::int from public.match_knowledge_chunks(array_fill(0.1::real, array[768])::vector, 0.0, 10, 'Qwen/Qwen3-Embedding-8B')),
          0, 'Unbekannte Kennung: keine Treffer statt fremder Vektoren');

set local role anon;
select throws_ok($$ select * from public.match_knowledge_chunks(array_fill(0.1::real, array[768])::vector, 0.0, 5, 'qwen3-embedding-8b') $$,
          '42501', null, 'anon ruft die Suche auch mit Modell-Parameter nicht auf');
reset role;

select is((select count(*)::int from pg_proc where proname = 'match_knowledge_chunks'),
          1, 'Genau eine Signatur — sonst ist der PostgREST-Aufruf mehrdeutig');

select * from finish();
rollback;
