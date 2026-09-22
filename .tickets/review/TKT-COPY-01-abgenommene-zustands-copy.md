---
title: "Abgenommene Zustands-Copy aus der Acceptance-Checklist, Teil 1"
assignee: "Claude"
status: "review"
---

# Abgenommene Zustands-Copy aus der Acceptance-Checklist, Teil 1

## Objective

Die "Technical and UX Acceptance Checklist v1.0" gibt im Abschnitt
**Approved UX State Copy** 17 Zustände vor — je Überschrift, Text und
Aktionen — plus den Dialog **Review what will be shared**. Nichts davon stand im
Produkt (18 von 18 Leitsätzen gegen `public/locales/en/` geprüft: fehlt).

Teil 1 legt die Copy als Vertrag an, sichert sie gegen stilles Umformulieren
und verdrahtet sie nur dort, wo ihre Aussage heute schon stimmt.

## Acceptance Criteria

- [x] `common:states.*` in en/de/es/tr: 17 Zustände, 20 Aktionen, Sharing-Dialog.
- [x] EN zeichengenau aus der Vorlage (typografischer Apostroph U+2019 inklusive), maschinell gegen den Dokumenttext geprüft.
- [x] DE/ES/TR im Sie/usted-Register; Aktionen im Satzanfang statt Title Case (Checklist: "English Title Case rules are not automatically imposed on other languages").
- [x] `npm run copy:check` hält EN wortgleich, in CI als eigener Schritt. Drei Sabotagen erkannt.
- [x] "Booking processing" auf beiden Buchungsflächen verdrahtet, mit Test.
- [x] Loch im Terminologie-Wächter aus #187 geschlossen.

## Design / Tech Details

### Die Copy beschreibt ein Produkt, das es noch nicht gibt

Die abgenommenen Sätze sind keine Formulierungen für bestehende Zustände —
sie sind eine **Verhaltensspezifikation**. Mehrere versprechen Dinge, die heute
nicht existieren. Sie auf eine Fläche zu setzen hieße, falsche Aussagen
auszuliefern — genau das, was die Checklist mit *"Public copy matches actual
production behavior"* ausschließt und die DNA mit *"Never give false
reassurance"*.

Deshalb gilt: **Copy darf erst auf eine Fläche, wenn ihre Aussage stimmt.**

| # | Zustand | Fläche heute | Aussage heute wahr? | Was fehlt |
|---|---|---|---|---|
| 1 | Risk Map loading | keine — die Seite zeigt während des Ladens die Design-Fixture | ja | Seite muss `loading` auswerten statt Fixture zu zeigen |
| 2 | Risk Map delayed | keine | **nein** — *"Your answers are saved"*: die Sitzung wird fire-and-forget gespeichert, ein Fehlschlag bleibt unbemerkt | bestätigtes Speichern, Zeitschwelle |
| 3 | Risk Map failed | keine — bei Fehler zeigt die Seite die Fixture | ja | Fehlerzustand statt Fixture, Weg zum Support |
| 4 | No requirements identified | keine | ja | Leerzustand, Rückweg zu den Antworten |
| 5 | More information needed | keine | ja | Zustand je Bereich |
| 6 | No provider match | `userws:domainPage.providersNone` | **nein** — *"You can request this market and choose to be notified"*: gibt es weder in UI noch Backend | Markt anfragen + Benachrichtigung |
| 7 | One provider match | keine | teilweise — *"expected price range"*: die anonyme Karte trägt keine Preisspanne | Preisspanne aus `provider_services` auf die Karte |
| 8 | Multiple provider matches | Risk-Map-Teaser | **Konflikt, siehe unten** | Entscheidung |
| 9 | Limited coverage | keine | **nein** — *"request additional coverage"* | wie 6 |
| 10 | Provider response overdue | keine | **nein** — *"ask CompliHub360 to show you another match"* | Überfälligkeits-Erkennung, Alternativ-Match |
| 11 | Alternative available | keine | **nein** | wie 10 |
| 12 | **Booking processing** | Buchungs-Drawer, Buchungsseite | **ja** — Knopf ist während der Anfrage gesperrt | — **verdrahtet** |
| 13 | Booking confirmed | `schedule.done*` | **nein** — *"We have shared only the information shown in your booking confirmation"*: die Bestätigung zeigt nicht, was geteilt wurde | Sharing-Dialog |
| 14 | Booking failed | `schedule.failed` | **nicht immer** — siehe unten | atomare Buchung |
| 15 | Market unavailable | keine | **nein** — *"Request this market"* | wie 6 |
| 16 | Session expired | keine — ein 401 fällt still auf die Fixture | ja | 401-Behandlung |
| 17 | Form error summary | keine | ja | Fehlerzusammenfassung, Fokus aufs erste Feld |
| — | Review what will be shared | **keine** | — | der Dialog selbst; `scheduling.shared_fields` und `sharing_confirmed_at` existieren, werden aber nie gesetzt |

Sieben der siebzehn Zustände behaupten etwas, das heute nicht stimmt (2, 6, 9,
10, 11, 13, 15), zwei weitere nur teilweise (7, 14). Sieben wären wahr, haben
aber keine Fläche. Einer (12) stimmt und hat eine — der ist verdrahtet.

### Booking failed stimmt nicht in jedem Fall

`POST /api/v1/scheduling` legt erst die Buchung an (das ist die Übergabe des
Dossiers) und schreibt danach zwei `event_log`-Zeilen. Scheitert eine davon,
antwortet der Endpunkt mit 500 — die Buchung existiert aber, und
`lead_charged` steht auf `true`. Die Oberfläche sagt dann "nicht gebucht",
heute wie mit der neuen Copy (*"No booking was created and your information was
not shared"*). Das ist ein vorbestehender Fehler und ein eigener Schritt —
er berührt die Abrechnung (`provider_lead_charged` speist den Billing-Lauf),
gehört also nicht nebenbei in einen Copy-PR.

### Terminologie: das Loch im Wächter

Die Muster aus #187 waren case-sensitive. "Unlock **M**atches" wurde gefunden,
"Unlock **m**atches with a free account" nicht. Case-insensitiv gemessen
standen **15** verbotene Begriffe im Englischen, während der Wächter grün
meldete — darunter der Absende-Knopf des Wizards (*"Generate my risk map"*)
und der Assistenten-Disclaimer, dessen Übersetzungen #187 schon korrigiert
hatte, dessen englische Quelle aber nicht.

- **9 echte Ausrutscher** in 4 Sprachen korrigiert (31 Werte).
- **"Saved Sessions → Saved Risk Maps" ausgesetzt**, sichtbar im Wächter mit
  Datum und Grund: 71 EN-Werte tragen "session", die meisten meinen eine
  gespeicherte Risk Map. Nur die sechs wörtlichen Treffer zu tauschen ergäbe
  eine Navigation "Saved Risk Maps" über einer Seite "Your compliance
  sessions". Derselbe Fall wie Severity.

### Beobachtung zur Vorlage selbst

Die abgenommene Copy sagt "consultation", die bestehende Buchungsstrecke sagt
"appointment" und "intro call". Das Englische mischt damit ab jetzt zwei Wörter
für dasselbe. Im Deutschen fällt es nicht auf (beides "Termin").

## DNA-Check

Betroffen: **Copy und Microcopy**, **Registrierung und Gating** (Teaser, s. u.).

- **Kommunizieren wir Risiko ehrlich, ohne unnötige Angst?** Der Zustand "No
  immediate requirements identified" enthält den Satz *"This does not mean that
  no obligations apply"* — er ist der Grund, warum ein leeres Ergebnis nicht als
  Entwarnung gelesen wird. Sabotage 2 des Copy-Wächters entfernt genau diesen
  Satz und wird rot.
- **Stärkt es das Vertrauen — statt es auszugeben?** Copy, die eine fehlende
  Fähigkeit verspricht ("request this market", "we have shared only…"), wird
  bewusst nicht verdrahtet. Eine abgenommene Formulierung ist kein Beweis, dass
  ihre Aussage stimmt.
- **Hilft es dem User zu verstehen — statt nur zu konvertieren?** Hier liegt der
  offene Konflikt, siehe nächster Abschnitt.

### Offener DNA-Konflikt — nicht selbst aufgelöst

Der Anbieter-Abschnitt der Risk Map (`ResultsRiskMap.tsx`) zeigt jedem Gast
unabhängig vom Ergebnis:

- `results:partners.eyebrow` = *"3 Verified Providers matched"* — die Zahl steht fest im Text
- `results:partners.title` = *"We've found who can act on this."*
- drei gesperrte Karten aus `MATCHES = ['100%', '87%', '73%']`, hart kodiert (Z. 183)

Findet die Engine null Anbieter, sieht der Nutzer trotzdem "3 matched, 100 %"
hinter einem Schloss, verbunden mit der Aufforderung, ein Konto anzulegen.

Verletzt: *"Hilft es dem User zu verstehen — statt nur zu konvertieren?"* und
*"Stärkt es das Vertrauen — statt es auszugeben?"*; DNA §3 Prinzip 4 (*"Show
value before asking for commitment"* — hier wird erfundener Wert gezeigt);
§4.5 *"Never give false reassurance"*. Die Checklist selbst verlangt:
*"Zero, one, limited, and multiple match results use the correct singular or
plural copy."*

**Nicht angefasst.** Nach `.agents/rules/dna-decision-filter.md` wird ein
DNA-Konflikt benannt und eskaliert, nicht selbst aufgelöst. Die Umbenennung des
CTA-Labels (`unlockCta`) ist davon getrennt — sie ist eine Terminologie-Pflicht
der Checklist und ändert am Teaser nichts.

## Agent Audit Log

- [2026-09-22] **Claude**: Copy angelegt, Wahrheitstabelle erstellt, Booking processing verdrahtet, Wächter-Loch geschlossen, DNA-Konflikt eskaliert. (Status: review)
