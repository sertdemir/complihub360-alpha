-- ─── Kleinunternehmerregelung als eigener Fakt (TKT-FACTS-01) ────────────────
--
-- Die Befreiung steht je EU-Markt im eigenen Schlüssel; AT und FR führen sie
-- nicht mehr als Registrierungsschwelle. Spanien hat ausdrücklich keine.

begin;
select plan(7);

select is((select count(*)::int from public.jurisdiction_facts
            where fact_key = 'small_business_exemption' and domain = 'vat'),
          6, 'Sechs EU-Märkte haben einen Eintrag zur Kleinunternehmerregelung');

select is((select value_numeric from public.jurisdiction_facts
            where jurisdiction_code = 'DE' and fact_key = 'small_business_exemption'),
          25000::numeric, 'DE: 25.000 € Vorjahresgrenze (Stand 2025)');

select ok((select value_text like '%EUR 100,000 in the current year%' from public.jurisdiction_facts
            where jurisdiction_code = 'DE' and fact_key = 'small_business_exemption'),
          'DE: 100.000 € im laufenden Jahr steht im Wert');

select is((select value_numeric from public.jurisdiction_facts
            where jurisdiction_code = 'AT' and fact_key = 'registration_threshold_established'),
          0::numeric, 'AT: die Registrierungsschwelle trägt die Befreiung nicht mehr');

select ok((select value_text not like '%85,000%' from public.jurisdiction_facts
            where jurisdiction_code = 'FR' and fact_key = 'registration_threshold_established'),
          'FR: die Registrierungsschwelle nennt die franchise en base nicht mehr');

select ok((select value_text like 'None%' from public.jurisdiction_facts
            where jurisdiction_code = 'ES' and fact_key = 'small_business_exemption'),
          'ES: ausdrücklich keine Befreiung');

select is((select count(*)::int from public.jurisdiction_facts
            where fact_key = 'small_business_exemption' and (source is null or effective_date is null)),
          0, 'Jede Zeile trägt Quelle und Stichtag');

select * from finish();
rollback;
