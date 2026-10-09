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
- [x] Figma: Seite „Partner ohne Fixtures (TKT-PROV-12)" (3628:710), A2 3628:711 · B3 3628:847 · C3 3628:931 · D1 3628:1015 · E2 3628:1099, Notiz 3630:510; abgenommen 09.10. („figma ok")
- [x] Neuer Hook `useWorkspaceData` (laedt / bereit / Fehler, `reload`), keine Fixture; Demo-Daten kommen weiter von der API (Mock, Staging-Demo-Login). `useApiData` bleibt fuer die gekennzeichneten Admin-Seiten
- [x] Flächen: Anfragen, Termine (A2/B3), Abrechnung (A2 je Abschnitt, B2 Rechnungen), Tarif (A2), Performance (C3, Schwelle 5), Benachrichtigungen (403 = leer, sonst A2), Abdeckung (D1 aus `fetchVerification`), Settings (E2)
- [x] Entfällt: Beispieldaten-Banner und `?state=` auf /requests, „within 5 days" (Key entfernt), „✓ verified · no bounces 90d" (Key entfernt), „Markt hinzufügen" (`AddMarketDrawer` geloescht), Rang-Banner, erfundener Rang „#3", Ranking-Bewegungen, Qualitaetsliste, funktionsloses „30 Tage"-Menue
- [x] Tests: `useWorkspaceData` (3), `WorkspaceStates` (7), `PartnerHonest` (7), Settings E2 (+1); Gegenproben: alte LeadsPage (2 fallen), Schwelle 0 (1 faellt), Liste bei Entwurf (1 faellt)
- [x] Lokal mit Screenshots (Mock, DE/EN/390 px)
- [ ] Review des Nutzers, dann Staging

## Design / Tech Details

- DE folgt dem Produktbegriff „Verifizierung" (Navigation), die Canvas-Copy
  sagte „Verifikation". EN ist wortgleich zur Abnahme.
- D1-Copy sagt „under Services"; der Kapitelname heißt „Services & countries"
  unter Verifizierung. Belassen wie abgenommen.

## Beim Umbau gefunden

- Anbieter-Benachrichtigungen haben **keine Quelle**: die Seite rief das Admin-Protokoll (403). Jetzt „Noch keine Benachrichtigungen"; ein eigener Feed ist Backend-Arbeit.
- Bereitschafts-Liste: Bei gescheiterter Belastung oder widerrufenem Mandat faellt die Zahlungs-Zeile weg — weder „kein Zahlungsmittel" noch „hinterlegt ✓" waere wahr; /billing nennt den Grund.
- Bereichsnamen kamen englisch aus der API („Tax & VAT") — uebersetzt ueber den Code wie ueberall.
- Abrechnung: „seit Jahresbeginn" zaehlte fest 2026 — jetzt das laufende Jahr.
- Mock: Bewerbung von Schmidt & Partner hatte eine andere Zahlungsbereitschaft als die Abrechnungsvorschau — angeglichen; GET /subscription ergaenzt.
- Performance-Untertitel („Kanonische KPIs aus Provider Flows §12 …") war interner Spec-Text auf der Oberflaeche — entfaellt mit C3 (Figma hat keinen).

## DNA-Check

Betroffen: Copy, Provider-Policies, Monetarisierung (Tarif-Hinweis), Ranking (Quoten).

- **Never give false reassurance / Understate:** keine erfundenen Zahlen; „keine Termine" nur, wenn die API das sagt.
- **Trust is proven when something goes wrong:** A2 nennt, was nicht passiert ist, und hält den Weg zum Menschen offen.
- **Fairness zwischen Providern:** B3 sagt, dass der Tarif die Buchungshäufigkeit nicht ändert (Neutralitäts-Test aus TKT-PROV-01). Profil bewusst nicht genannt, weil es über die Relevanz einfließt.
- **We do not create needs:** B3 verspricht keine Nachfrage.

## Agent Audit Log

- [2026-10-09] **Claude**: Canvas, Wahl, Copy-Abnahme; Copy als Vertrag in vier Sprachen, Wächter erweitert. Figma wartet. (Status: doing)
- [2026-10-09] **Claude**: Figma gebaut und abgenommen; lokal umgesetzt, Tests mit Gegenproben, Screenshots. Wartet auf Review. (Status: doing)
