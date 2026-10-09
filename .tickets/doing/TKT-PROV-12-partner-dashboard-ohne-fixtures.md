---
title: "Partner-Dashboard ohne Fixtures: ehrliche Leer- und Fehlerzustände"
assignee: "Claude"
status: "doing"
---

# Partner-Dashboard ohne Fixtures

Beta-Plan bis 30.10.2026, Freitag 09.10.: Partner-Dashboard ehrlich.

## Objective

`useApiData` zeigt im Partner-Bereich die Design-Fixture, sobald die API nicht
oder **leer** antwortet (`usable()` lässt ein leeres Array nicht gelten;
`fetchPerformanceKpis` gibt bei `total = 0` absichtlich `[]` zurück). Ein
Pilot-Anbieter ohne Buchung sähe erfundene Termine (Acme GmbH, 149 $),
Rechnungen und 87 % Bestätigungsquote. Ziel: Fixtures nur noch in der
Demo-Welt (lokaler Mock, Staging-Demo-Login); echte Konten sehen echte Leere
oder einen ehrlichen Fehlerzustand.

## Entscheidungen des Nutzers (09.10.2026)

- Canvas https://claude.ai/artifact/C37EmNS5SEX1jAsWeSsnfF — Wahl **A2 · B3 · C3 · D1 · E2** („deine Canvas-Empfehlung").
- A2 Laden fehlgeschlagen: Zustand statt Inhalt, Try Again + Contact Support + Referenz-ID; auf /billing je Abschnitt.
- B3 Noch nichts da: leerer Zustand plus Bereitschafts-Liste (Verifizierung, Tarif, Zahlungsmittel) auf Anfragen und Termine; B2 auf Rechnungen und Benachrichtigungen.
- C3 Leistung: „Anfragen bisher" als echte Zahl, Quoten ab **5 Anfragen** (nur Anzeige).
- D1 Abdeckung: lesender Spiegel der Freigabematrix, Änderungen über Leistungen & Länder.
- E2 Profil nicht geladen: Satz am gesperrten Speichern-Knopf.
- Copy abgenommen („copy ok").

## Acceptance Criteria

- [x] Copy `common:states.partner.*` in en/de/es/tr, EN im Copy-Wächter (fünfte Abnahme); Sabotage erkannt
- [ ] Figma: fünf Zustände mit Compass-Komponenten (wartet: Figma-Tools in der Session nicht geladen, 09.10.)
- [ ] `useApiData`: Fixture nur in der Demo-Welt; leere Liste = leer; Fehler = Zustand A2
- [ ] Flächen: Anfragen, Termine, Abrechnung, Tarif, Leistung, Benachrichtigungen, Abdeckung, Settings
- [ ] Entfällt: Beispieldaten-Banner und `?state=` auf /requests, „within 5 days", „✓ verified · no bounces 90d", „Markt hinzufügen", Rang-Banner, erfundene Ranking-Bewegungen und Qualitätsliste
- [ ] Tests je Fläche (leer, Fehler, Daten) mit Gegenproben
- [ ] Lokal mit Screenshots, Review des Nutzers, dann Staging

## Design / Tech Details

- DE folgt dem Produktbegriff „Verifizierung" (Navigation), die Canvas-Copy
  sagte „Verifikation". EN ist wortgleich zur Abnahme.
- D1-Copy sagt „under Services"; der Kapitelname heißt „Services & countries"
  unter Verifizierung. Belassen wie abgenommen.

## DNA-Check

Betroffen: Copy, Provider-Policies, Monetarisierung (Tarif-Hinweis), Ranking (Quoten).

- **Never give false reassurance / Understate:** keine erfundenen Zahlen; „keine Termine" nur, wenn die API das sagt.
- **Trust is proven when something goes wrong:** A2 nennt, was nicht passiert ist, und hält den Weg zum Menschen offen.
- **Fairness zwischen Providern:** B3 sagt, dass der Tarif die Buchungshäufigkeit nicht ändert (Neutralitäts-Test aus TKT-PROV-01). Profil bewusst nicht genannt, weil es über die Relevanz einfließt.
- **We do not create needs:** B3 verspricht keine Nachfrage.

## Agent Audit Log

- [2026-10-09] **Claude**: Canvas, Wahl, Copy-Abnahme; Copy als Vertrag in vier Sprachen, Wächter erweitert. Figma wartet. (Status: doing)
