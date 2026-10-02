---
title: "Change-Control für aktive Partner (Spec A §18–20, §28)"
assignee: "Claude"
status: "doing"
---

# Change-Control für aktive Partner

Nutzer-Auftrag 2026-10-01: "baue das Change-Control für aktive Partner". Das war
in TKT-PROV-02 als Phase 6 vertagt. Bis dahin ging jede Änderung eines aktiven
Partners sofort live, auch Preise. Rechtsform und Vertretung landeten nur im
Protokoll (`legal_fields_changed`).

Canvas mit Regelwerk (A) und den Flächen B–F, je drei Varianten:
https://claude.ai/artifact/RkuJJ8vdULp8EBHEyRKkhd. Die Wahl des Nutzers steht
noch aus.

## Teil 1: Backend (in diesem Ticket, unabhängig von der Wahl)

- `services/compliance-api/src/changeControl.ts`
  - Eine Regel je Feld: Tabelle, Änderungsart, Fristklasse §18, Wirkung je Policy (`spec`, `all_reviewed`, `direction`).
  - Die Wahl in Canvas A ist eine Zeile: `CHANGE_POLICY`, bis zur Wahl `direction` (Empfehlung V3).
  - `classify()` ist rein und einzeln getestet.
- Schreibweg:
  - `PATCH /provider/:key/application` und `PATCH /provider/:key/services/:id` teilen auf in sofort, sofort mit Prüfvorgang (`effect = applied`) und wartet (`effect = held`, der Live-Wert bleibt).
  - Kontrolliert sind aktive Partner (active, limited, reverification_due, paused, suspended), bei Leistungen nur freigegebene.
  - Ein offener wartender Vorgang wird fortgeschrieben. Ein Feld gleich dem Live-Wert ist keine Änderung und zieht nichts zurück, weil die Oberfläche ganze Kapitel schickt. Zurückziehen geht nur per `DELETE`.
- Partner-Routen:
  - `GET /provider/:key/changes`
  - `DELETE /provider/:key/changes/:id` (nur Wartendes)
  - `POST /provider/:key/material-event`: pausiert die gewählten Leistungen sofort, der vorherige Status wird festgehalten.
- Admin-Routen:
  - `GET` und `POST /admin/review/:key/change/:id`.
  - Entscheidungen je Wirkung. `STALE_CHANGE` statt Überschreiben, wenn sich der Live-Wert inzwischen geändert hat.
  - Begründung Pflicht bei Ablehnung, Nachprüfung und verlängerter Pause.
  - Die Queue zeigt auch `under_review`.
- Ownership: Die neuen Routen stehen in `OWN_PROVIDER_ROUTE` und in der Ownership-Testliste.
- Migration `20261002000000_change_control.sql`:
  - Neue Spalten: `effect`, `applied_at`, `provider_note`, `reviewer_note`, `event_type`, `occurred_on`, `affected_service_ids`.
  - Ein Ereignis ist immer `immediate_24h`. Abgelehnt wird nur mit Begründung.
  - Höchstens ein offener wartender Vorgang je Ziel.
- OpenAPI ist nachgezogen.

## Teil 2: Oberflächen (nach der Canvas-Wahl)

Partner: Speichern (B), offene Änderung (C), Ereignis melden (D). Prüfteam:
Entscheid (E). Nutzer: betroffener Termin (F). Danach Figma, dann lokal.

## Bewusst offen

- **Mails** an Partner bei einer Entscheidung (§26 "change status") und an betroffene Nutzer (F). Die Copy entsteht mit den Flächen, nicht vorher.
- **"Gilt ab"-Datum** für geplante Preisänderungen (§18 "before effective date where planned"). Heute gilt eine Freigabe sofort.
- **Mock-Daten** für die Flächen kommen mit Teil 2.

## DNA-Check

Betroffen: Provider-Policies (welche Änderung wartet, was pausiert), Copy der
Antworttexte.

- **Nutzer zuerst:** Nichts, was Nutzern schadet (Preis rauf, Umfang anders), geht ungeprüft live. Gebuchte Termine behalten ihren Preis-Snapshot (§20).
- **Fairness zwischen Providern:** Dieselbe Regel für jeden Partner, unabhängig von Tarif und Größe. `CHANGE_POLICY` kennt keinen Plan.
- **Ehrliches Risiko ohne Angst:** Wer ein Ereignis meldet, handelt richtig. Die Antwort nennt, was pausiert ist, und droht nicht. Abgelehnt wird nur mit Begründung, die der Partner liest.
- **User-first heißt nicht anti-provider:** Tatsachen, die schon eingetreten sind (neuer Name, neue Adresse), werden nicht aufgehalten. Das Dossier bleibt richtig, geprüft wird danach.
- **Die Policy-Wahl selbst** (Canvas A) liegt beim Nutzer. `direction` ist nur gesetzt, bis er wählt.

## Verifikation

- `compliance-api`: 343 Tests, davon 13 Unit-Tests `changeControl.test.ts` und 10 Ablauf-Tests plus 3 Ownership-Fälle in `api.test.ts`.
- `npm run db:test`: 11 Dateien, 176 Tests, davon 12 neu in `10_change_control_test.sql`.
- `tsc` compliance-api grün.
