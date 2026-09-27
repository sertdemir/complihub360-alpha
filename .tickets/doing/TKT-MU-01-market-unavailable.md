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
- [x] Canvas-Wahl D3 · E3 · F3 (27.09.) → Figma 3470:2011 / 2129 / 2221, abgenommen
- [x] Migration auf Staging-Supabase eingespielt; Endpunkt live geprüft (200 Gast, Upsert, 403, 409), Testzeile entfernt
- [x] Lokal: Zustand statt C3, Zeilen je Markt (Gast), Bestätigung, Opt-in mit Konto; 7 Tests, 6 Sabotagen erkannt; Screenshots EN/DE/Mobil
- [x] Neue Copy abgenommen (27.09.) → `common:states.marketRequest.*`, im Copy-Waechter; „You can switch it off any time“ bleibt weg (Nutzer: „Abschalten weglassen“)
- [ ] Staging
- [ ] Versand des Updates, sobald ein Markt abgedeckt ist (`notified_at` liegt bereit, der Versand ist noch offen)

## DNA-Check

Betroffen sind **Risk Map** (Darstellung), **Registrierung und Gating** (Update nur mit Konto) und **Copy**.

- **Risiko ehrlich kommunizieren:** Wo die Engine nichts prüfen konnte, sagen wir genau das, statt „nichts gefunden“. Die bisherige Formulierung grenzte an falsche Entwarnung.
- **Show value before asking for commitment:** Die Anfrage selbst geht ohne Konto. Nur das Update braucht eines, und das aus einem sachlichen Grund: Wir hätten sonst keine Adresse. Wir speichern keine Gast-PII, um das zu umgehen.
- **Understate, don't overclaim:** Die Bestätigung verspricht keinen Termin („We can’t promise a date“, neue Copy, noch nicht abgenommen).

## Agent Audit Log

- [2026-09-27] **Claude**: Backend (Migration, pgTAP, API, Tests, OpenAPI) und Canvas. UI wartet auf die Wahl. (Status: doing)
- [2026-09-27] **Claude**: Staging-Migration, Figma D3/E3/F3, lokaler Rollout. Offen: Copy-Abnahme, Staging, Versand. (Status: doing)

## Offene Punkte für den Nutzer (Stufe 3)

- ~~„You can switch it off any time.“~~ Entschieden 27.09.: bleibt weg, kein Abschalten.
- **Das Update selbst wird noch nicht versendet** (`notified_at` liegt bereit). F3 speichert den Wunsch ehrlich, aber vor einem Livegang muss der Versand stehen, sonst verspricht die Checkbox etwas.
- **Die abgenommene Hero-Copy** sagt auch Gästen „choose whether you would like to receive an availability update“. Gäste können das nach der Entscheidung vom 27.09. nicht. Entweder eine Gast-Variante abnehmen oder so lassen.
- **Angemeldete Ansicht:** Die Anbieter-Spalte zeigt auch bei marketUnavailable Anbieter („Does not cover your market“), wie schon bei C3. Die Gast-Seite zeigt keine.
