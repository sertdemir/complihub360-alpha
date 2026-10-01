-- ─── Buchung und Belastung: haelt das Schema, was Phase 4 verspricht? ────────
--
-- Gehoert zu 20261001000000_booking_charge.sql. Geprueft werden die
-- Eigenschaften, wegen derer die Migration existiert:
--
--   1. Es gibt EINE Fassung des Bestaetigungstexts in vier Sprachen, mit
--      der Liste der geteilten Felder.
--   2. Der Nutzerrabatt ist Konfiguration: 10 %, wiederkehrend offen.
--   3. Die Buchung zeigt auf das Ledger, nicht umgekehrt — und das Ledger
--      bleibt append-only.
--   4. Ein bestaetigter Termin je Anbieter und Slot.
--   5. Die Selbstauskunft kann nicht „Rabatt gezeigt" ohne „Angebot" sagen,
--      und es gibt sie nur einmal je Buchung.
--   6. anon liest den Text, sonst nichts Neues.
--   7. Die Matching-View haengt an keiner der neuen Tabellen.

begin;
select plan(16);

-- ─── 1. Bestaetigungstext ───────────────────────────────────────────────────

select is((select count(distinct version)::int from public.booking_acknowledgements), 1,
          'Genau eine Fassung des Bestaetigungstexts');
select is((select array_agg(language order by language) from public.booking_acknowledgements where version = 'booking-ack-v1'),
          array['de', 'en', 'es', 'tr']::char(2)[], 'Die Fassung v1 gibt es in de, en, es, tr');
select is((select count(*)::int from public.booking_acknowledgements
            where shared_fields <> array['email', 'company_name', 'message']), 0,
          'Jede Sprachfassung nennt dieselben geteilten Felder: email, company_name, message');
select throws_ok(
  $$ insert into public.booking_acknowledgements (version, language, body, shared_fields)
     values ('t-leer', 'en', 'x', '{}') $$,
  '23514', null, 'Ein Text ohne geteilte Felder ist kein Bestaetigungstext');

-- ─── 2. Nutzerrabatt ────────────────────────────────────────────────────────

select is((select pct || '/' || recurring_treatment from public.user_discount_policy where version = 1), '10/undecided',
          'Policy v1: 10 %, wiederkehrende Leistungen offen (Entscheidung Nr. 6)');

-- ─── 3. Buchung → Ledger, Ledger bleibt append-only ────────────────────────

insert into public.providers (provider_key, name, partner_status, lifecycle_status)
values ('t-charge', 'Belastungskanzlei', 'active', 'active');

insert into public.provider_lead_ledger (id, kind, provider_key, computed_band, standard_fee_cents, final_fee_cents, payment_status, policy_version)
values ('11111111-1111-4111-8111-111111111111', 'charge', 't-charge', 2, 14900, 13410, 'pending', 'lead-fee-policy-v1');

select is((select booking_id from public.provider_lead_ledger where id = '11111111-1111-4111-8111-111111111111'), null,
          'Die Ledger-Zeile entsteht VOR der Buchung — booking_id ist NULL');

select lives_ok(
  $$ insert into public.scheduling (id, provider_key, slot_start, slot_end, status, lead_charged, identity_revealed,
                                    acknowledgement_version, lead_ledger_id, user_discount_pct, user_discount_policy_version,
                                    shared_fields, sharing_confirmed_at)
     values ('22222222-2222-4222-8222-222222222222', 't-charge', '2026-10-09 10:00+00', '2026-10-09 10:30+00', 'confirmed', true, true,
             'booking-ack-v1', '11111111-1111-4111-8111-111111111111', 10, 1,
             array['email', 'company_name', 'message'], now()) $$,
  'Die Buchung zeigt auf die Ledger-Zeile und traegt Fassung, Rabatt und geteilte Felder');

select throws_ok(
  $$ update public.provider_lead_ledger set booking_id = '22222222-2222-4222-8222-222222222222'
     where id = '11111111-1111-4111-8111-111111111111' $$,
  '23001', null, 'Die umgekehrte Richtung bleibt verboten: das Ledger ist append-only, auch fuer booking_id');

select throws_ok(
  $$ insert into public.scheduling (provider_key, slot_start, slot_end, status, user_discount_policy_version)
     values ('t-charge', '2026-10-10 10:00+00', '2026-10-10 10:30+00', 'confirmed', 99) $$,
  '23503', null, 'Eine Buchung kann nur auf eine Policy-Version zeigen, die es gibt');

-- ─── 4. Ein bestaetigter Termin je Slot ─────────────────────────────────────

select throws_ok(
  $$ insert into public.scheduling (provider_key, slot_start, slot_end, status)
     values ('t-charge', '2026-10-09 10:00+00', '2026-10-09 10:30+00', 'confirmed') $$,
  '23505', null, 'Zwei bestaetigte Buchungen auf denselben Slot scheitern am Unique Index');

select lives_ok(
  $$ insert into public.scheduling (provider_key, slot_start, slot_end, status, cancelled_by, cancelled_at)
     values ('t-charge', '2026-10-09 10:00+00', '2026-10-09 10:30+00', 'cancelled', 'user', now()) $$,
  'Eine abgesagte Buchung auf demselben Slot stoert nicht — der Index gilt nur fuer confirmed');

-- ─── 5. Selbstauskunft ──────────────────────────────────────────────────────

select throws_ok(
  $$ insert into public.lead_proposal_reports (booking_id, provider_key, proposal_issued, discount_shown)
     values ('22222222-2222-4222-8222-222222222222', 't-charge', false, true) $$,
  '23514', null, 'Rabatt gezeigt ohne Angebot ist widerspruechlich');

insert into public.lead_proposal_reports (booking_id, provider_key, proposal_issued, discount_shown, discount_pct, policy_version)
values ('22222222-2222-4222-8222-222222222222', 't-charge', true, true, 10, 1);

select throws_ok(
  $$ insert into public.lead_proposal_reports (booking_id, provider_key, proposal_issued, discount_shown)
     values ('22222222-2222-4222-8222-222222222222', 't-charge', true, false) $$,
  '23505', null, 'Eine Selbstauskunft je Buchung — Korrekturen sind Upserts, keine zweite Zeile');

-- ─── 6. Wer liest was ───────────────────────────────────────────────────────

set local role anon;
select ok((select count(*) from public.booking_acknowledgements) >= 4,
          'anon liest den Bestaetigungstext — er steht ohnehin auf dem Bildschirm');
select throws_ok($$ select count(*) from public.user_discount_policy $$, '42501', null,
          'anon liest die Rabatt-Policy nicht');
reset role;

-- ─── 7. Die View kennt die neuen Tabellen nicht ─────────────────────────────

select is((
  select count(*)::int
  from pg_depend d
  join pg_rewrite r on r.oid = d.objid
  join pg_class dep on dep.oid = d.refobjid
  where r.ev_class = 'public.matchable_provider_services'::regclass
    and dep.relname in ('booking_acknowledgements', 'user_discount_policy', 'lead_proposal_reports')
), 0, 'matchable_provider_services haengt an keiner Tabelle der Phase 4 — Buchung und Geld entscheiden nicht ueber Sichtbarkeit');

select * from finish();
rollback;
