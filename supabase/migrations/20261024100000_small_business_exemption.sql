-- ─── Kleinunternehmerregelung als eigener Fakt (TKT-FACTS-01) ────────────────
--
-- DNA-Prüfbogen 23.10.2026: Der Assistent sagte kleinen Unternehmen in
-- Deutschland, sie müssten sich "unabhängig vom Umsatz" registrieren, und
-- nannte auf Nachfrage 22.000 €/50.000 € aus seinem Trainingswissen (Stand vor
-- 2025). Ursache waren die Daten: DE führte nur `registration_threshold_
-- established = 'None'` (richtig für die Registrierung), die Befreiung fehlte.
-- AT und FR legten sie uneinheitlich als Registrierungsschwelle ab, und FR
-- wurde so auf einen deutschen Händler angewendet.
--
-- Konvention (vom Nutzer freigegeben, 24.10.2026):
--   * eigener Schlüssel `small_business_exemption` für die EU-Märkte;
--   * die Registrierungsschwelle bleibt Registrierungsschwelle — AT und FR
--     verweisen dort nur noch auf die Befreiung;
--   * Quelle und Stichtag je Zeile; Werte in eigenen Worten.
-- Die Werte hat der Nutzer gegen die Primärquellen freigegeben. FR ohne die
-- Regel, ab wann die Toleranzschwelle die Befreiung beendet (Quellen
-- widersprüchlich); IT mit dem Hinweis, dass es ein Einkommensteuer-Regime
-- mit weiteren Voraussetzungen ist.

insert into public.jurisdiction_facts
  (country_code, jurisdiction_code, jurisdiction_level, domain, fact_key, value_text, value_numeric, unit, source, source_page, effective_date, notes)
values
  ('DE', 'DE', 'country', 'vat', 'small_business_exemption',
   'EUR 25,000 total turnover in the prior year and EUR 100,000 in the current year (net)',
   25000, 'EUR', '§ 19 UStG as amended by the Annual Tax Act 2024', null, date '2025-01-01',
   'No VAT is charged and no input VAT can be deducted. Exceeding EUR 100,000 in the current year ends the exemption from the transaction that exceeds it. The exemption can be waived; the waiver binds for five calendar years. Businesses from other EU states only via the EU SME scheme (§ 19a UStG, EU-wide turnover up to EUR 100,000).'),
  ('AT', 'AT', 'country', 'vat', 'small_business_exemption',
   'EUR 55,000 gross turnover in the current and in the prior calendar year',
   55000, 'EUR', '§ 6 (1) no. 27 UStG 1994; usp.gv.at', null, date '2025-01-01',
   'Applies automatically to businesses established in Austria; opting for taxation is possible. Exceeding the limit by up to 10% (EUR 60,500) keeps the exemption until year-end; beyond that it ends immediately. Businesses from other EU states only on application via the EU SME scheme.'),
  ('FR', 'FR', 'country', 'vat', 'small_business_exemption',
   'EUR 85,000 for sales of goods and accommodation, EUR 37,500 for services (tolerance thresholds EUR 93,500 and EUR 41,250)',
   null, 'EUR', 'CGI art. 293 B (franchise en base)', null, date '2026-01-01',
   'No VAT is charged and no input VAT can be deducted. A single EUR 25,000 threshold enacted for 2025 was suspended and then abandoned. Businesses from other EU states only via the EU SME scheme.'),
  ('NL', 'NL', 'country', 'vat', 'small_business_exemption',
   'EUR 20,000 annual turnover in the current and in the prior calendar year (KOR)',
   20000, 'EUR', 'Wet OB 1968, kleineondernemersregeling; Belastingdienst', null, date '2025-01-01',
   'Only after registering for the scheme with the Belastingdienst (opt-in). No VAT is charged and no input VAT can be deducted. The scheme ends with the invoice that takes turnover above EUR 20,000. Since 2025 there is no minimum participation period. Businesses from other EU states only via the EU SME scheme.'),
  ('IT', 'IT', 'country', 'vat', 'small_business_exemption',
   'EUR 85,000 revenue under the flat-rate regime (regime forfettario), which includes a VAT exemption',
   85000, 'EUR', 'L. 190/2014, art. 1 c. 54-89; Agenzia delle Entrate', null, date '2026-01-01',
   'An income-tax regime for individuals with further eligibility conditions (for example a cap on employment income); the VAT exemption applies only to those who qualify. Between EUR 85,000 and EUR 100,000 the regime ends from the following year; above EUR 100,000 it ends immediately. Businesses from other EU states only via the EU SME scheme.'),
  ('ES', 'ES', 'country', 'vat', 'small_business_exemption',
   'None - Spain does not apply a small-business VAT exemption',
   0, 'EUR', 'AEAT; European Commission infringement INFR(2025)0047', null, date '2026-10-24',
   'Spain has not transposed Directive (EU) 2020/285; the Commission referred Spain to the Court of Justice in March 2026. Special schemes such as the equivalence surcharge are not an exemption.')
on conflict (jurisdiction_code, domain, fact_key) do update set
  value_text = excluded.value_text,
  value_numeric = excluded.value_numeric,
  unit = excluded.unit,
  source = excluded.source,
  source_page = excluded.source_page,
  effective_date = excluded.effective_date,
  notes = excluded.notes;

-- AT und FR: die Befreiung steht jetzt im eigenen Schlüssel. Die
-- Registrierungsschwelle verweist nur noch darauf, statt sie als Schwelle
-- auszugeben (FR wurde sonst auf einen deutschen Händler angewendet).
update public.jurisdiction_facts
   set value_text = 'None (small businesses: see small-business VAT exemption)',
       value_numeric = 0,
       notes = null
 where jurisdiction_code in ('AT', 'FR')
   and domain = 'vat'
   and fact_key = 'registration_threshold_established';
