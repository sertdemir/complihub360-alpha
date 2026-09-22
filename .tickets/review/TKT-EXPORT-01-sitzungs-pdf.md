---
title: "Keine Fixture als Inhalt: Sitzungs-PDF und Risk Map ohne Pflichten"
assignee: "Claude"
status: "review"
---

# PDF-Export der Sitzungsseite exportiert die echte Risk Map

## Objective

Das ···-Menü jeder Sitzungskachel bietet "PDF exportieren". Bis heute
erzeugte es für **jede** Sitzung dieselbe PDF:

- Pflichten: die acht erfundenen Zeilen der Design-Fixture (`OBLIGATIONS`)
- Kennzahlen: die Fixture (`STATS`), darunter "3 Verified Providers ready"
- Kopfzeile: das Profil des **letzten Wizard-Laufs** aus dem localStorage — nicht das der angeklickten Sitzung

`exportPdf()` bekam die Kachel gar nicht übergeben. Ergebnis: ein Dokument
über das Geschäft des Nutzers, mit seinen Märkten im Kopf und erfundenem
Inhalt darunter. Eines, das man an Steuerberater oder Geschäftsführung
weiterleitet.

## Acceptance Criteria

- [x] Die PDF einer Kachel entsteht aus der Engine-Antwort für **genau diese** Sitzung — dieselbe Abfrage wie "Öffnen" (`/results?session=<id>`).
- [x] Kopfzeile und Abfrage gehören zur selben Sitzung.
- [x] Die Zeilenlogik ist **eine**: Risk-Map-Seite und Sitzungsseite nutzen dieselben Funktionen.
- [x] Antwortet die Engine nicht: keine PDF, sondern der abgenommene Zustand *Risk Map failed* mit *Try Again* und *Contact Support*.
- [x] Findet die Engine nichts: keine leere PDF, sondern der abgenommene Zustand *No immediate requirements identified* mit *Review My Answers*.
- [x] Während der Abfrage: der abgenommene Zustand *Risk Map loading*.
- [x] Die Fixture erreicht die PDF auf keinem Weg.

## Design / Tech Details

### Eine Abbildung statt zwei

Die Umrechnung Engine-Pflicht → Tabellenzeile → PDF-Zeile stand inline in
`ResultsRiskMap`. Die Sitzungsseite hatte keine eigene — deshalb nahm sie die
Fixture. Jetzt exportiert `ResultsRiskMap.tsx` drei reine Funktionen, die
beide Flächen nutzen:

| Funktion | Aufgabe |
|---|---|
| `liveObligations(laws, t, lang, locale)` | Engine-Pflichten → Zeilen (Bußgeldzeile, Fristen, Horizont) |
| `riskMapStats(laws, rowCount, providers)` | die vier Kennzahlen; `providers` null → "—" |
| `pdfObligations(rows, isLive, t)` | Zeilen → PDF-Zeilen |

Die Risk-Map-Seite verhält sich unverändert — ihre sieben Tests laufen ohne
Anpassung durch.

### Drei abgenommene Zustände, alle drei hier wahr

Aus TKT-COPY-01. Die Regel war: Copy geht erst auf eine Fläche, wenn ihre
Aussage stimmt. Auf dieser Fläche stimmt sie:

| Zustand | Aussage | hier wahr, weil |
|---|---|---|
| Risk Map loading | "We're reviewing your answers…" | die Engine rechnet gerade die Sitzung |
| Risk Map failed | "Please try again. If the problem continues, contact support." | *Try Again* wiederholt den Export, *Contact Support* führt auf `/contact` |
| No requirements identified | "…This does not mean that no obligations apply. Review your answers…" | *Review My Answers* öffnet die Antworten-Schublade dieser Sitzung |

### Warum keine leere PDF

Eine PDF mit null Zeilen liest sich auf Papier als Entwarnung. Der Satz, der
das verhindert — *"This does not mean that no obligations apply"* — steht
nur im abgenommenen Zustand, nicht in der PDF.

## Teil 2 (Nutzerauftrag 2026-09-22): die Risk Map bei null Pflichten

Beim Export gefunden: die Risk-Map-Seite selbst fiel bei null Engine-Pflichten
auf `OBLIGATIONS` zurück (`isLive = liveLaws.length > 0`) und zeigte acht
erfundene Pflichten. Wer eine Sitzung ohne Pflichten öffnete, sah acht — der
Export derselben Sitzung sagte korrekt "keine unmittelbaren Anforderungen".

Jetzt unterscheidet die Seite drei Fälle, die vorher einer waren:

| `source` | Pflichten mit `severity` | Anzeige |
|---|---|---|
| `api` | ≥ 1 | Tabelle bzw. Gruppen, wie bisher |
| `api` | 0 | **abgenommener Zustand *No immediate requirements identified*** |
| `fixture` (Laden, API-Fehler) | — | Fixture, **unverändert** — siehe unten |

- **Gast-Ansicht:** der Zustand steht an Stelle der Tabelle.
- **Eingeloggte Ansicht:** `SessionSnapshot` hat einen neuen Slot `emptyState`
  und zeigt ihn statt einer leeren, kommentarlosen Spalte. Der Export-Link
  entfällt (`onExportPdf` ist jetzt optional) — eine PDF ohne Pflichten läse
  sich als Entwarnung.
- **„Review My Answers" nur, wo er stimmt:** eingeloggt mit gespeicherter
  Sitzung öffnet er deren Antworten-Schublade. Für Gäste fehlt der Knopf — der
  Wizard stellt frühere Antworten nicht wieder her, er öffnete einen leeren.
- Knowledge-Treffer ohne `severity` zählen nicht als Pflicht (unverändert,
  jetzt mit Test).
- Kennzahl „median deadline": bei null Pflichten ein Strich statt „ongoing".
  „ongoing" ist richtig, wenn es Pflichten ohne Frist gibt, nicht wenn es
  keine gibt.

Drei Tests; Sabotage A (Rückfall auf die Fixture) → alle drei fallen;
Sabotage B (Review-Knopf auch für Gäste) → der Gast-Test fällt.

## Weiter offen

**Laden und API-Fehler zeigen auf der Risk Map weiterhin die Fixture.** Das
sind die Zustände *Risk Map loading* und *Risk Map failed* aus der
Wahrheitstabelle von TKT-COPY-01. Beide Copy-Aussagen wären wahr; es fehlt die
Fläche. Nicht Teil dieses Auftrags, aber derselbe Fehlertyp und der letzte
Ort, an dem die Fixture auf der Risk Map noch als Inhalt erscheint.

## DNA-Check

Betroffen: **Copy und Microcopy** (drei abgenommene Zustände verdrahtet),
**Risk Map** (Darstellung der Pflichten im Export).

- **Kommunizieren wir Risiko ehrlich, ohne unnötige Angst?** Die PDF enthielt
  erfundene Pflichten mit Dringlichkeiten — Risiko, das es für diesen Nutzer
  nicht gibt. Jetzt nur, was die Engine für seine Sitzung findet; und wenn sie
  nichts findet, steht dabei, dass das keine Entwarnung ist.
- **Stärkt es das Vertrauen — statt es auszugeben?** Ein Dokument, das der
  Nutzer weitergibt, trägt unseren Namen in fremde Hände. Es darf nichts
  enthalten, was wir nicht belegen können.
- **Sind wir bereit, Verantwortung zu übernehmen, wenn etwas schiefgeht?**
  Scheitert die Engine, bekommt der Nutzer keine Ersatz-PDF, sondern die
  Aussage, dass es nicht geklappt hat, und zwei Wege weiter.

## Agent Audit Log

- [2026-09-22] **Claude**: Abbildung extrahiert, Export auf die Sitzung umgestellt, drei Zustände verdrahtet, vier Tests, zwei Sabotagen. (Status: review)
- [2026-09-22] **Claude**: Risk Map bei null Pflichten: Zustand statt Fixture in Gast- und eingeloggter Ansicht, drei Tests, zwei Sabotagen. (Status: review)
