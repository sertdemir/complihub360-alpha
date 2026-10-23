-- ─── Nutzer-Vereinbarungen (Beta-Vereinbarung) ───────────────────────────────
--
-- Gehoert zu 20261022000000_user_agreements.sql. Geprueft wird:
--
--   1. beta-2026-10 liegt in vier Sprachen vor, neun Punkte, ein Stichtag.
--   2. Umlaute und tuerkische Zeichen stehen im Text.
--   3. Eine Annahme laesst sich schreiben; aendern und loeschen nicht (append-only).
--   4. Eine Annahme braucht eine existierende Fassung (FK).
--   5. anon liest den Text, aber keine Annahmen.

begin;
select plan(10);

select is((select count(*)::int from public.user_agreements where agreement = 'beta' and version = 'beta-2026-10'), 4, 'beta-2026-10 in vier Sprachen');
select is((select count(distinct effective_from)::int from public.user_agreements where version = 'beta-2026-10'), 1, 'eine Fassung, ein Stichtag');
select is((select jsonb_array_length(points) from public.user_agreements where version = 'beta-2026-10' and language = 'de'), 9, 'neun Saetze');
select ok((select points::text like '%Gewähr%' from public.user_agreements where version = 'beta-2026-10' and language = 'de'), 'de mit Umlauten');
select ok((select points::text like '%sözleşme%' or title like '%sözleşme%' from public.user_agreements where version = 'beta-2026-10' and language = 'tr'), 'tr mit seinen Zeichen');

insert into public.user_agreement_acceptance (id, user_id, agreement, version, language)
  values ('00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-0000000000a1', 'beta', 'beta-2026-10', 'de');
select throws_ok($$ update public.user_agreement_acceptance set version = 'beta-2026-11' where id = '00000000-0000-0000-0000-00000000a001' $$,
  '23001', null, 'Annahme ist append-only (UPDATE)');
select throws_ok($$ delete from public.user_agreement_acceptance where id = '00000000-0000-0000-0000-00000000a001' $$,
  '23001', null, 'Annahme ist append-only (DELETE)');
select throws_ok($$ insert into public.user_agreement_acceptance (user_id, agreement, version, language) values ('00000000-0000-0000-0000-0000000000a1', 'beta', 'gibt-es-nicht', 'de') $$,
  '23503', null, 'Annahme nur fuer eine existierende Fassung');

set local role anon;
select is((select count(*)::int from public.user_agreements where version = 'beta-2026-10'), 4, 'anon liest den Text');
-- Annahmen: RLS ohne Policy — anon sieht keine Zeile, auch nicht die eben geschriebene.
select is((select count(*)::int from public.user_agreement_acceptance), 0, 'anon liest keine Annahmen');

select * from finish();
rollback;
