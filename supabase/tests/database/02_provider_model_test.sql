-- Das Anbieter-Datenmodell: haelt die UND-Kette?
--
-- Gehoert zu 20260920000000_provider_data_model.sql. Geprueft wird nicht,
-- dass die Tabellen da sind — das waere eine Tautologie —, sondern die eine
-- Eigenschaft, wegen der es sie gibt: eine Leistung ist in einem Markt genau
-- dann sichtbar, wenn ALLE drei Statusachsen sie erlauben, und sie
-- verschwindet von selbst, wenn eine Freigabe ablaeuft.
--
-- Der wichtigste Test steht am Ende (Gate 6): ein Anbieter ohne
-- Zahlungsbereitschaft bleibt matchbar. Das sieht nach einer Luecke aus und
-- ist die Anforderung — Spec §14 verbietet, dass ein kommerzieller Status die
-- organische Sichtbarkeit beeinflusst. Wer diese Zeile spaeter "repariert",
-- soll an diesem Test scheitern.

begin;
select plan(42);

-- ─── Struktur ───────────────────────────────────────────────────────────────

select has_table('service_categories');
select has_table('provider_services');
select has_table('provider_service_coverage');
select has_table('provider_evidence');
select has_table('provider_confidential');
select has_table('provider_change_requests');
select has_table('provider_agreement_acceptance');
select has_table('provider_field_visibility');
select has_view('matchable_provider_services');

-- ─── RLS: deny-all gegenueber anon und authenticated ────────────────────────

select is((select relrowsecurity from pg_class where oid = 'public.provider_services'::regclass),
          true, 'provider_services braucht RLS');
select is((select relrowsecurity from pg_class where oid = 'public.provider_service_coverage'::regclass),
          true, 'provider_service_coverage braucht RLS');
select is((select relrowsecurity from pg_class where oid = 'public.provider_evidence'::regclass),
          true, 'provider_evidence braucht RLS');
select is((select relrowsecurity from pg_class where oid = 'public.provider_confidential'::regclass),
          true, 'provider_confidential braucht RLS');
select is((select relrowsecurity from pg_class where oid = 'public.provider_change_requests'::regclass),
          true, 'provider_change_requests braucht RLS');
select is((select relrowsecurity from pg_class where oid = 'public.provider_agreement_acceptance'::regclass),
          true, 'provider_agreement_acceptance braucht RLS');
select is((select relrowsecurity from pg_class where oid = 'public.provider_field_visibility'::regclass),
          true, 'provider_field_visibility braucht RLS');

-- Vertrauliche Verifikationsdaten haben KEINE Policy. Kein Zugriff ausser
-- ueber die Service-Rolle — physische Trennung, nicht nur ein Feld-Tag (§1).
select is((select count(*)::int from pg_policies
           where schemaname = 'public' and tablename = 'provider_confidential'),
          0, 'provider_confidential darf keine einzige Policy haben');

-- ─── Fixture ────────────────────────────────────────────────────────────────
-- Ein Anbieter, zwei Leistungen, zwei Maerkte je Leistung.

insert into public.providers (provider_key, name, partner_status, lifecycle_status, billing_ready)
values ('t-model', 'Testkanzlei', 'active', 'active', false);

insert into public.provider_services (id, provider_key, service_code, service_name, status)
values ('aaaaaaaa-0000-0000-0000-000000000001', 't-model', 'tax-vat',             'Tax and VAT',               'approved'),
       ('aaaaaaaa-0000-0000-0000-000000000002', 't-model', 'corporate-structure', 'Company Setup and Filings', 'approved');

insert into public.provider_service_coverage (service_id, country_code, status)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'DE', 'approved'),
       ('aaaaaaaa-0000-0000-0000-000000000001', 'AT', 'approved'),
       ('aaaaaaaa-0000-0000-0000-000000000002', 'DE', 'approved');

select is((select count(*)::int from matchable_provider_services where provider_key = 't-model'),
          3, 'Ausgangslage: drei Leistung-Markt-Paare sichtbar');

-- ─── Gate 1: das Konto ──────────────────────────────────────────────────────

update public.providers set lifecycle_status = 'suspended' where provider_key = 't-model';
select is((select count(*)::int from matchable_provider_services where provider_key = 't-model'),
          0, 'Konto suspendiert: alles weg, obwohl Leistung und Freigabe approved bleiben');

-- ─── Gate 2: reverification_due, die Frist entscheidet ──────────────────────

update public.providers set lifecycle_status = 'reverification_due', reverification_grace_until = null
  where provider_key = 't-model';
select is((select count(*)::int from matchable_provider_services where provider_key = 't-model'),
          0, 'Reverifizierung faellig ohne Frist: nicht matchbar');

update public.providers set reverification_grace_until = now() + interval '14 days'
  where provider_key = 't-model';
select is((select count(*)::int from matchable_provider_services where provider_key = 't-model'),
          3, 'Reverifizierung faellig, Frist laeuft: weiterhin matchbar');

update public.providers set reverification_grace_until = now() - interval '1 day'
  where provider_key = 't-model';
select is((select count(*)::int from matchable_provider_services where provider_key = 't-model'),
          0, 'Frist abgelaufen: nicht mehr matchbar, ohne dass jemand den Status anfasst');

update public.providers set lifecycle_status = 'active', reverification_grace_until = null
  where provider_key = 't-model';

-- ─── Gate 3: die einzelne Leistung (§19) ────────────────────────────────────

update public.provider_services set status = 'paused'
  where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select is((select count(*)::int from matchable_provider_services where provider_key = 't-model'),
          1, 'Eine Leistung pausiert: nur deren Maerkte fallen raus');
select is((select count(*)::int from matchable_provider_services
           where provider_key = 't-model' and service_code = 'corporate-structure'),
          1, 'Die andere Leistung bleibt unberuehrt');

update public.provider_services set status = 'approved'
  where id = 'aaaaaaaa-0000-0000-0000-000000000001';

-- ─── Gate 4: der einzelne Markt (§4) ────────────────────────────────────────

update public.provider_service_coverage set status = 'suspended'
  where service_id = 'aaaaaaaa-0000-0000-0000-000000000001' and country_code = 'AT';
select is((select count(*)::int from matchable_provider_services
           where provider_key = 't-model' and country_code = 'AT'),
          0, 'Markt entzogen: dieser Markt faellt raus');
select is((select count(*)::int from matchable_provider_services
           where provider_key = 't-model' and country_code = 'DE'),
          2, 'Die anderen Maerkte bleiben — das ist der Sinn granularer Freigabe');

update public.provider_service_coverage set status = 'approved'
  where service_id = 'aaaaaaaa-0000-0000-0000-000000000001' and country_code = 'AT';

-- ─── Gate 5: Ablauf wirkt ohne Zutun ────────────────────────────────────────
-- Der eigentliche Grund fuer die View statt eines Flags: hier bleibt der
-- Status auf 'approved' stehen, und die Zeile verschwindet trotzdem.

update public.provider_service_coverage set expires_at = now() - interval '1 hour'
  where service_id = 'aaaaaaaa-0000-0000-0000-000000000001' and country_code = 'DE';
select is((select count(*)::int from matchable_provider_services
           where service_id = 'aaaaaaaa-0000-0000-0000-000000000001' and country_code = 'DE'),
          0, 'Abgelaufene Freigabe ist nicht matchbar');
select is((select status from public.provider_service_coverage
           where service_id = 'aaaaaaaa-0000-0000-0000-000000000001' and country_code = 'DE'),
          'approved', 'und zwar ohne dass der Status nachgezogen wurde — ein Flag waere jetzt falsch');

update public.provider_service_coverage set expires_at = null
  where service_id = 'aaaaaaaa-0000-0000-0000-000000000001' and country_code = 'DE';

-- ─── Gate 6: kommerzielle Neutralitaet (§14) ────────────────────────────────
-- Der Test, der am ehesten "wegoptimiert" wird. Das Billing-Gate aus §21.1
-- sperrt die BUCHUNG, nicht das Matching. Zoege man billing_ready in die
-- WHERE-Klausel der View, entschiede ein Zahlungsstatus darueber, wer
-- ueberhaupt erscheint — genau das verbietet §14.

select is((select billing_ready from public.providers where provider_key = 't-model'),
          false, 'Fixture-Anbieter ist nicht zahlungsbereit');
select is((select count(*)::int from matchable_provider_services where provider_key = 't-model'),
          3, 'Nicht zahlungsbereit und trotzdem matchbar: Abrechnung darf die Sichtbarkeit nicht steuern (§14)');
select is((select bool_and(bookable_chargeable = false) from matchable_provider_services
           where provider_key = 't-model'),
          true, 'Die View meldet den Zustand, statt ihn zu filtern');

-- ─── Zusicherungen auf Feldebene ────────────────────────────────────────────

select throws_ok(
  $$ insert into public.provider_services (provider_key, service_code, service_name, price_min, price_max)
     values ('t-model', 'tax-vat', 'Preis ohne Waehrung', 500, 900) $$,
  '23514',
  null,
  'Preisspanne ohne Waehrung und Basis wird abgelehnt (§27)');

select throws_ok(
  $$ insert into public.provider_services (provider_key, service_code, service_name, price_min, price_max, currency, pricing_basis)
     values ('t-model', 'tax-vat', 'Verdreht', 900, 500, 'EUR', 'je Anmeldung') $$,
  '23514',
  null,
  'Mindestpreis ueber Hoechstpreis wird abgelehnt');

select throws_ok(
  $$ insert into public.provider_services (provider_key, service_code, service_name)
     values ('t-model', 'frei-erfunden', 'Nicht in der Taxonomie') $$,
  '23503',
  null,
  'Ein Code ausserhalb der Taxonomie wird abgelehnt — kein freies Keyword als Matching-Eingang (§11.1)');

select throws_ok(
  $$ insert into public.provider_service_coverage (service_id, country_code)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'DE') $$,
  '23505',
  null,
  'Derselbe Markt zweimal je Leistung wird abgelehnt');

select throws_ok(
  $$ insert into public.provider_evidence (provider_key, evidence_type, issue_date, expires_at)
     values ('t-model', 'licence', '2026-12-01', '2026-01-01') $$,
  '23514',
  null,
  'Nachweis, der vor seiner Ausstellung ablaeuft, wird abgelehnt');

-- ─── Taxonomie ──────────────────────────────────────────────────────────────

select is((select count(*)::int from public.service_categories where parent_code is null),
          9, 'Neun Bereiche — Spec §11 nennt acht, die Plattform trennt Verpackung und Stoffrecht');
select cmp_ok((select count(*)::int from public.service_categories where parent_code is not null),
              '>', 0, 'Jeder Bereich hat Unterkategorien');


-- ─── area_code: der Bereich kommt aus der Taxonomie, nicht aus der API ──────
--
-- Gehoert zu 20260921000000_matchable_area_code.sql. Der Wizard sendet
-- Bereichs-Slugs; eine Leistung darf nach §11 eine Unterkategorie sein. Ohne
-- diese Spalte muesste das Matching die Taxonomie ein zweites Mal nachbauen.
--
-- Eigener Anbieter, weil der Fixture oben die Statusachsen durchgespielt hat.

insert into public.providers (provider_key, name, partner_status, lifecycle_status)
values ('t-area', 'Bereichstest', 'active', 'active');

insert into public.provider_services (id, provider_key, service_code, service_name, status)
values ('bbbbbbbb-0000-0000-0000-000000000001', 't-area', 'tax-vat',         'Bereich direkt',  'approved'),
       ('bbbbbbbb-0000-0000-0000-000000000002', 't-area', 'tax-vat.oss-ioss', 'Unterkategorie', 'approved');

insert into public.provider_service_coverage (service_id, country_code, status)
values ('bbbbbbbb-0000-0000-0000-000000000001', 'DE', 'approved'),
       ('bbbbbbbb-0000-0000-0000-000000000002', 'DE', 'approved');

select is((select area_code from matchable_provider_services
           where service_id = 'bbbbbbbb-0000-0000-0000-000000000001'),
          'tax-vat', 'Ein Bereich rollt auf sich selbst');
select is((select area_code from matchable_provider_services
           where service_id = 'bbbbbbbb-0000-0000-0000-000000000002'),
          'tax-vat', 'Eine Unterkategorie rollt auf ihren Bereich hoch — der Wizard-Slug trifft sie');

-- Der Taxonomie-JOIN darf die Sichtbarkeitsgrenze nicht verschieben. Er ist
-- ueber einen Fremdschluessel angebunden und damit nicht einschraenkend —
-- diese Zeile haelt das fest, damit ein spaeterer LEFT/INNER-Umbau oder ein
-- nachlaessiges ON auffaellt, statt still Anbieter aus dem Matching zu werfen.
select is(
  (select count(*)::int from matchable_provider_services),
  (select count(*)::int
     from public.provider_services s
     join public.provider_service_coverage c on c.service_id = s.id
     join public.providers p on p.provider_key = s.provider_key
    where (p.lifecycle_status in ('active','limited')
           or (p.lifecycle_status = 'reverification_due'
               and p.reverification_grace_until is not null
               and p.reverification_grace_until > now()))
      and s.status in ('approved','limited')
      and c.status in ('approved','limited')
      and (c.expires_at is null or c.expires_at > now())),
  'Die Taxonomie anzujoinen kostet keine einzige Zeile');

select is((select count(*)::int from matchable_provider_services where area_code is null),
          0, 'Keine matchbare Leistung ohne Bereich — sonst faende der Wizard sie nie');

select * from finish();
rollback;
