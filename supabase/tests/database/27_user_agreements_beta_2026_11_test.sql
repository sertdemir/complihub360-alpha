-- ─── Beta-Vereinbarung, Fassung beta-2026-11 ─────────────────────────────────
--
-- Gehoert zu 20261123000000_user_agreements_beta_2026_11.sql. Geprueft wird:
--
--   1. beta-2026-11 liegt in vier Sprachen vor, zehn Punkte, ein Stichtag.
--   2. Der Hinweis auf Test-Anbieter steht in jeder Sprache an fuenfter Stelle.
--   3. Der Satz zu Verified Providern ist in keiner Sprache mehr enthalten.
--   4. Das Blatt verspricht keine Selbstloeschung des Kontos mehr.
--   5. beta-2026-10 bleibt als Nachweis stehen; die neue Fassung ist die juengere.

begin;
select plan(9);

select is((select count(*)::int from public.user_agreements where agreement = 'beta' and version = 'beta-2026-11'), 4, 'beta-2026-11 in vier Sprachen');
select is((select count(distinct effective_from)::int from public.user_agreements where version = 'beta-2026-11'), 1, 'eine Fassung, ein Stichtag');
select is((select count(*)::int from public.user_agreements where version = 'beta-2026-11' and jsonb_array_length(points) = 10), 4, 'zehn Saetze in jeder Sprache');

select is((select points->4->>'lead' from public.user_agreements where version = 'beta-2026-11' and language = 'de'), 'Anbieter sind Testkonten.', 'de: Punkt 05 nennt die Testkonten');
select is((select count(*)::int from public.user_agreements where version = 'beta-2026-11'
            and (points->4->>'text' ilike '%Testkonten%' or points->4->>'text' ilike '%test account%'
              or points->4->>'text' ilike '%cuentas de prueba%' or points->4->>'text' ilike '%test hesap%')), 4, 'Punkt 05 nennt die Testkonten in jeder Sprache');
select is((select count(*)::int from public.user_agreements where version = 'beta-2026-11' and points::text ilike '%Verified Provider%'), 0, 'kein Satz mehr zu Verified Providern');
select ok((select points->9->>'text' not ilike '%Konto jederzeit löschen%' from public.user_agreements where version = 'beta-2026-11' and language = 'de'), 'de: keine Selbstloeschung versprochen');

select is((select count(*)::int from public.user_agreements where version = 'beta-2026-10'), 4, 'beta-2026-10 bleibt als Nachweis stehen');
select ok((select min(effective_from) from public.user_agreements where version = 'beta-2026-11')
        > (select max(effective_from) from public.user_agreements where version = 'beta-2026-10'), 'beta-2026-11 ist die juengere Fassung');

select * from finish();
rollback;
