-- ─── Zwei veraltete Saetze, belegt gegen die amtliche Quelle ─────────────────
--
-- Befund aus dem ersten Live-Lauf von scripts/tedb-vat-rates.mjs gegen die
-- Taxes in Europe Database (DG TAXUD) am 17.09.2026, 333 Satz-Eintraege fuer
-- sechs Laender. Alle Regelsaetze deckungsgleich mit unserem Stand; bei den
-- ermaessigten Saetzen zwei echte Abweichungen:
--
--   ES  wir: 4 %, 5 %, 10 %   TEDB: 4 %, 10 %
--       Die 5 % waren der befristete Krisensatz auf Energie und Lebensmittel.
--       Er ist ausgelaufen; TEDB fuehrt ihn nicht mehr.
--
--   AT  wir: 10 %, 13 %       TEDB: 4,9 %, 10 %, 13 %
--       Neuer Satz von 4,9 % seit dem 01.07.2026 auf die Lebensmittel nach
--       Anlage 3 zu §10 oeUStG 1994 (so der Kommentar im TEDB-Eintrag). Der
--       ermaessigte Satz von 10 % gilt fuer die dort genannten KN-Positionen
--       0703 1011, 0709 5400, 0709 5500 und 0709 5600 weiter.
--
-- Beide Werte stammten aus dem EY Global VAT Guide, Ausgabe 03/2026. Der Guide
-- ist eine Momentaufnahme, TEDB laeuft mit — das ist der Grund fuer den
-- Quellenwechsel, nicht die Lizenzfrage.
--
-- Der territoriale Sondersatz von 19 % (Jungholz, Mittelberg) bleibt bewusst
-- aussen vor: er gehoert auf die region-Ebene aus 20260917000000 und nicht in
-- die Liste der ermaessigten Saetze des Landes. Dasselbe gilt fuer Korsika und
-- die franzoesischen Ueberseedepartements.
--
-- `effective_date` traegt fuer AT das belegte Datum. Fuer ES setze ich den Tag
-- des Abrufs, nicht ein Auslaufdatum: TEDB nennt keins, und ein erfundenes
-- waere schlechter als ein ehrliches "so gesehen am".

update public.jurisdiction_facts
   set value_text     = '4%, 10%',
       source         = 'TEDB (DG TAXUD), abgerufen 2026-09-17',
       source_page    = null,
       effective_date = date '2026-09-17',
       notes          = 'Plus zero-rated (0%) and exempt categories. Der befristete Satz von 5 % (Energie, Lebensmittel) ist ausgelaufen und wird von TEDB nicht mehr gefuehrt.'
 where jurisdiction_code = 'ES'
   and domain   = 'vat'
   and fact_key = 'reduced_rates';

update public.jurisdiction_facts
   set value_text     = '4.9%, 10%, 13%',
       source         = 'TEDB (DG TAXUD), abgerufen 2026-09-17',
       source_page    = null,
       effective_date = date '2026-07-01',
       notes          = 'Plus zero-rated (0%) and exempt categories. 4,9 % seit 01.07.2026 auf die Lebensmittel nach Anlage 3 zu §10 oeUStG 1994; fuer die KN-Positionen 0703 1011, 0709 5400, 0709 5500 und 0709 5600 gelten weiter 10 %. Territorial abweichend: 19 % in Jungholz und Mittelberg (region-Ebene).'
 where jurisdiction_code = 'AT'
   and domain   = 'vat'
   and fact_key = 'reduced_rates';
