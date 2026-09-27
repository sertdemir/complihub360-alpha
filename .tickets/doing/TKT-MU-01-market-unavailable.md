---
title: "marketUnavailable statt C3, wenn die Engine keinen Markt prüfen kann"
assignee: "Claude"
status: "doing"
---

# marketUnavailable statt C3

## Objective

Staging-Befund vom 27.09.2026: Mit Brasilien als einzigem Markt prüft die Engine
nichts. Die Seite sagt trotzdem „we did not identify an immediate requirement“,
und nur die fehlende Zeile „Markets“ verrät die Lücke. Stattdessen soll der
abgenommene Zustand `marketUnavailable` erscheinen, mit einer „Request This
Market“-Aktion, die tatsächlich etwas tut.

## Entscheidungen des Nutzers (27.09.2026)

- Auslöser: **nur wenn kein angefragter Markt geprüft werden kann**. Gemischte Fälle wie DE + BR bleiben vorerst C3.
- Anfrage: **eigenes Backend**. Ein Update gibt es nur mit Konto, für Gäste wird keine E-Mail gespeichert.
- Oberfläche: **erst Canvas mit 3 Varianten** (Redesign-Workflow), danach Figma und Code.

## Acceptance Criteria

- [x] Tabelle `market_requests` (eine Zeile je Anfragendem und Markt, `notify` nur mit `user_id`, RLS an, keine Policies) + pgTAP (10)
- [x] `POST /api/v1/market-requests`: öffentlich, Identität nur aus dem JWT, 403 bei `notify` ohne Konto, 409 bei abgedecktem Markt; 7 API-Tests, 3 Sabotagen erkannt
- [x] OpenAPI
- [x] Canvas mit D1–D3 (Zustand), E1–E3 (Anfrage als Gast), F1–F3 (Anfrage mit Konto)
- [ ] Wahl im Canvas → Figma → lokal (Screenshots) → Staging
- [ ] Versand des Updates, sobald ein Markt abgedeckt ist (`notified_at` liegt bereit, der Versand ist noch offen)

## DNA-Check

Betroffen sind **Risk Map** (Darstellung), **Registrierung und Gating** (Update nur mit Konto) und **Copy**.

- **Risiko ehrlich kommunizieren:** Wo die Engine nichts prüfen konnte, sagen wir genau das, statt „nichts gefunden“. Die bisherige Formulierung grenzte an falsche Entwarnung.
- **Show value before asking for commitment:** Die Anfrage selbst geht ohne Konto. Nur das Update braucht eines, und das aus einem sachlichen Grund: Wir hätten sonst keine Adresse. Wir speichern keine Gast-PII, um das zu umgehen.
- **Understate, don't overclaim:** Die Bestätigung verspricht keinen Termin („We can’t promise a date“, neue Copy, noch nicht abgenommen).

## Agent Audit Log

- [2026-09-27] **Claude**: Backend (Migration, pgTAP, API, Tests, OpenAPI) und Canvas. UI wartet auf die Wahl. (Status: doing)
