-- ─── Der Wissenskorpus ist intern ───────────────────────────────────────────
--
-- Bis 10.10.2026 las `anon` mit dem Key aus dem Browser-Bundle jeden Abschnitt
-- des EY-Leitfadens (Policy "globally readable"). Hier: als Owner da (Gegen-
-- probe), als anon und authenticated weg — direkt und ueber die RPC.

begin;
select plan(6);

insert into public.knowledge_chunks (content, metadata, embedding)
values ('Interner Abschnitt', '{"country":"DE"}', array_fill(0.1::real, array[768])::vector);

select is((select count(*)::int from public.knowledge_chunks), 1,
          'Fixture: als Owner ist der Abschnitt da (Gegenprobe fuer die Nullen)');

set local role anon;
select is((select count(*)::int from public.knowledge_chunks), 0,
          'anon liest keinen Abschnitt des Korpus');
select throws_ok($$ select * from public.match_knowledge_chunks(array_fill(0.1::real, array[768])::vector, 0.0, 5) $$,
          '42501', null, 'anon ruft die Embedding-Suche nicht auf');
reset role;

set local role authenticated;
select is((select count(*)::int from public.knowledge_chunks), 0,
          'authenticated liest keinen Abschnitt direkt');
select throws_ok($$ select * from public.match_knowledge_chunks(array_fill(0.1::real, array[768])::vector, 0.0, 5) $$,
          '42501', null, 'authenticated ruft die Embedding-Suche nicht auf');
reset role;

select is((select count(*)::int from pg_policies
           where schemaname = 'public' and tablename = 'knowledge_chunks'
             and policyname = 'Knowledge Chunks are globally readable'),
          0, 'Die Policy "globally readable" existiert nicht mehr');

select * from finish();
rollback;
