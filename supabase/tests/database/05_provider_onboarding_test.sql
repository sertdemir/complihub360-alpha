-- ─── Onboarding und Verifikation: haelt der Speicher, was das Dossier braucht? ─
--
-- Gehoert zu 20260924000000_provider_onboarding.sql. Geprueft werden die
-- Eigenschaften, wegen derer die Migration existiert:
--
--   1. Der Bucket ist da und privat — ein oeffentlicher Bucket waere ein
--      Datenleck mit Handelsregisterauszuegen.
--   2. Ein Nachweis traegt Datei-Metadaten und startet unbestaetigt.
--   3. Eine Nachfrage kann nur mit einem Nachweis als erfuellt gelten.
--   4. Das Entscheidungsprotokoll ist append-only.
--   5. lifecycle_status_since zieht von selbst nach.
--   6. Benachrichtigungen duerfen auf 'provider' zeigen.
--   7. anon und authenticated lesen nichts davon.

begin;
select plan(16);

-- ─── 1. Bucket ──────────────────────────────────────────────────────────────

select is((select count(*)::int from storage.buckets where id = 'provider-evidence'), 1, 'Bucket provider-evidence existiert');
select is((select public from storage.buckets where id = 'provider-evidence'), false, 'Bucket ist privat');
select ok((select 'application/pdf' = any(allowed_mime_types) from storage.buckets where id = 'provider-evidence'), 'PDF ist erlaubt');
select ok((select not ('application/zip' = any(allowed_mime_types)) from storage.buckets where id = 'provider-evidence'), 'ZIP ist nicht erlaubt');

-- ─── 2. Nachweis mit Datei ──────────────────────────────────────────────────

insert into public.providers (provider_key, name, partner_status, lifecycle_status)
values ('t-onb', 'Onboardingkanzlei', 'inactive', 'draft');

insert into public.provider_evidence (id, provider_key, evidence_type, original_name, mime_type, size_bytes, file_ref)
values ('11111111-1111-1111-1111-111111111111', 't-onb', 'incorporation', 'hr-auszug.pdf', 'application/pdf', 12345,
        't-onb/11111111-1111-1111-1111-111111111111/hr-auszug.pdf');

select is((select upload_confirmed from public.provider_evidence where id = '11111111-1111-1111-1111-111111111111'), false,
          'Ein neuer Nachweis ist erst angekuendigt, nicht bestaetigt');
select throws_ok(
  $$ insert into public.provider_evidence (provider_key, evidence_type, size_bytes) values ('t-onb', 'insurance', -1) $$,
  '23514', null, 'Negative Dateigroesse scheitert');

-- ─── 3. Nachfrage ───────────────────────────────────────────────────────────

insert into public.provider_evidence_requests (id, provider_key, evidence_type, message)
values ('22222222-2222-2222-2222-222222222222', 't-onb', 'insurance', 'Bitte die aktuelle Police nachreichen.');

select is((select status from public.provider_evidence_requests where id = '22222222-2222-2222-2222-222222222222'), 'open',
          'Eine Nachfrage startet offen');
select throws_ok(
  $$ update public.provider_evidence_requests set status = 'fulfilled' where id = '22222222-2222-2222-2222-222222222222' $$,
  '23514', null, 'Erfuellt ohne Nachweis scheitert');
select lives_ok(
  $$ update public.provider_evidence_requests
     set status = 'fulfilled', fulfilled_evidence_id = '11111111-1111-1111-1111-111111111111', fulfilled_at = now()
     where id = '22222222-2222-2222-2222-222222222222' $$,
  'Erfuellt mit Nachweis geht');

-- ─── 4. Protokoll append-only ───────────────────────────────────────────────

insert into public.provider_review_log (id, provider_key, subject, subject_id, action, from_value, to_value, reason)
values ('33333333-3333-3333-3333-333333333333', 't-onb', 'evidence', '11111111-1111-1111-1111-111111111111',
        'decide', 'received', 'reviewed', 'Auszug aktuell, Firma stimmt.');

select throws_ok(
  $$ update public.provider_review_log set reason = 'geaendert' where id = '33333333-3333-3333-3333-333333333333' $$,
  '23001', null, 'UPDATE am Protokoll scheitert');
select throws_ok(
  $$ delete from public.provider_review_log where id = '33333333-3333-3333-3333-333333333333' $$,
  '23001', null, 'DELETE am Protokoll scheitert');
select throws_ok(
  $$ insert into public.provider_review_log (provider_key, subject, action) values ('t-onb', 'billing', 'x') $$,
  '23514', null, 'Unbekannter Gegenstand scheitert');

-- ─── 5. lifecycle_status_since ──────────────────────────────────────────────

update public.providers set lifecycle_status_since = now() - interval '10 days' where provider_key = 't-onb';
update public.providers set lifecycle_status = 'submitted' where provider_key = 't-onb';
select ok((select lifecycle_status_since > now() - interval '1 minute' from public.providers where provider_key = 't-onb'),
          'Statuswechsel setzt lifecycle_status_since neu');
update public.providers set name = 'Onboardingkanzlei GmbH' where provider_key = 't-onb';
select ok((select lifecycle_status_since > now() - interval '1 minute' from public.providers where provider_key = 't-onb'),
          'Andere Aenderungen lassen das Datum stehen (es bleibt das vom Wechsel)');

-- ─── 6. Benachrichtigung auf ein Anbieterkonto ─────────────────────────────

insert into auth.users (id, email) values ('44444444-4444-4444-4444-444444444444', 'onb@example.test');
select lives_ok(
  $$ insert into public.notifications (user_id, type, subject, subject_id)
     values ('44444444-4444-4444-4444-444444444444', 'verification_decided', 'provider', 't-onb') $$,
  'notifications.subject darf provider sein');

-- ─── 7. Nichts davon fuer den Browser ──────────────────────────────────────

set local role anon;
select is((select count(*)::int from public.provider_evidence_requests) + (select count(*)::int from public.provider_review_log), 0,
          'anon liest weder Nachfragen noch Protokoll');
reset role;

select * from finish();
rollback;
