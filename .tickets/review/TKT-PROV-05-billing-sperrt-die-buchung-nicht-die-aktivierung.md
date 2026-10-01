---
title: "Billing sperrt die Buchung, nicht die Aktivierung — das Gate meldet statt zu sperren"
assignee: "Claude"
status: "review"
---

# Billing sperrt die Buchung, nicht die Aktivierung

Nachlauf zu TKT-PROV-04. Dort stand der Befund schon im Code-Kommentar; hier
ist er abgestellt.

## Der Befund war größer als gedacht

`activationGate` zählte `billing_ready` zu den Bedingungen. Beim Nachsehen kam
dreierlei zusammen:

**1. Es widerspricht dem Spec.** §21.1 heißt „Billing readiness gate", und alle
sechs Zeilen darunter lauten „Block **chargeable booking eligibility** when:
…". Sie sperren die gebührenpflichtige Buchung, nicht den Status. Im ganzen
Dokument steht `must block` genau einmal — für die Aktivierung, und dort
bezogen auf „all mandatory requirements applicable to that provider type,
service category and jurisdiction".

**2. Das Datenmodell wusste es längst besser.** Der Kommentar an
`matchable_provider_services` (`20260920000000`) sagt wörtlich:

> `billing_ready` ist absichtlich **KEIN** Filter — sonst entschiede der
> Zahlungsstatus über die Sichtbarkeit, was §14 verbietet.

Und weiter: „Wer die Abrechnung ins Matching zieht, baut genau das, was §14
verbietet." Der View filtert über `lifecycle_status IN ('active','limited')`.
Billing im Aktivierungs-Gate hieß damit genau das, wovor der Kommentar warnt:
der Zahlungsstatus entschied über die Sichtbarkeit — nur einen Schritt früher,
über den Status statt über den View.

**3. Das Gate konnte nie aufgehen.** `billing_ready` hat `DEFAULT false` und
**keinen Schreiber**. Im ganzen Repository gibt es nur Lesezugriffe sowie
Test- und Mock-Fixtures; die Migration führt es selbst als offenen Punkt
(„4. Billing-Gate (§21.1) befuellen: heute setzt niemand `billing_ready`").
Auf Staging gegengeprüft: 4 Anbieter, **0** mit `billing_ready`, **0** buchbare
Zeilen im View. Eine Bedingung, die niemand erfüllen kann, sperrte die
Aktivierung für jeden Anbieter.

## Was sich ändert

| | vorher | jetzt |
|---|---|---|
| `missing` | enthielt `billing.not_ready` + jeden Grund | kein `billing.*` |
| `GateVerdict` | — | `billing: { ready, blocks_chargeable_booking[] }` |
| Buchung | 409 `BILLING_NOT_READY` an `/scheduling` | **unverändert** |

Die Sperre verschwindet nicht, sie steht schon an der richtigen Stelle:
`POST /scheduling` prüft `bookable_chargeable` und antwortet 409
`BILLING_NOT_READY`. Das war seit Phase 3 so und ist getestet.

In der Gate-Leiste steht die Lage jetzt als Information unter den Bedingungen:
„Not chargeable for bookings yet — no payment method. This does not block
activation …". Der Reviewer sieht es, scheitert aber nicht daran.

## Acceptance Criteria

- [x] `verificationRules.ts`: `billing_ready` und `billing_block_reasons`
  sperren nicht mehr; `GateVerdict.billing` meldet sie. Doku-Kommentar trägt
  die Begründung samt der Stelle im Datenmodell.
- [x] `AdminProviderReviewPage.tsx`: `billing.not_ready` aus `GATE_ITEMS`, die
  Gründe als eigene Info-Zeile. Der Aktivieren-Knopf hängt nicht mehr daran.
- [x] `vite-plugin-mock-api.ts`: `p2Gate()` liefert `billing` mit — ohne das
  hätte die Gate-Leiste lokal ins Leere gegriffen (`gate.billing.ready`).
- [x] `openapi.yaml`: die Gate-Antwort nennt `billing` und warum es nicht sperrt.
- [x] Tests: 4 neue (Gate öffnet ohne Billing und meldet; kein `billing.*` bei
  irgendeinem Grund; leere Meldung bei Bereitschaft; **das Kontingent sperrt
  weiter**), 2 Integrationstests umgestellt. Gegenprobe: Sperre
  zurückgesetzt → 4 Tests fallen.
- [x] `build`, `typecheck`, UI-`tsc`, `i18n:check`, `terminology:check` grün;
  271 API-, 250 UI-Tests, 139 DB-Checks.

Keine Migration. Die Spalte bleibt, ihre Bedeutung wird nur nicht mehr
überdehnt.

## DNA-Check

Betroffen: Provider-Policies (Freigabe, Gate), Ranking und Matching
(Sichtbarkeit), Monetarisierung (Zahlungsstatus als Zugangsbedingung).

- **Fairness zwischen Providern:** Das ist der Kern. Vorher entschied die
  Zahlungsbereitschaft mit darüber, wer überhaupt erscheint — über den
  Lebenszyklus, den der View filtert. Jetzt entscheiden Nachweise, Freigaben
  und Annahmen; die Abrechnung entscheidet nur, ob eine Buchung Geld kostet.
- **Derselbe Respekt unabhängig von der Größe:** Ein kleiner Anbieter, dessen
  Zahlungsdaten noch nicht stehen, war vorher unsichtbar — nicht wegen seiner
  Qualifikation, sondern wegen eines Flags. Dass niemand das Flag setzt, traf
  alle gleich; sobald es jemand setzt, hätte es die Kleinen zuerst getroffen.
- **Würden wir es auch ohne Transaktion so bauen:** Nein — und genau das ist
  der Test, den die alte Reihenfolge nicht bestand. Ohne kommerzielles
  Interesse hätte niemand die Zahlungsbereitschaft vor die Sichtbarkeit
  gestellt.
- **Echte Bedürfnisse des Users zuerst:** Der User sucht einen passenden
  Anbieter. Einen geprüften und freigegebenen Anbieter zu verbergen, weil
  dessen Abrechnung nicht steht, dient uns, nicht ihm.
- **Stärkt es Vertrauen, statt es auszugeben:** Es macht nachprüfbar, dass
  Geld bei uns nicht über Sichtbarkeit entscheidet — die Zusage aus §14, jetzt
  auch im Gate.

Nicht betroffen und deshalb nicht abgehakt: Dringlichkeitssprache, Zugang zum
Menschen, AI-Verhalten, Angst als Mittel.

## Offen — und zwar das Wichtigere

**`billing_ready` hat keinen Schreiber.** Diese Änderung belebt das Gate, aber
sie macht niemanden buchbar: solange nichts das Flag setzt, ist
`bookable_chargeable` für jeden Anbieter `false`, und **jeder** Buchungsversuch
endet in 409 `BILLING_NOT_READY`. Das ist der offene Punkt 4 der Migration vom
20.09. und das größere Problem.

Es zu bauen heißt entscheiden, woraus sich die Bereitschaft ergibt — aktives
Abo, hinterlegte Zahlungsmethode, Mandatsstatus, offene Rechnung samt
Kulanzfrist, Kontosperre. §21.1 nennt die sechs Fälle; welche davon in welcher
Form greifen, ist eine kommerzielle Entscheidung und gehört dem Nutzer, nicht
mir. Danach wäre `billing_ready` besser abgeleitet als gespeichert — ein
gespeichertes Flag veraltet still, genau wie es der Kommentar am View für die
Sichtbarkeit begründet.

Zweiter, kleinerer Punkt: `allowanceFor` hielt fest, dass ohne Abo „das Gate
über `billing_ready`" sperrt. Diese Annahme trägt nicht mehr — ein Anbieter
ohne jeden Tarif kann jetzt aktiviert werden. Nach §21.1 ist das richtig
(„Inactive subscription where required" sperrt die Buchung), aber ob ein Konto
ohne Tarif gelistet werden soll, ist eine eigene Frage. Der Kommentar ist
richtiggestellt; die Frage bleibt offen.
