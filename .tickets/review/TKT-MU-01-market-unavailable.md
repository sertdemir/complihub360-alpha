---
title: "marketUnavailable statt C3, wenn die Engine keinen Markt prüfen kann"
assignee: "Claude"
status: "review"
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
- [x] Staging (27.09., Build `ccee4718`)
- [x] Versand des Updates (01.10.): Watcher-Pass `runMarketCoverageTick`, einmal je Zeile mit Claim über `notified_at`, Adresse aus `auth.users` per `auth_user_email_by_id` (nur bestätigt), Sprache der Anfrage (`locale`, Migration 20261001184141); 7 API-Tests + 9 pgTAP, 5 Sabotagen erkannt
- [x] Mail-Copy abgenommen (01.10., nach echter Mail auf Staging); EN und DE im Test wortgleich festgehalten
- [x] Migration 20261001184141 auf Staging (vor dem Merge von #231)
- [x] Staging Ende-zu-Ende (01.10., Build `48488f1c`): Gast-Anfrage mit `de-DE` → `locale = de`; Testzeile DE + notify mit Konto `+madrid` → nächster Takt sendet über Resend (200), Mail kommt an (DE, Link `/de/wizard`), `notified_at` gesetzt, der folgende Takt sendet nicht erneut; Testzeilen entfernt

## DNA-Check

Betroffen sind **Risk Map** (Darstellung), **Registrierung und Gating** (Update nur mit Konto) und **Copy**.

- **Risiko ehrlich kommunizieren:** Wo die Engine nichts prüfen konnte, sagen wir genau das, statt „nichts gefunden“. Die bisherige Formulierung grenzte an falsche Entwarnung.
- **Show value before asking for commitment:** Die Anfrage selbst geht ohne Konto. Nur das Update braucht eines, und das aus einem sachlichen Grund: Wir hätten sonst keine Adresse. Wir speichern keine Gast-PII, um das zu umgehen.
- **Understate, don't overclaim:** Die Bestätigung verspricht keinen Termin („We can’t promise a date“, neue Copy, noch nicht abgenommen).

## Agent Audit Log

- [2026-09-27] **Claude**: Backend (Migration, pgTAP, API, Tests, OpenAPI) und Canvas. UI wartet auf die Wahl. (Status: doing)
- [2026-09-27] **Claude**: Staging-Migration, Figma D3/E3/F3, lokaler Rollout. Offen: Copy-Abnahme, Staging, Versand. (Status: doing)
- [2026-10-01] **Claude**: Versand des Markt-Updates (Migration, Mailer, Watcher, Client-Sprache). Offen: Mail-Copy-Abnahme, Staging-Migration. (Status: doing)
- [2026-10-01] **Claude**: #231 gemergt, Staging Ende-zu-Ende geprüft, Mail-Copy abgenommen. Offen bleiben nur die Hero-Copy für Gäste und die Anbieter-Spalte (s. u.). (Status: doing)
- [2026-10-01] **Claude**: G2 + H3 Canvas → Figma (3537:15183, 3537:15204) → lokal; 4 Sabotagen erkannt. (Status: doing)
- [2026-10-01] **Claude**: #237 gemergt (`6a93c839`), G2 auf Staging geprüft (EN/DE), H3 lokal und im Test. Alle Kriterien erfüllt → review (Nutzer: „schieb das Ticket nach review“). (Status: review)

## Offene Punkte für den Nutzer (Stufe 3)

- ~~„You can switch it off any time.“~~ Entschieden 27.09.: bleibt weg, kein Abschalten.
- ~~Versand des Updates fehlt~~ gebaut 01.10.
- ~~Hero-Copy für Gäste~~ Canvas-Wahl G2 (01.10.): eigener Gast-Satz ohne Update-Wahl (`common:states.marketRequest.guestMessage`), eingeloggt bleibt der abgenommene.
- ~~Anbieter-Spalte eingeloggt~~ Canvas-Wahl H3 (01.10.): bei marketUnavailable keine Anbieter-Karten, sondern der abgenommene Zustand `noProviderMatch`.
