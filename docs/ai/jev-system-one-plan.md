---
title: "Jev (TypeSafe AI) — Einsatzplan für CompliHub360"
status: proposal
date: 2026-10-17
owner: Sertan (Entscheidung) · Claude (Entwurf)
touches: [ai-behaviour, wizard, privacy, provider-matching-intake]
---

# Jev bei CompliHub360 — Plan

> **Kurzfassung:** Jev ist kein Chatbot und kann keine Antworten formulieren.
> Jev trifft in 70–500 ms typisierte Entscheidungen mit Wahrscheinlichkeit.
> Der Mehrwert für uns liegt deshalb nicht darin, „alles zu steuern",
> sondern darin, **als schneller Reflex vor und hinter dem Sprachmodell**
> die DNA technisch durchzusetzen: richtig routen, Grenzen prüfen,
> den Weg zum Menschen öffnen.

## 1. Was Jev ist — Faktenlage

Quellen: TypeSafe-Launch-Post (15.09.2026) und Sekundärquellen. Die Seiten
von typesafe.ai und das YouTube-Video waren aus der Remote-Umgebung nicht
abrufbar (Netzwerk-Policy). Alles Folgende stammt aus Suchergebnissen und
ist **vor der Umsetzung gegen die Primärdoku zu prüfen**.

| Merkmal | Stand |
|---|---|
| Kategorie | „System One Model" (nach Kahneman: schnelles, intuitives Denken). Nicht generativ. |
| Input | Text, JSON oder Text-Arrays als **State** plus **typisierte Fragen** |
| Fragetypen | Choice (max. 255 Optionen), Score, Null/„Noul" |
| Output | typisierte Werte **mit Wahrscheinlichkeit / Konfidenz** — kein Fließtext |
| Kontext | 64k Tokens je Request, davon 32k für State plus längste Frage |
| Latenz (Herstellerangabe) | 70–500 ms, gegenüber 3–329 s bei Frontier-LLMs |
| Preis (Herstellerangabe) | 0,042 $ je 1 Mio. Input-Tokens, Output kostenlos |
| Limits | 250k Tokens/s, 1.200 Requests/min (Default) |
| Endpunkt | `jev-latest`, `/v1/systemone`; auch über Vercel AI Gateway (Jev 1.14 seit 15.10.2026), OpenRouter u. a. |
| Training auf Kundendaten | laut Datenschutzerklärung nein |
| Hosting | **widersprüchlich**: eine Quelle nennt USA ohne EU-Residenz, eine andere einen Dienst in Frankreich |
| Datenhaltung | „so lange wie nötig", Zero Data Retention nur Enterprise auf Anfrage |
| Zertifizierungen | SOC 2 / ISO 27001 nicht bestätigt |
| Reifegrad | Early Access; Preise, Limits und Modell-IDs ändern sich wöchentlich |

**Kritische Einordnung.** Die Spitzenwerte („193,6× schneller, 444,6× günstiger")
sind Herstellerbenchmarks auf System-One-förmigen Aufgaben. Eine unabhängige
Auswertung von Nutzerberichten kommt auf einen Median von etwa 7×. Ein Test
fand, dass Jev in 16 % der Fälle dem richtigen Label die Wahrscheinlichkeit
null gab. Typisierte Ausgabe verhindert Schemafehler, **nicht Fehlurteile**.
Konsequenz: Jev bekommt bei uns nur Entscheidungen mit sicherem Rückfallweg.

## 2. Die Prämisse „Jev steuert die Plattform und gibt alle Antworten"

Diese Form empfehle ich **nicht**, aus vier Gründen:

1. **Technisch:** Jev erzeugt keine Sätze. Antworten formuliert weiter ein
   Sprachmodell (seit ADR-0011 Mistral Small über Scaleway, `services/compliance-api/src/llm.ts`).
2. **Privacy-Regel:** Die PII-Redaction muss deterministisch bleiben
   (`.agents/rules/privacy-redaction-deterministic.md`). Ein probabilistisches
   Modell darf sie weder ersetzen noch vor ihr sitzen.
3. **Engine-Sicherheit:** Pflichten, Dringlichkeit und Risk Map kommen aus der
   deterministischen `compliance-engine`, Ranking aus der erklärbaren
   Performance-Logik (ADR-0009). Diese Entscheidungen müssen auditierbar und
   reproduzierbar bleiben. Ein Modell mit 16 % Null-Wahrscheinlichkeit auf dem
   richtigen Label darf dort nicht entscheiden.
4. **DNA §5:** Die AI ist Assistenz, kein Ersatz für menschliche Expertise.
   Eine AI, die „alles kontrolliert", widerspricht dem Bild.

Die empfohlene Form ist ein **Drei-Schichten-Modell**:

```
┌───────────────────────────────────────────────────────────────┐
│  GESETZ    compliance-engine · policy-engine · Ranking        │  deterministisch, auditierbar
│            → was gilt, wie dringend, wer passt                 │  (unverändert)
├───────────────────────────────────────────────────────────────┤
│  REFLEX    Jev                                                 │  schnell, typisiert, mit Konfidenz
│            → wohin gehört die Frage, ist die Antwort DNA-konform, │  immer mit Rückfallweg
│              braucht es einen Menschen                         │
├───────────────────────────────────────────────────────────────┤
│  SPRACHE   Mistral Small über Scaleway (ADR-0011)              │  formuliert, erklärt
│            → die eigentliche Antwort, im Ton der DNA           │
└───────────────────────────────────────────────────────────────┘
        davor immer: deterministische Redaction + Privacy-Gate + Audit
```

Jev wird damit zum **Türsteher und Lektor der DNA** — nicht zum Chef.

## 3. Einsatzfelder, nach Mehrwert gereiht

### A. Answer Guard — die DNA als Laufzeitprüfung (höchster Mehrwert)

Jede Antwort des Sprachmodells geht vor der Auslieferung durch Jev. State: Frage
(sanitized), Kontextauszug, Antwortentwurf. Typisierte Fragen:

| Frage | Typ | DNA-Bezug |
|---|---|---|
| Stellt die Antwort sich als Rechts- oder Steuerberatung dar? | Choice ja/nein | harte Grenze „nie als Fachperson ausgeben" |
| Erzeugt sie Dringlichkeit oder Angst als Handlungsdruck? | Score 0–1 | harte Grenze „Angst nie zur Conversion" |
| Behauptet sie mehr Sicherheit, als der Kontext trägt? | Score 0–1 | „Unsicherheit nie hinter selbstsicherer Sprache" |
| Stellt sie eine optionale Leistung als Pflicht dar? | Choice | „We do not create needs" |
| Enthält sie Hype-Wörter oder wörtliche Zitate aus dem lizenzierten Korpus? | Choice | Voice §4.7, Prompt-Regel 2 |

Verhalten: Schlägt eine Prüfung über dem Schwellwert an, wird **einmal neu
generiert** mit gezieltem Korrekturhinweis. Schlägt sie erneut an, kommt eine
ehrliche Rückfallantwort mit Angebot einer Partner-Anfrage. **Fail closed:**
Ist Jev nicht erreichbar, gilt die heutige Logik plus fester Hinweis — es wird
nichts still durchgewunken.

Warum Jev hier passt: 70–500 ms sind neben einer mehrsekündigen
Modellantwort kaum spürbar. Ein zweiter LLM-Aufruf als Prüfer würde die
Antwortzeit verdoppeln.

### B. Triage vor dem Assistenten

Heute muss der Client Land und Bereich mitschicken. Jev liest die Frage und
entscheidet in einem Request:

- **Bereich:** einer der 9 Slugs (`tax-vat`, `product-packaging`, …) oder „unklar"
- **Land:** abgedeckt (DE, UK, NL, FR, IT, ES, US, TR, AT), nicht abgedeckt, keins
- **Anliegen:** allgemeine Information · persönliche Situation mit Beratungsbedarf · Beschwerde · Belastung/Stress · themenfremd · Manipulationsversuch
- **Sprache:** DE / EN / ES / TR

Was daraus folgt:

- Bei **Beratungsbedarf** bietet die Antwort sichtbar den Weg zum Partner an,
  statt ihn hinter weiteren Fragen zu verstecken (DNA: keine Reibung vor dem Menschen).
- Bei **Belastung** bekommt das Sprachmodell einen ruhigeren Ton-Hinweis, Humor ist aus.
- **Themenfremdes** wird freundlich umgelenkt, ohne teuren RAG-Lauf.
- Bei **niedriger Konfidenz** wird nicht geraten, sondern nachgefragt:
  „Geht es um Verpackung (EPR) oder um Umsatzsteuer?" — als Auswahl-Chips.
  Erkannte Bereiche werden **nie still gesetzt**, der User sieht und
  korrigiert sie (DNA: Ask before assuming).

### C. Prompt-Injection-Erkennung im Privacy-Gate

`packages/governance/src/privacy/ai-privacy-gate.ts` prüft heute drei feste
Schlüsselwörter. Jev ergänzt das als zweite Stufe. Reihenfolge bleibt:
**deterministische Redaction → Schlüsselwortliste → Jev**. Die Liste bleibt als
deterministischer Boden, Jev ersetzt nichts.

### D. Wizard: weniger fragen, was schon gesagt wurde

Beschreibt ein User sein Unternehmen frei („Wir verkaufen Kosmetik über
Amazon nach Frankreich und Spanien"), mappt Jev das auf Wizard-Antworten
(Branche, Vertriebskanal, Zielmärkte). Diese erscheinen als **vorausgefüllte
Vorschläge zum Bestätigen**. Fragen mit hoher Konfidenz und Bestätigung
entfallen. Das erfüllt „Ask only what matters" wörtlich.
Die Risk Map rechnet danach unverändert deterministisch.

### E. Anfrage-Intake für Matching

Freitext einer Partner-Anfrage wird in Leistungskategorien
(`engagement_requests.category`) einsortiert. Jev liefert **nur die
Kategorie**, nicht das Ranking. Match-Prozente bleiben über sichtbare
Fit-Indikatoren erklärbar.

### F. Intern (kein Userbezug, geringes Risiko, guter Einstieg)

- **Korpus-Tagging:** neue Knowledge-Chunks automatisch mit Land und Abschnitt versehen.
- **Änderungs-Relevanz:** Ist eine neue Rechtsquelle für welche Pflichten der Engine relevant? Vorschlag an ein Review, nie automatische Änderung.
- **Review-Moderation:** Partnerbewertungen auf Beleidigung, PII-Reste oder Fake-Muster prüfen, Entscheidung durch Admin.
- **Support-Triage:** Priorität nach Inhalt, **nie** nach Unternehmensgröße oder Umsatz.

## 4. Wo Jev nie entscheidet

| Bereich | Grund |
|---|---|
| PII-Erkennung und Redaction | Privacy-Regel: deterministisch |
| Rohdaten, `raw://`-Refs | Privacy-Regel: nie an eine AI |
| Pflichten, Dringlichkeit, Risk Map | Engine-Safety, Auditierbarkeit |
| Provider-Ranking, Match-Prozent | Fairness und Erklärbarkeit, ADR-0009 |
| Preise, Gating, Paywalls, Abo-Status | geschäftskritisch, deterministisch |
| Upsell-Targeting, „Kaufneigung" | DNA: Respekt variiert nie nach kommerziellem Wert |
| Antworttexte | kann Jev nicht |

## 5. Architektur

- **Neues Paket** `packages/decision-layer` mit anbieterneutralem Interface
  `DecisionProvider.evaluate(state, questions) → { value, p }[]`. Jev ist die
  erste Implementierung, ein deterministischer Stub die zweite. So bleiben
  Tests offline, und ein Anbieterwechsel kostet ein Modul.
- **Zugang:** zuerst direkt über die TypeSafe-API. Ein Gateway (Vercel,
  OpenRouter) bringt eine zweite Datenschutzpartei dazu und kommt erst nach
  DPA-Prüfung infrage.
- **Schwellwerte je Entscheidung** als Konfiguration, nicht im Code verstreut.
  Unter dem Schwellwert gilt immer der konservative Pfad.
- **Audit:** jeder Aufruf schreibt ein `event_log`-Event (Typ, Konfidenz,
  Latenz, Ergebnis; kein Freitext). Grenzübertritt „Sanitized an AI" ist
  damit belegt.
- **Timeout** 800 ms, danach Rückfallweg. Kein Retry im Request-Pfad.
- **Secret** `TYPESAFE_API_KEY`; ohne Key antwortet die Schicht mit
  „nicht konfiguriert", wie heute der Assistent mit `ASSISTANT_NOT_CONFIGURED`.

## 6. Kosten

| Annahme | Wert |
|---|---|
| Fragen pro Tag | 10.000 |
| Jev-Aufrufe je Frage | 2 (Triage + Guard) |
| Tokens je Aufruf | ~1.500 |
| Tokens pro Tag | 30 Mio. |
| Kosten pro Tag | ~1,26 $ |

Die Kosten sind vernachlässigbar. Einsparung entsteht zusätzlich, weil
themenfremde Fragen keinen Embedding- und Modell-Lauf mehr auslösen.

## 7. Datenschutz und Recht — vor dem ersten produktiven Request

- [ ] DPA mit SCCs und UK-Addendum anfordern und prüfen
- [ ] Hosting-Region klären (USA vs. Frankreich — Quellen widersprechen sich)
- [ ] Zero Data Retention vertraglich vereinbaren
- [ ] DSFA (Datenschutz-Folgenabschätzung) für Triage und Guard
- [ ] Subprozessor-Liste und Datenschutzerklärung ergänzen
- [ ] AI-Feature-Registry und Transparenzseite (EU AI Act) um Jev erweitern
- [ ] Mehrsprachigkeit prüfen: DE, ES, TR sind nicht dokumentiert

## 8. Phasen

| Phase | Inhalt | Ergebnis | Gate zur nächsten Phase |
|---|---|---|---|
| **0 · Klären** (1 Woche) | Punkte aus §7, Playground-Test mit synthetischen Fragen in 4 Sprachen, ADR-0012 | Go/No-Go | DPA ok, Sprachen tragfähig |
| **1 · Shadow** (2 Wochen) | `decision-layer` + Triage + Guard laufen **parallel ohne Wirkung**, nur Logging | Messdaten | Ziele unten erreicht |
| **2 · Guard live** | Answer Guard fail-closed aktiv | DNA-Grenzen zur Laufzeit geprüft | 2 Wochen ohne Fehlalarm-Häufung |
| **3 · Triage live** | Bereichserkennung mit Bestätigungs-Chips, Handoff-Angebot | weniger Klicks, Weg zum Menschen sichtbar | UI-Workflow durchlaufen |
| **4 · Wizard + Intake** | Vorausfüllen, Kategorie für Anfragen | kürzerer Wizard | Abbruchrate sinkt, Korrekturrate < 15 % |
| **5 · Intern** | Korpus-Tagging, Änderungs-Relevanz, Moderation | weniger Handarbeit | — |

Phase 5 kann parallel ab Phase 1 laufen, weil sie keine Userdaten berührt.

**Messziele Shadow-Phase** (gegen ein handgelabeltes Goldset von ~200 Fragen):

| Messgröße | Ziel |
|---|---|
| Bereich richtig erkannt | ≥ 95 % |
| Guard erkennt eingestreute Verstöße | ≥ 90 % |
| Guard-Fehlalarme auf saubere Antworten | ≤ 3 % |
| p95-Latenz | < 600 ms |

**UI-Anteile** (Bestätigungs-Chips, Handoff-Karte, Wizard-Vorschläge)
folgen dem festgelegten Ablauf: Canvas mit drei Varianten → Abnahme →
Figma mit Compass → lokal → Review → Staging. Backend aus Phase 1 darf
parallel entstehen.

## 9. DNA-Check

Betroffen: AI-Verhalten (Guard, Triage, Handoff), Wizard (Vorausfüllen), Matching-Intake.

- **Hilft es zu verstehen statt zu konvertieren?** Ja. Der Guard blockiert
  Antworten, die Druck aufbauen oder Optionales als Pflicht darstellen.
- **Risiko ehrlich, ohne Angst?** Der Guard prüft genau das als eigene Frage;
  die Dringlichkeit selbst bleibt in der deterministischen Engine.
- **Zugang zum Menschen erhalten?** Die Triage erkennt Beratungsbedarf und
  bietet den Partnerweg aktiv an. Jev ist nie die letzte Instanz.
- **Gleicher Respekt für kleine Unternehmen?** Keine Jev-Entscheidung nutzt
  Unternehmensgröße oder Umsatz als Merkmal; das wird im State-Schema
  ausgeschlossen.
- **Fairness zwischen Providern?** Jev liefert nur die Anfrage-Kategorie;
  Ranking und Match-Prozent bleiben unberührt.
- **Unsicherheit nicht verstecken?** Unter dem Schwellwert wird nachgefragt
  statt geraten; erkannte Werte sind immer sichtbar und korrigierbar.

**Offener Punkt zur Entscheidung durch Sertan:** Die ursprüngliche Idee
„Jev kontrolliert die ganze Plattform" kollidiert mit DNA §5 (AI als
Assistenz, nicht Ersatz) sowie den Privacy- und Engine-Regeln. Dieser Plan
schlägt die engere Rolle vor. Soll Jev doch weiter reichen, braucht es dafür
eine bewusste Entscheidung.

## 10. Nächste konkrete Schritte

1. Early-Access-Zugang bei TypeSafe beantragen, DPA und ZDR anfragen.
2. Goldset anlegen: 200 echte Fragetypen (synthetisch, ohne PII) in 4 Sprachen, je mit Bereich, Land, Anliegen.
3. ADR-0012 „Decision Layer mit System-One-Modell" schreiben.
4. `packages/decision-layer` mit Stub und Tests, danach Shadow-Integration in `assistant.ts`.
