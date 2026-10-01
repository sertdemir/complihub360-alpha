---
title: "Gemischte Märkte: die Risk Map nennt, was sie nicht geprüft hat"
assignee: "Claude"
status: "doing"
---

# Gemischte Märkte (DE + BR)

## Objective

Folge zu TKT-MU-01. Mit Deutschland und Brasilien prüft die Engine nur DE und
verwirft BR still. Die Map wirkte dadurch vollständig, auch für einen Markt,
den niemand angesehen hat. Jede Fläche nennt jetzt den nicht geprüften Markt und
bietet die bestehende Anfrage an (`POST /api/v1/market-requests`).

## Entscheidungen des Nutzers (01.10.2026)

- Canvas mit drei Varianten je Fläche, Wahl **I1 · J1 · K3**.
- I1, Gast mit Pflichten: je nicht geprüftem Markt ein Hinweis (Status Brand, kein Alarm) zwischen Kennzahlen und Tabelle.
- J1, Gast ohne Pflichten (C3): Zeile „Not checked“ unten in „What we checked“.
- K3, mit Konto: gestrichelte Karte oben in der Anbieter-Spalte, Opt-in für das Update standardmäßig aus, nur mit bekannter Adresse; Anbieter für die geprüften Märkte bleiben.
- Figma 3546:2497 / 2657 / 20736, abgenommen 01.10.2026.

## Acceptance Criteria

- [x] Copy `common:states.marketPartial.*` in en/de/es/tr, EN im Copy-Wächter
- [x] I1 · J1 · K3 in `ResultsRiskMap` (Auslöser: Engine hat geantwortet, mindestens ein Markt geprüft, mindestens einer nicht)
- [x] 5 neue Tests, 2 bestehende angepasst; 5 Sabotagen erkannt
- [x] Mock-Screenshots (Desktop, mobil, DE, mit Konto, Kontrolle nur DE)
- [ ] Review durch den Nutzer
- [ ] Staging
