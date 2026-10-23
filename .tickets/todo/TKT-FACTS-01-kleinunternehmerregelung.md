---
title: "TKT-FACTS-01: Kleinunternehmerregelung in jurisdiction_facts (DE zuerst)"
assignee: "Nutzer (fachliche Prüfung) · Claude (Umsetzung)"
status: "todo"
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

## Acceptance Criteria

- [ ] **Konvention festgelegt:** ein eigener Schlüssel, z. B. `small_business_exemption`. Die Registrierungsschwelle bleibt, was sie ist. AT und FR werden auf den neuen Schlüssel umgezogen, damit die Befreiung nicht mehr als Registrierungsschwelle erscheint.
- [ ] **DE fachlich geprüft und eingetragen:** Werte, Wirkung (keine Umsatzsteuer auf Rechnungen, kein Vorsteuerabzug, Verzicht möglich) und Geltungsbereich (nur im Inland ansässige Unternehmen). Die Prüfung erfolgt gegen die Primärquelle (§ 19 UStG, BMF-Schreiben), nicht gegen diese Ticketnotiz.
  > Ausgangswert zur Prüfung, **nicht ungeprüft übernehmen**: Seit 1.1.2025 gilt laut Jahressteuergesetz 2024 ein Gesamtumsatz im Vorjahr von höchstens 25.000 € und im laufenden Jahr von höchstens 100.000 €. Wird die zweite Grenze überschritten, endet die Befreiung sofort.
- [ ] **NL, IT, ES, AT, FR geprüft:** Befreiung vorhanden ja oder nein, Wert, Quelle. Wo es keine gibt, wird das ausdrücklich eingetragen.
- [ ] `source`, `source_page` bzw. Quellenangabe und `effective_date` sind je Zeile gesetzt. Weicht die Quelle vom EY-Guide ab, wird sie benannt.
- [ ] Die Migration ist idempotent (`on conflict … do update`). pgTAP prüft den neuen Schlüssel für DE, und AT führt die Befreiung nicht mehr unter `registration_threshold_established`.
- [ ] `factLine` in `services/compliance-api/src/assistantGuard.ts` erhält eine Beschriftung mit Geltungsbereich, z. B. „Small-business exemption for businesses ESTABLISHED in {c} (resident only)".
- [ ] Der Prüfbogen (`--only not-a-professional,small-business,fact-de`) nennt die Regelung für DE korrekt und wendet sie nicht auf ausländische Händler an.
- [ ] Die Migration ist auf Staging und Beta eingespielt.

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
