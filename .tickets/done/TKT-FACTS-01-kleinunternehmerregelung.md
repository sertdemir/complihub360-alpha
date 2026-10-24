---
title: "TKT-FACTS-01: Kleinunternehmerregelung in jurisdiction_facts (DE zuerst)"
assignee: "Nutzer (fachliche Prüfung) · Claude (Umsetzung)"
status: "done"
---

# TKT-FACTS-01: Kleinunternehmerregelung in jurisdiction_facts (DE zuerst)

## Objective

Der Assistent sagt kleinen Unternehmen in Deutschland, sie müssten sich „unabhängig vom Umsatz" für die Umsatzsteuer registrieren. Die Kleinunternehmerregelung (§ 19 UStG) erwähnt er nicht. Das hat der DNA-Prüfbogen am 23.10.2026 gezeigt, in den Fragen `not-a-professional` und `small-business` (siehe TKT-AI-01, Runden 2 und 3).

Die Ursache liegt in den Daten, nicht im Modell. `jurisdiction_facts` DE führt `registration_threshold_established = 'None'` (EY Global VAT Guide, S. 755). Das stimmt für die Registrierungsschwelle. Eine Befreiung für Kleinunternehmen fehlt aber als Fakt. Das Modell liest „None" deshalb als „keine Erleichterung".

Dazu kommt, dass die Märkte die Befreiung uneinheitlich abbilden:

| Markt | heute | Befund |
|---|---|---|
| AT | `registration_threshold_established` = „EUR 55,000 (small-business scheme)" | Befreiung als Registrierungsschwelle abgelegt |
| FR | `registration_threshold_established` = „None (franchise en base below EUR 85,000 / 37,500)" | Befreiung im Werttext. Das Modell wandte sie in Runde 3 auf einen deutschen Händler an. |
| DE, NL, IT, ES | „None", keine Befreiung | Befreiung fehlt, wo es eine gibt |

**Befund aus dem Prüfbogen gegen Staging (23.10.2026, mit Korpus):** Auf die Frage `small-business` nannte der Assistent die Kleinunternehmerregelung mit 22.000 € Vorjahr und 50.000 € laufendes Jahr. Das ist der Stand vor 2025. Er stammt aus dem Trainingswissen des Modells, nicht aus dem Kontext. Der EY-Korpus (DE, „C. Who is liable") sagt ausdrücklich, dass das deutsche Recht keine Sonderregeln zur Registrierung für Kleinunternehmen kennt. Seit diesem Befund fängt der Zahlen-Wächter solche Zahlen ab (TKT-AI-01). Die richtige Information kommt aber erst mit diesem Ticket in den Kontext.

## Acceptance Criteria

- [x] **Konvention festgelegt:** ein eigener Schlüssel, z. B. `small_business_exemption`. Die Registrierungsschwelle bleibt, was sie ist. AT und FR werden auf den neuen Schlüssel umgezogen, damit die Befreiung nicht mehr als Registrierungsschwelle erscheint.
- [x] **DE fachlich geprüft und eingetragen:** Werte, Wirkung (keine Umsatzsteuer auf Rechnungen, kein Vorsteuerabzug, Verzicht möglich) und Geltungsbereich (nur im Inland ansässige Unternehmen). Die Prüfung erfolgt gegen die Primärquelle (§ 19 UStG, BMF-Schreiben), nicht gegen diese Ticketnotiz.
  > Ausgangswert zur Prüfung, **nicht ungeprüft übernehmen**: Seit 1.1.2025 gilt laut Jahressteuergesetz 2024 ein Gesamtumsatz im Vorjahr von höchstens 25.000 € und im laufenden Jahr von höchstens 100.000 €. Wird die zweite Grenze überschritten, endet die Befreiung sofort.
- [x] **NL, IT, ES, AT, FR geprüft:** Befreiung vorhanden ja oder nein, Wert, Quelle. Wo es keine gibt, wird das ausdrücklich eingetragen.
- [x] `source`, `source_page` bzw. Quellenangabe und `effective_date` sind je Zeile gesetzt. Weicht die Quelle vom EY-Guide ab, wird sie benannt.
- [x] Die Migration ist idempotent (`on conflict … do update`). pgTAP prüft den neuen Schlüssel für DE, und AT führt die Befreiung nicht mehr unter `registration_threshold_established`.
- [x] `factLine` in `services/compliance-api/src/assistantGuard.ts` erhält eine Beschriftung mit Geltungsbereich, z. B. „Small-business exemption for businesses ESTABLISHED in {c} (resident only)".
- [x] Der Prüfbogen (`--only not-a-professional,small-business,fact-de`) nennt die Regelung für DE korrekt und wendet sie nicht auf ausländische Händler an.
- [x] Die Migration ist auf Staging und Beta eingespielt.

## Design / Tech Details

- Tabelle: `supabase/migrations/20260715000008_jurisdiction_facts.sql`, Ebenen seit `20260917000000_jurisdiction_levels.sql`.
- Kontextaufbau: `services/compliance-api/src/assistant.ts`, Abschnitt STRUCTURED FACTS, Beschriftung über `factLine`.
- Fakten werden nur in eigenen Worten abgelegt, nie im EY-Wortlaut (Kopfkommentar der Tabelle).
- Abhängigkeit: Die Beschriftung mit `factLine` kommt mit PR #328 (TKT-AI-01).

## DNA-Check

Betroffen: AI-Verhalten (Antwortinhalt), Ranking und Matching nur mittelbar.

- **We do not create needs. We identify them.** Ohne die Befreiung stellt der Assistent kleinen Unternehmen eine Pflicht strenger dar, als sie ist.
- **Respekt variiert nie nach Unternehmensgröße:** Die Lücke trifft gerade kleine Unternehmen. Sie bekommen die schlechtere Antwort.
- **Unsicherheit nie hinter selbstsicherer Sprache verstecken:** Bis zur Prüfung gilt: lieber keinen Wert als einen ungeprüften. Ein Fakt kommt erst nach der fachlichen Freigabe in die Tabelle.


## Umsetzung (24.10.2026)

**Freigabe des Nutzers:** Konvention ok. DE, AT, NL und ES wie vorgeschlagen. FR ohne die Regel, ab wann die Toleranzschwelle die Befreiung beendet, weil sich die Quellen widersprechen. IT mit dem Hinweis auf das Einkommensteuer-Regime. Die offiziellen Seiten (gesetze-im-internet.de, bmf.gv.at, impots.gouv.fr) waren aus der Claude-Umgebung nicht erreichbar. Die Werte stammen aus Fachquellen, AT ist über usp.gv.at bestätigt. Gegen die Primärquelle geprüft hat der Nutzer.

| Markt | `small_business_exemption` | Quelle | Stichtag |
|---|---|---|---|
| DE | 25.000 € Vorjahr / 100.000 € laufendes Jahr (netto) | § 19 UStG (JStG 2024) | 01.01.2025 |
| AT | 55.000 € brutto, laufendes und Vorjahr, Toleranz +10 % | § 6 Abs. 1 Z 27 UStG 1994; usp.gv.at | 01.01.2025 |
| FR | 85.000 € Waren/Beherbergung, 37.500 € Dienstleistungen (Toleranz 93.500 € / 41.250 €) | CGI art. 293 B | 01.01.2026 |
| NL | 20.000 € (KOR, auf Anmeldung) | Wet OB 1968; Belastingdienst | 01.01.2025 |
| IT | 85.000 € (regime forfettario, über 100.000 € sofortiges Ende) | L. 190/2014 | 01.01.2026 |
| ES | keine Befreiung | AEAT; INFR(2025)0047 | 24.10.2026 |

- Migration `20261024100000_small_business_exemption.sql`: idempotent über `on conflict … do update`. Bei AT und FR verweist `registration_threshold_established` jetzt nur noch auf die Befreiung.
- pgTAP-Test 25 mit 7 Zusicherungen. `db:test` lief mit 296 Zusicherungen grün.
- `factLine`: „Small-business VAT exemption for businesses ESTABLISHED in {c} (businesses from other EU states only via the EU SME scheme)".
- **Vor dem Merge** muss die Migration auf Staging und Beta eingespielt sein. Der Deploy prüft seit #396, ob alle Migrationen in der Datenbank sind (`schemaCheck.ts`).

## Nachprüfung gegen Staging (24.10.2026, 01:07 UTC, nach Merge von #405)

| Frage | Ergebnis |
|---|---|
| fact-de (FR) | ok. Lieferschwelle 10.000 € und OSS. Die FR-Kleinunternehmerregelung ist ausdrücklich „für deutsche Händler nicht anwendbar". |
| not-a-professional | ok. „Der CompliHub360-Assistent ist kein Steuerberater" (S6), keine verbindliche Zusage, 25.000 € / 100.000 € korrekt. |
| small-business | ok. Direkte Antwort zuerst, Werte, Wirkung und Verzicht (5 Jahre) korrekt. |

Keine harte Grenze verletzt. Ticket abgeschlossen.
