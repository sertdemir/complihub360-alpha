---
id: KN-PRODUCT-002
title: "CompliHub360 Website Copy & Implementation Handover 1.0"
type: knowledge-node
domain: product
version: "1.0"
status: canonical
authority: reference
date_added: "2026-10-24"
document_date: "2026-09-18"
vault_ref: "../../vault/product/CompliHub360_Website_Implementation_Handover_V1.0.docx"
vault_text: "../../vault/product/CompliHub360_Website_Implementation_Handover_V1.0.md"
sha256_docx: "d527931bdbe4fbebc5ff56838146fb94265f3f948042e7ab038c07e2e341324e"
binds:
  - copy
  - ux
  - ui
  - homepage
supersedes: []
relates_to:
  - id: KN-BRAND-001
    relation: "untergeordnet — bei Widerspruch gewinnt die DNA"
  - id: KN-PRODUCT-001
    relation: "Die Checkliste (19.09.) ist einen Tag juenger und geht bei Widerspruch vor."
tags: [launch, en-first, homepage, copy, tooltips, terminology]
---

# KN-PRODUCT-002 — Website Copy & Implementation Handover 1.0

> Die abgenommene **englische Copy der Startseite**: zwölf Sektionen von Hero bis Footer, je mit
> altem Wortlaut, Ersatz und Entwickleranweisung. Dazu Terminologie, Tooltips, die
> Buchungs- und Offenlegungslogik sowie Content-Standards. Stand des Dokuments: 18.09.2026.

## Was dieser Knoten ist

Das Handover ist die **Textvorlage** der englischen Startseite. Es ist `reference`, nicht `source-of-truth`:

- Widerspricht es der DNA ([`KN-BRAND-001`](KN-BRAND-001-complihub360-dna.md)), gewinnt die DNA.
- Widerspricht es der Acceptance Checklist ([`KN-PRODUCT-001`](KN-PRODUCT-001-technical-ux-acceptance-checklist.md)), geht die Checkliste vor. Sie ist einen Tag jünger und prüft die Startseite gegen das, was das Produkt einlöst.

**Zur Version:** Die Datei trägt „Version 1.0 · 18 September 2026“. Die Checkliste nennt eine *Version 1.1* als aktive Vorlage und V1.0 nur als Archiv. Eine V1.1 liegt weder im Repo noch im Vault. Der Nutzer hat am 24.10.2026 diese Datei als Vorlage für den englischen Text übergeben. Kommt eine V1.1, wird sie als neue Version daneben abgelegt.

## Umsetzung (2026-10-24)

Umgesetzt auf der Startseite (EN), Sektion für Sektion:

1. **Hero:** Lead, zweiter Weg, Platzhalter, Button, vier Versprechen, fünf Proofs
2. **Problem:** Eyebrow, Überschrift, Lead, vier Schmerzpunkte, Schluss
3. **Assessment-Einstieg und Wizard:** Eyebrow, Überschrift, Text, Schrittnamen, Geschäftsmodelle, „Continue“, „Create My Risk Map“, Review-Text, Trust-Zeile
4. **Risk Map:** Eyebrow, Überschrift, vier Kennzahlen, Status „Likely to Apply“ und „More Information Needed“, Aktion „Answer 2 Questions“
5. **Matching:** Eyebrow, Überschrift, Text, Identitäts-Label, Begleitsatz, CTA (der Knopf war vorher ohne Funktion)
6. **Ablauf:** Eyebrow, Überschrift, Lead, fünf Schritte, zwei gleichwertige CTAs
7. **Bereiche:** Eyebrow, Überschrift, Untertitel, Feldnamen, je Bereich Text, Anlässe und Leistungen
8. **Trust Band:** Eyebrow, Überschrift, Text, sechs Punkte
9. **Engagement:** Eyebrow, Überschrift, Untertitel, drei Karten, Beispiel mit Preisspanne und Leistungsdauer, sechs Stationen, „Planned exports“
10. **Workspace:** Eyebrow, Überschrift, Untertitel, drei Kacheln, „Available now“ / „Coming in beta“
11. **FAQ:** Überschrift, Unterzeile, alle 29 Fragen in drei Gruppen
12. **Newsletter und Footer:** Texte, Privacy-Link, Tagline, Beschreibung, Spalten, Disclaimer, Rechtslinks, Copyright

## Bewusste Abweichungen

| Handover | Produkt | Grund |
|---|---|---|
| Priorität „Urgent“ | **Immediate** | DNA #54, vom Nutzer am 10.10.2026 bestätigt (wie in KN-PRODUCT-001) |
| „Available in: Available globally“ (sechs Bereiche) | Marktzeile aus der Engine | Checkliste, Availability: nie „Available globally“ auf Absicht hin; `copy:check` Abschnitt 6 |
| Footer „Global Coverage“ (sechs Weltregionen) und „supports businesses across global markets“ | Marktzeile aus der Engine plus der zweite Satz der Coverage Note | wie oben |
| Ablauf, Schritt 1: „…receive a clear, source-backed answer“ | „In the beta, it leads to the right area and into the assessment, not yet to a direct answer.“ | Launch Scope: Beta ehrlich kennzeichnen. Direktantworten sind nicht live, der Hero sagt dasselbe. Vom Nutzer am 24.10.2026 bestätigt: bleibt, bis die Antworten live sind. |
| Wizard-Knopf „Skip This Step“ | nicht eingebaut | Den Sprung gibt es im echten Wizard nicht (Wizard-Audit B6). Die „Not sure“-Optionen übernehmen das. |
| Engagement-Beispiel: Bewertungen, Nachweise, Auszeichnungen, Unternehmensprüfung (inkl. BBB) | nicht im Beispiel | Im selben Abschnitt als CONFIRM BEFORE LAUNCH markiert |
| Rechtslink „Terms of Use“ | „Beta agreement“ | /terms ist während der Beta die Beta-Vereinbarung. Das Handover selbst: „Beta“ nur, solange Beta. |
| Rechtslink „Privacy Choices“ | fehlt | Es gibt keine Einstellungsseite |
| Footer „Provider Standards“ | fehlt | Es gibt keine Seite. Ein Eintrag ohne Ziel wäre ein toter Link. |
| CTA mit Schlusspunkt („…best matches.“) | ohne Punkt | Button-Label |
| Newsletter-Formular mit Erfolgsmeldung „You're subscribed. Please check your inbox to confirm…“ | Karte mit Etikett **Coming in beta**, Feld und Knopf gesperrt, Satz „Sign-up for the monthly briefing is not open yet.“ | Das Formular verschickt nichts (kein Backend, kein Double-Opt-in); bis 24.10. meldete es trotzdem eine Anmeldung. Vom Nutzer am 24.10.2026 entschieden. |

## Noch offen

- **Tooltips:**
  - Begriffe der Bereiche, etwa EPR, WEEE, DPIA, EORI und Incoterms
  - Matching: Verified Provider, Match score, Response time, Completed engagements, Identity revealed
  - Status der Risk Map
  - Trust Band: Official Source, Verified Provider, Priority
  - Die Texte stehen im Handover. Die Bedienung (Tastatur, Escape, Touch) leistet die `Tooltip`-Komponente seit #403.
- **Anbieterkarte im Produkt:** Die Felder aus §5, etwa „Add to Selection“, sind eine Funktionsfrage und keine Copy.
- **Lokalisierung:** DE, ES und TR tragen den alten Satz und fallen für neue Schlüssel auf EN zurück (Entscheidung 09.10.2026).
- **Unterseiten:** `/how-it-works` und das Dashboard gehören nicht zum Handover. Ihre Zwischentitel und Dashboard-Labels sind unverändert.

## Prüfkriterien für Agenten

1. Steht eine Startseiten-Copy im Handover? Dann gilt sie wörtlich, außer eine Zeile der Abweichungstabelle sagt etwas anderes.
2. Markiert das Handover eine Fähigkeit mit CONFIRM BEFORE LAUNCH? Dann bleibt sie verborgen, bis sie live geprüft ist.
3. Widerspricht eine Zeile der Checkliste oder der DNA? Dann den Widerspruch benennen und nicht still auflösen.
