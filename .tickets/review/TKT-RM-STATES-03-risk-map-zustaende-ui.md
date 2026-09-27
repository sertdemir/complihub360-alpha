---
title: "Risk Map, leere Zustände A3 · B3 · C3 als Fläche (UI-Workflow Stufe 3)"
assignee: "Claude"
status: "review"
---

# Risk Map, leere Zustände A3 · B3 · C3 als Fläche

## Objective

Die Figma-Frames (abgenommen am 27.09.2026) im Gast-Zweig von `ResultsRiskMap`
umsetzen. Bis hierhin stand dort für Laden, Fehler und „nichts gefunden“ jeweils
ein Banner unter einer unsichtbaren Überschrift. Jetzt ist der Zustand die
ganze Seite.

## Acceptance Criteria

- [x] A3 Laden: Eyebrow, h1 „Creating your Risk Map“, Satz, Fortschrittsbalken ohne Prozentzahl, Tabellen-Skelett (`aria-hidden`, Shimmer, bei reduced-motion still)
- [x] B3 Fehler: h1, Satz, Try Again, Contact Support, Umfangs-Box „What we tried to assess“ (nur mit Profil), Technical details mit Referenz-ID und UTC-Zeit (nur mit echter Referenz, standardmäßig zu)
- [x] C3 nichts gefunden: h1, Satz, Umfangs-Box „What we checked“ (nur mit Profil), keine Kennzahlen, keine Anbieter, kein Schluss-Band. „Save this map“ oben bleibt.
- [x] Kopfzeile: Guest actions nur mit Ergebnis (C3), bei A3/B3 aus
- [x] Copy wortgleich aus `common:states.*`, `copy:check` grün
- [x] Screenshots lokal (Desktop 1440, mobil 390, DE)

## Design / Tech Details

- Figma: Screens-Datei `0tJtkBs5hsgswwBi9m1slJ`, Section `3390:14594`
  (A3 `3392:1958`, B3 `3392:2068`/`3392:2221`/`3392:2348`, C3 `3392:2425`/`3392:2522`, Übergabe-Notiz `3392:2571`).
- Bausteine: `apps/vs1-demo/ui/src/components/results/RiskMapState.tsx`.
- „What we checked“ spiegelt die Suche: Heimatmarkt (sonst DE, wie `runSearch`) plus Zielmärkte, gefiltert mit `isKnownCountry` aus der Engine. Märkte ohne Länderprofil verwirft die Engine still, also darf die Box sie nicht als geprüft nennen. „What we tried to assess“ nennt die Anfrage, wie sie gestellt war.
- Nebenbei: „Save this map“ oben trug `text-primary-950`, also dunkle Schrift auf Petrol. Das stammt aus der Zeit, als Primär noch Türkis war (vor 20.09.). Jetzt ist die Schrift weiß wie in Figma.
- Die eingeloggte Ansicht (`SessionSnapshot`, Slot `emptyState`) bleibt beim Banner. Für sie gibt es kein Figma-Pendant.

## DNA-Check

Betroffen: **Risk Map** (Darstellung), **Monetarisierung** (CTA-Platzierung), **Copy**.

- **Würden wir das auch ohne Transaktion empfehlen?** C3 zeigt keine Anbieter-Karten und kein „Save your map“-Band mehr. Wo wir keinen Bedarf festgestellt haben, bieten wir auch keinen an („We do not create needs“).
- **Risiko ehrlich kommunizieren:** Die Umfangs-Box nennt unter „What we checked“ nur Märkte, die die Engine wirklich geprüft hat. Ein „nichts gefunden“ für einen ungeprüften Markt wäre falsche Entwarnung.
- **Zugang zum Menschen:** Contact Support steht direkt neben Try Again. Die Referenz-ID macht den ersten Kontakt gleich zum hilfreichen.

## Agent Audit Log

- [2026-09-27] **Claude**: Bausteine, Umbau Gast-Zweig, 6 neue Tests, 3 angepasst, 3 Sabotagen erkannt; UI 243/243, Build grün, Screenshots. (Status: review)
