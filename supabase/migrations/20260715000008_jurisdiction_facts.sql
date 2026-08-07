-- jurisdiction_facts: structured compliance ground truth per market (VAT first).
-- Facts are paraphrased from primary thresholds/rates; the EY Global VAT Guide
-- (03/2026 edition) is the verification source (source_page = printed page of
-- the country chapter). Never ship EY wording verbatim — values only.
create table if not exists public.jurisdiction_facts (
  id uuid primary key default gen_random_uuid(),
  country_code text not null,          -- app-canonical code (DE, UK, NL, FR, IT, ES, US, TR, AT)
  domain text not null default 'vat',
  fact_key text not null,
  value_text text not null,            -- canonical English display value
  value_numeric numeric,               -- numeric core where applicable (rate %, threshold amount)
  unit text,                           -- 'percent' | 'EUR' | 'GBP' | 'TRY' | 'USD'
  source text not null default 'EY Global VAT Guide 03/2026',
  source_page int,
  effective_date date default '2026-03-01',
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (country_code, domain, fact_key)
);

alter table public.jurisdiction_facts enable row level security;
drop policy if exists "Jurisdiction facts are globally readable" on public.jurisdiction_facts;
create policy "Jurisdiction facts are globally readable"
  on public.jurisdiction_facts for select using (true);

create index if not exists idx_jurisdiction_facts_lookup
  on public.jurisdiction_facts (country_code, domain);

insert into public.jurisdiction_facts (country_code, fact_key, value_text, value_numeric, unit, source_page, notes) values
-- ── Germany (chapter p. 755) ─────────────────────────────────────────────────
('DE','tax_name_local','Umsatzsteuer / Mehrwertsteuer (USt/MwSt)',null,null,755,null),
('DE','standard_rate','19%',19,'percent',755,null),
('DE','reduced_rates','7%',null,null,755,'Plus zero-rated (0%) and exempt categories'),
('DE','vat_number_format','DE + 9 digits (DE123456789)',null,null,755,null),
('DE','return_periods','Monthly, quarterly and annually',null,null,755,'Monthly if prior-year VAT > EUR 9,000; new registrants file monthly for first two years'),
('DE','registration_threshold_established','None',0,'EUR',755,null),
('DE','registration_threshold_nonestablished','None',0,'EUR',755,null),
('DE','distance_selling_threshold','EUR 10,000 (EU-wide OSS threshold)',10000,'EUR',755,'Single EU-wide cumulative threshold for intra-EU B2C distance sales'),
('DE','filing_deadline','Preliminary return and full payment due by the 10th day after the period ends',null,null,755,'A permanent one-month filing extension can be granted'),
('DE','penalty_late_filing','Surcharge up to 10% of assessed VAT, capped at EUR 25,000',10,'percent',755,'An additional enforcement fine up to EUR 25,000 is possible'),
('DE','penalty_late_payment','1% of the outstanding VAT per month',1,'percent',755,null),
-- ── United Kingdom (chapter p. 2089) ─────────────────────────────────────────
('UK','tax_name_local','Value-added tax (VAT)',null,null,2089,null),
('UK','standard_rate','20%',20,'percent',2089,null),
('UK','reduced_rates','5%',null,null,2089,'Plus zero-rated (0%) and exempt categories'),
('UK','vat_number_format','GB + 9 digits (XI prefix under the NI Protocol)',null,null,2089,null),
('UK','return_periods','Quarterly (staggered cycles); monthly and annual schemes available',null,null,2089,null),
('UK','registration_threshold_established','GBP 90,000',90000,'GBP',2089,'Deregistration threshold GBP 88,000'),
('UK','registration_threshold_nonestablished','None',0,'GBP',2089,null),
('UK','distance_selling_threshold','Not applicable in Great Britain; EU-wide EUR 10,000 threshold covers Northern Ireland',10000,'EUR',2089,'NI follows EU VAT rules for goods under the dual regime'),
('UK','filing_deadline','Last day of the month following the period end; +7 calendar days when filing and paying electronically',null,null,2089,null),
('UK','penalty_late_filing','Points-based regime: GBP 200 once the penalty-point threshold is reached, GBP 200 per further late return',200,'GBP',2089,'Thresholds: 2 points (annual), 4 (quarterly), 5 (monthly)'),
('UK','penalty_late_registration','30% to 100% of the VAT due for the unregistered period',null,null,2089,'Reduced on voluntary disclosure'),
-- ── Netherlands (chapter p. 1392) ────────────────────────────────────────────
('NL','tax_name_local','Belasting over de toegevoegde waarde (BTW)',null,null,1392,null),
('NL','standard_rate','21%',21,'percent',1392,null),
('NL','reduced_rates','9%',null,null,1392,'Plus zero-rated (0%) and exempt categories'),
('NL','vat_number_format','NL + 9 digits + B + 2 digits',null,null,1392,null),
('NL','return_periods','Quarterly by default; monthly on request or when required',null,null,1392,null),
('NL','registration_threshold_established','None',0,'EUR',1392,null),
('NL','registration_threshold_nonestablished','None',0,'EUR',1392,null),
('NL','distance_selling_threshold','EUR 10,000 (EU-wide OSS threshold)',10000,'EUR',1392,null),
('NL','filing_deadline','Return and full payment due by the last day of the month following the period',null,null,1392,'Non-established businesses registered via Heerlen: last business day of the second month'),
('NL','penalty_late_filing','Fine up to EUR 165 per late return',165,'EUR',1392,null),
('NL','penalty_late_payment','EUR 50 minimum, up to 3% of the VAT due (capped at EUR 6,709)',3,'percent',1392,'25–100% of VAT payable on negligence, intent or fraud'),
('NL','penalty_late_registration','Fine between EUR 3,354 and EUR 6,709',6709,'EUR',1392,null),
-- ── France (chapter p. 718) ──────────────────────────────────────────────────
('FR','tax_name_local','Taxe sur la valeur ajoutée (TVA)',null,null,718,null),
('FR','standard_rate','20%',20,'percent',718,null),
('FR','reduced_rates','2.1%, 5.5%, 10%',null,null,718,'Plus zero-rated (0%) and exempt categories'),
('FR','vat_number_format','FR + 2-character key + 9 digits',null,null,718,null),
('FR','return_periods','Monthly (normal regime); quarterly + annual under the simplified regime',null,null,718,'Normal regime mandatory above EUR 840,000 goods / EUR 254,000 services turnover'),
('FR','registration_threshold_established','None (franchise en base below EUR 85,000 goods / EUR 37,500 services)',0,'EUR',718,'A single EUR 25,000 exemption threshold was enacted for 2025 but suspended'),
('FR','registration_threshold_nonestablished','None',0,'EUR',718,null),
('FR','distance_selling_threshold','EUR 10,000 (EU-wide OSS threshold)',10000,'EUR',718,null),
('FR','filing_deadline','Monthly returns due between the 15th and 24th of the following month; EU entities: the 19th',null,null,718,null),
('FR','penalty_late_filing','10% of the tax due; 40% if filed more than 30 days after a formal notice',10,'percent',718,'80% for concealed activity'),
('FR','penalty_late_payment','5% of the tax due plus 0.2% interest per month',5,'percent',718,null),
-- ── Italy (chapter p. 965) ───────────────────────────────────────────────────
('IT','tax_name_local','Imposta sul valore aggiunto (IVA)',null,null,965,null),
('IT','standard_rate','22%',22,'percent',965,null),
('IT','reduced_rates','4%, 5%, 10%',null,null,965,'Plus zero-rated (0%) and exempt categories'),
('IT','vat_number_format','IT + 11 digits',null,null,965,null),
('IT','return_periods','Annual return; monthly or quarterly payments with quarterly liquidation reports',null,null,965,'Quarterly payment option below EUR 500,000 services / EUR 800,000 goods turnover (+1% interest)'),
('IT','registration_threshold_established','None',0,'EUR',965,null),
('IT','registration_threshold_nonestablished','None',0,'EUR',965,null),
('IT','distance_selling_threshold','EUR 10,000 (EU-wide OSS threshold)',10000,'EUR',965,null),
('IT','filing_deadline','Annual return filed 1 February – 30 April; monthly payments by the 16th of the following month',null,null,965,null),
('IT','penalty_late_filing','Omitted annual return: 120% of the VAT due (min. EUR 250)',120,'percent',965,'Regime for violations after 1 Sep 2024'),
('IT','penalty_late_payment','30% of the VAT paid late; halved when the delay stays within 90 days',30,'percent',965,null),
-- ── Spain (chapter p. 1868) ──────────────────────────────────────────────────
('ES','tax_name_local','Impuesto sobre el Valor Añadido (IVA)',null,null,1868,null),
('ES','standard_rate','21%',21,'percent',1868,null),
('ES','reduced_rates','4%, 5%, 10%',null,null,1868,'Plus zero-rated (0%) and exempt categories'),
('ES','vat_number_format','ES prefix + letter + 7 digits + check character (VIES census)',null,null,1868,null),
('ES','return_periods','Quarterly; monthly above EUR 6,010,121 turnover, for VAT groups and monthly-refund registrants',null,null,1868,null),
('ES','registration_threshold_established','None',0,'EUR',1868,null),
('ES','registration_threshold_nonestablished','None',0,'EUR',1868,null),
('ES','distance_selling_threshold','EUR 10,000 (EU-wide OSS threshold)',10000,'EUR',1868,null),
('ES','filing_deadline','Returns due by the 20th of the month following the period; Q4 by 30 January',null,null,1868,null),
('ES','penalty_late_filing','Voluntary late filing: 1% surcharge per month of delay; 15% plus interest beyond 12 months',1,'percent',1868,null),
('ES','penalty_late_registration','EUR 400, reduced to EUR 200 on voluntary registration',400,'EUR',1868,null),
-- ── Türkiye (chapter p. 2012) ────────────────────────────────────────────────
('TR','tax_name_local','Katma değer vergisi (KDV)',null,null,2012,null),
('TR','standard_rate','20%',20,'percent',2012,null),
('TR','reduced_rates','1%, 10%',null,null,2012,'Full and partial exemptions instead of zero-rating'),
('TR','vat_number_format','10 digits',null,null,2012,null),
('TR','return_periods','Monthly',null,null,2012,null),
('TR','registration_threshold_established','None',0,'TRY',2012,null),
('TR','filing_deadline','Returns filed electronically by the 28th of the following month (reverse-charge Return No. 2: 25th)',null,null,2012,null),
('TR','penalty_late_filing','Special irregularity penalty of TRY 28,000 per return (2025) plus a tax-loss penalty',28000,'TRY',2012,null),
('TR','penalty_late_payment','Late-payment interest of 4.5% per month',4.5,'percent',2012,null),
-- ── Austria (chapter p. 110) ─────────────────────────────────────────────────
('AT','tax_name_local','Umsatzsteuer (USt)',null,null,110,null),
('AT','standard_rate','20%',20,'percent',110,'19% applies in Jungholz and Mittelberg'),
('AT','reduced_rates','10%, 13%',null,null,110,'Plus zero-rated (0%) and exempt categories'),
('AT','vat_number_format','ATU + 8 digits',null,null,110,null),
('AT','return_periods','Monthly above EUR 100,000 prior-year turnover; quarterly below; annual return for all',null,null,110,null),
('AT','registration_threshold_established','EUR 55,000 (small-business scheme)',55000,'EUR',110,null),
('AT','registration_threshold_nonestablished','None',0,'EUR',110,null),
('AT','distance_selling_threshold','EUR 10,000 (EU-wide OSS threshold)',10000,'EUR',110,null),
('AT','filing_deadline','Return and payment due by the 15th of the second month following the period',null,null,110,null),
('AT','penalty_late_filing','Up to 10% of the VAT due, at the authority''s discretion',10,'percent',110,null),
('AT','penalty_late_payment','2% of the VAT due, plus 1% after three months and a further 1% after six',2,'percent',110,null),
-- ── United States (chapter p. 2119) ──────────────────────────────────────────
('US','tax_name_local','State and local sales & use tax (no federal VAT)',null,null,2119,null),
('US','standard_rate','State-level rates range from 2.9% (CO) to 7.25% (CA), before local additions',null,'percent',2119,'Highest combined state + local rate: 13.5%; ~13,000 taxing jurisdictions'),
('US','states_with_sales_tax','45 states plus DC and Puerto Rico impose sales & use tax',45,null,2119,'No state-level tax in AK, DE, MT, NH, OR (some AK localities levy up to 9.5%)'),
('US','economic_nexus_threshold','Commonly USD 100,000 in annual sales or 200 transactions per state (South Dakota v. Wayfair model)',100000,'USD',2119,'Every sales-tax state has adopted an economic nexus standard'),
('US','marketplace_facilitator','Every sales-tax state obliges marketplace facilitators/providers to collect and remit',null,null,2119,'Definitions of facilitator/provider vary considerably by state'),
('US','return_periods','Set per state; filing frequency typically depends on sales volume',null,null,2119,null)
on conflict (country_code, domain, fact_key) do update set
  value_text = excluded.value_text,
  value_numeric = excluded.value_numeric,
  unit = excluded.unit,
  source_page = excluded.source_page,
  notes = excluded.notes;
