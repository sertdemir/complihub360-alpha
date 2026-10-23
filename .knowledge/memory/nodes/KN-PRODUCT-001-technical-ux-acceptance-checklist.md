---
id: KN-PRODUCT-001
title: "CompliHub360 Technical and UX Acceptance Checklist v1.0"
type: knowledge-node
domain: product
version: "1.0"
status: canonical
authority: reference
date_added: "2026-10-23"
document_date: "2026-09-19"
vault_ref: "../../vault/product/CompliHub360_Technical_UX_Acceptance_Checklist_V1.0.docx"
vault_text: "../../vault/product/CompliHub360_Technical_UX_Acceptance_Checklist_V1.0.md"
sha256_docx: "1561d431e8c7d4e7a7da8ef4b26e152214a5a6c2614da44a38e11f3c90ad7df6"
binds:
  - product
  - ux
  - ui
  - copy
  - privacy
  - matching
  - release
supersedes: []
relates_to:
  - id: KN-BRAND-001
    relation: "untergeordnet — bei Widerspruch gewinnt die DNA"
  - id: website-implementation-handover-v1.1
    relation: "Die Checkliste stützt das Handover V1.1. Das Handover liegt nicht im Repo."
tags: [launch, en-first, state-copy, privacy-tests, terminology, release-gates]
---

# KN-PRODUCT-001 — Technical and UX Acceptance Checklist v1.0

> Macht aus der abgenommenen User Journey testbares Produktverhalten und liefert die
> **abgenommene englische Oberflächen-Copy** für unvollständige, nicht verfügbare,
> ladende und fehlgeschlagene Zustände. Stand des Dokuments: 19.09.2026.

## Was dieser Knoten ist

Die Checkliste ist der Maßstab für den **EN-Launch**. Englisch zuerst; Deutsch, Spanisch und Türkisch folgen über eine kontrollierte Lokalisierung. Sie ist `reference`, nicht `source-of-truth`. Widerspricht sie der DNA ([`KN-BRAND-001`](KN-BRAND-001-complihub360-dna.md)), gewinnt die DNA. Den Widerspruch benennen.

Sie gehört zum **Website Implementation Handover V1.1**. V1.0 des Handovers ist nur Archiv und Vision. Es darf nicht als Umsetzungsvorlage dienen, und nichts, was nur dort steht, wird gebaut.

## Kernaussagen

1. **Release Decisions** (sieben Punkte):
   - „Risk Map" bleibt der Produktname und steht unter „Assess My Needs".
   - Verfügbarkeit kommt aus echten Länder-, Pflicht- und Anbieterdaten.
   - EN first.
   - Status-Labels werden übersetzt, die internen Schlüssel bleiben englisch.
   - Zero und One Match nutzen die abgenommene Copy.
   - Es wird nur Unterstütztes veröffentlicht, Beta ehrlich gekennzeichnet.
   - Jedes Gate bekommt einen Owner und ein Datum.
2. **Approved UX State Copy:** 17 Zustände, je mit Heading, Message und Action. Dazu die **Information Sharing Confirmation** vor der Buchung (Heading, Body, Bestätigung, Buttons). Die Texte gelten **wörtlich**.
3. **Privacy Critical Acceptance Tests:** 10 Fälle. Dazu gehören Anonymität vor der Buchung, Identität nur nach Buchung und Bestätigung, nur der gebuchte Anbieter bekommt die Daten, Payload ohne identifizierende Daten (nicht nur per CSS versteckt), Autorisierung, Datenminimierung und Audit.
4. **Matching und Ranking:** Kein Pay-to-rank (Tarif, Gebühr, Werbung und Firmengröße verbessern nichts). Die Faktoren sind belegbar, und Singular und Plural der Copy stimmen.
5. **Terminologie:** 11 Umbenennungen, ein Lint-Test auf verbotene Begriffe, gemeinsame Konstanten für Status und Priorität. Tooltips dürfen nicht nur per Hover funktionieren, und Farbe darf nie allein Bedeutung tragen.
6. **Availability:** Abdeckung aus aktiven Anbieterdaten, nie „Available globally" auf Absicht hin. Ein Anbieter ergibt den Singular-Zustand, begrenzte Abdeckung ist unterscheidbar.
7. **Accessibility und Localization:** Tastatur und sichtbarer Fokus, ruhige Lade-Ansagen, Fehlerübersicht mit Fokus, kein Rückfalltext in falscher Sprache, Title Case nur im Englischen, Layout mit langen deutschen und türkischen Strings.
8. **Release Gates und Sign-off:** 16 Gates mit empfohlener Owner-Rolle sowie Namen und Datum (leer). Dazu zehn Sign-off-Punkte und fünf Freigaberollen.

## Bewusste Abweichung (vom Nutzer entschieden)

| Checkliste | Produkt | Grund |
|---|---|---|
| „Immediate or Critical → **Urgent**" | oberste Stufe heißt **Immediate** | DNA #54 „Prioritize without panic": ein Zeitwort statt eines Druckworts. Vom Nutzer am 10.10.2026 bestätigt. Begründung in `scripts/check-terminology.mjs`. |

## Wo das im Code durchgesetzt wird

| Anforderung | Wächter |
|---|---|
| State-Copy und Sharing-Dialog wörtlich | `npm run copy:check` (`scripts/check-approved-copy.mjs`) |
| Verbotene Begriffe | `npm run terminology:check` (`scripts/check-terminology.mjs`) |
| Priorität als gemeinsame Konstante | `apps/vs1-demo/ui/src/lib/priority.ts` |
| Kein Rückfalltext in falscher Sprache | `npm run i18n:check` |

## Umsetzungsstand (gemessen 2026-10-23 auf `main`)

- **Wortgleich vorhanden:** alle 17 State-Texte (Heading, Message, Actions) und die Sharing-Bestätigung stehen in den englischen Sprachdateien bzw. im UI-Code (maschineller Abgleich gegen die Extraktion).
- **Eingebaut oder bewusst zurückgestellt:** 16 von 17. „More information needed" und „Alternative available" warten auf ihre Funktionen.
- **Erledigt:** Launch-Scope-Audit (#276), Zustände (#291), Terminologie (#297), Privacy-Tests zugeordnet (#300).
- **Offen:**
  - Availability-Audit
  - A11y-Audit: Tastatur und Fokus, Lade-Ansagen, Fehler-Fokus, Tooltips, Farbe
  - Prüfung mit langen deutschen und türkischen Strings
  - Owner und Datum je Gate, Sign-off: Das entscheidet der Mensch.
  - Aufbewahrungsfrist für den Audit-Record: Die Zahl kommt vom Nutzer.
- **Lokalisierung:** DE, ES und TR sind seit 09.10.2026 bewusst pausiert („Erst Englisch fertig"). Fehlende Schlüssel fallen auf EN zurück. Das widerspricht dem Punkt „Localized pages contain no unintended English fallback text", bis die Lokalisierung nachzieht.

## Prüfkriterien für Agenten

Wer Copy, Zustände, Matching, Verfügbarkeitsaussagen, Buchung oder Offenlegung anfasst:

1. Gibt es für den Zustand abgenommene Copy? Dann gilt sie wörtlich, im Englischen ohne Paraphrase.
2. Behauptet die Fläche eine Fähigkeit, die nicht live ist? Dann verbergen oder als Beta kennzeichnen.
3. Kann ein Anbieter vor der Buchung identifiziert werden, im Browser-Payload oder in der API? Dann ist das ein Blocker.
4. Fließt ein kommerzielles Merkmal in Score oder Rang? Dann ist das ein Blocker.
5. Neuer Begriff in der Oberfläche? Gegen die Terminologie-Tabelle prüfen.
