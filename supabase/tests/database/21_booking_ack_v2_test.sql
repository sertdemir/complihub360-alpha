-- ─── Acknowledgement v2 ──────────────────────────────────────────────────────
--
-- Gehoert zu 20261020000000_booking_ack_v2.sql. Geprueft wird:
--
--   1. v2 liegt in vier Sprachen vor, mit demselben effective_from.
--   2. Die deutsche, spanische und tuerkische Fassung tragen ihre Zeichen.
--   3. v1 bleibt stehen — bestehende Buchungen zeigen darauf.
--   4. anon liest den Text (oeffentlicher Rechtstext).

begin;
select plan(6);

select is((select count(*)::int from public.booking_acknowledgements where version = 'booking-ack-v2'), 4, 'v2 in vier Sprachen');
select is((select count(distinct effective_from)::int from public.booking_acknowledgements where version = 'booking-ack-v2'), 1, 'eine Fassung, ein Stichtag');
select ok((select body like '%für Sie sichtbar%' from public.booking_acknowledgements where version = 'booking-ack-v2' and language = 'de'), 'de mit Umlauten');
select ok((select body like '%dirección de correo electrónico%' from public.booking_acknowledgements where version = 'booking-ack-v2' and language = 'es'), 'es mit Akzenten');
select is((select count(*)::int from public.booking_acknowledgements where version = 'booking-ack-v1'), 4, 'v1 bleibt fuer bestehende Buchungen');

set local role anon;
select is((select count(*)::int from public.booking_acknowledgements where version = 'booking-ack-v2' and language = 'tr' and body like '%sağlayıcının adı%'), 1, 'anon liest die tuerkische Fassung mit ihren Zeichen');

select * from finish();
rollback;
