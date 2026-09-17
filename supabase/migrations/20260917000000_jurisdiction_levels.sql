-- ─── Ein Markt ist nicht immer ein Land ──────────────────────────────────────
--
-- `jurisdiction_facts` war auf `country_code` gebaut, weil die ersten neun
-- Maerkte europaeisch waren: in der EU gilt "ein Gesetz, 27 Umsetzungen", und
-- die Umsetzung haengt am Land. Fuer die USA stimmt diese Annahme nicht. Dort
-- gibt es keine Bundesumsatzsteuer und keine Bundesbehoerde dafuer, sondern
-- 45 Bundesstaaten mit eigenen Gesetzen und darunter ueber 11.000 lokale
-- Steuerjurisdiktionen; in Colorado, Alabama, Louisiana und Alaska mit eigenen
-- Saetzen und teils eigenen Schwellen.
--
-- WAS DAS KONKRET ANRICHTET, heutiger Stand der Tabelle:
--
--   ('US','standard_rate','State-level rates range from 2.9% (CO) to 7.25%
--     (CA), before local additions', value_numeric = NULL)
--   ('US','economic_nexus_threshold','Commonly USD 100,000 …', 100000)
--
-- Wo eine Zahl stehen muss, steht ein Absatz ueber Varianz — und die 100.000
-- sind fuer Kalifornien, New York und Texas falsch (dort 500.000). Der
-- Assistent zieht diese Zeilen als "verified ground truth — prefer these for
-- numbers" in seinen Kontext (assistant.ts). Ein Haendler in Kalifornien
-- bekommt damit eine Schwelle, die um den Faktor fuenf danebenliegt.
--
-- ─── Die Aenderung ───────────────────────────────────────────────────────────
--
-- Zwei Spalten, kein Umbau:
--
--   jurisdiction_code   'US' · 'US-CA' · 'US-CA-08031'
--   jurisdiction_level  'country' | 'region' | 'locality'
--
-- Land und Region folgen ISO 3166-1 bzw. 3166-2 — dieselbe Schreibweise, die
-- auch DE-BY oder TR-34 traegt, falls Europa spaeter Regionen braucht. Fuer die
-- lokale Ebene gibt es keinen ISO-Code; dort steht die Kennung der Quelle
-- (FIPS, oder der Jurisdiction Code aus den SST-Boundary-Files).
--
-- `country_code` BLEIBT und traegt weiterhin die Wurzel. Das ist Absicht: jede
-- bestehende Abfrage — allen voran `select('jurisdiction_facts',
-- { country_code })` im Assistenten — funktioniert unveraendert weiter. Die
-- neue Spalte ergaenzt Genauigkeit, sie ersetzt nichts.
--
-- AUFLOESUNG: das Spezifischere gewinnt. Liegt fuer denselben `fact_key` eine
-- Zeile auf 'US' und eine auf 'US-CA' vor, gilt in Kalifornien die zweite. So
-- bleibt der Bundeswert der Normalfall und nur die Abweichung braucht eine
-- eigene Zeile — bei 45 Staaten der Unterschied zwischen 6 und 46 Zeilen.

alter table public.jurisdiction_facts
  add column if not exists jurisdiction_code text,
  add column if not exists jurisdiction_level text not null default 'country';

-- Bestand: neun Laender, alle auf Landesebene.
update public.jurisdiction_facts
   set jurisdiction_code = country_code
 where jurisdiction_code is null;

alter table public.jurisdiction_facts
  alter column jurisdiction_code set not null;

alter table public.jurisdiction_facts
  drop constraint if exists jurisdiction_facts_level_check;
alter table public.jurisdiction_facts
  add constraint jurisdiction_facts_level_check
  check (jurisdiction_level in ('country', 'region', 'locality'));

-- Der Code muss zum Land passen: 'US-CA' gehoert zu 'US', nicht zu 'DE'.
-- Ohne das faende die Aufloesung stillschweigend nichts.
alter table public.jurisdiction_facts
  drop constraint if exists jurisdiction_facts_code_matches_country;
alter table public.jurisdiction_facts
  add constraint jurisdiction_facts_code_matches_country
  check (jurisdiction_code = country_code or jurisdiction_code like country_code || '-%');

-- Die alte Eindeutigkeit haette zwei Zeilen desselben fact_key fuer zwei
-- Staaten verboten — genau das, was wir jetzt brauchen.
alter table public.jurisdiction_facts
  drop constraint if exists jurisdiction_facts_country_code_domain_fact_key_key;
create unique index if not exists jurisdiction_facts_unique_fact
  on public.jurisdiction_facts (jurisdiction_code, domain, fact_key);

create index if not exists idx_jurisdiction_facts_lookup_level
  on public.jurisdiction_facts (country_code, domain, jurisdiction_level);

comment on column public.jurisdiction_facts.jurisdiction_code is
  'ISO 3166-1 fuer Laender, 3166-2 fuer Regionen (US-CA), Quellen-Kennung fuer lokale Ebene. Spezifischeres ueberschreibt allgemeineres.';
comment on column public.jurisdiction_facts.jurisdiction_level is
  'country | region | locality — sagt, auf welcher Ebene der Wert gilt.';

-- ─── Die eine Zeile, die aktiv schadet ───────────────────────────────────────
-- `standard_rate` fuer die USA ist keine Zahl, sondern ein Satz ueber Streuung,
-- und traegt trotzdem unit='percent'. Als "ground truth — prefer these for
-- numbers" im Assistenten ist das schlechter als kein Eintrag: es sieht aus wie
-- ein Wert. Der Schluessel wird umbenannt, damit niemand ihn fuer einen Satz
-- haelt; die Aussage selbst bleibt erhalten, sie ist ja richtig.
update public.jurisdiction_facts
   set fact_key = 'rate_structure_note',
       unit     = null,
       notes    = coalesce(notes, '') ||
                  ' — Kein einheitlicher Satz: der geltende Satz haengt an Staat und Ort. Werte je Staat stehen als region-Zeilen.'
 where country_code = 'US'
   and fact_key = 'standard_rate';

-- Ebenso die Nexus-Schwelle: der Wert stimmt fuer die meisten Staaten, aber er
-- steht hier als waere er allgemeingueltig. Er bleibt als Landes-Vorgabe
-- stehen — die Abweichler bekommen eigene region-Zeilen, sobald sie gegen die
-- jeweilige State DOR geprueft sind (bewusst NICHT aus zweiter Hand befuellt).
update public.jurisdiction_facts
   set notes = coalesce(notes, '') ||
               ' — Landes-Vorgabe. Abweichende Staaten (u. a. CA, NY, TX hoeher) gelten ueber eigene region-Zeilen, sobald gegen die State DOR belegt.'
 where country_code = 'US'
   and fact_key = 'economic_nexus_threshold';
