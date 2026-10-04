---
title: "„Gilt ab“-Datum für geplante Konditionsänderungen (Spec A §18)"
assignee: "Claude"
status: "done"
---

# „Gilt ab“-Datum für geplante Konditionsänderungen

Nutzer-Auftrag 2026-10-04: "baue das „gilt ab“-Datum für geplante Änderungen".
Folgeschritt zu TKT-PROV-08 (Change-Control). §18 nennt für Preis, Umfang,
Lieferzeit und Subunternehmer die Frist "before effective date". Bis dahin gab
es kein Datum: jede Freigabe galt sofort, `effective_at` trug nur den
Freigabezeitpunkt.

Canvas mit den Flächen A–E, je drei Varianten, editierbar. Wahl des Nutzers
(2026-10-04): **A V2 · B V1 · C V1 · D V2 · E V2**.

> Nummer: TKT-PROV-09 ist durch #251 (Tarifwahl) belegt.

## Umgesetzt (#255)

- **A V2: für alle Konditionen, in beide Richtungen.**
  - Die Regel „die Richtung zählt“ entscheidet weiter über die Prüfung, das Datum nur über den Zeitpunkt.
  - Eine ungünstigere Änderung wartet mit Datum. Wird sie vor dem Datum freigegeben, ist sie eingeplant (held · approved · `applied_at` leer).
  - Eine günstigere Änderung wird ohne Prüfung eingeplant. Nach der Übernahme wird sie nachgeprüft, wie jede Senkung.
  - Wird erst nach dem Datum freigegeben, gilt die Änderung ab der Freigabe, nie rückwirkend.
  - Ein Datum heute, in der Vergangenheit oder mehr als ein Jahr voraus gibt 400. Ohne Change-Control gibt es 422.
  - Das letzte Speichern eines Feldes gewinnt: Ein offener Vorgang desselben Ziels verliert das Feld. Ist er danach leer, gilt er als zurückgezogen.
- **Watcher:** `runScheduledChanges` im bestehenden Tick übernimmt fällige Vorgänge mit STALE-Prüfung. Ist ein Vorgang überholt, geht er zurück in die Prüfung (`under_review`). Im Shadow-Modus wird nur gezählt.
- **B V1:** Umschalter „Ab sofort / Ab einem Datum“ im Formular „Konditionen ändern“. Die Zusammenfassung nennt Prüfung und Datum.
- **C V1:** Pillen am Feld: „in Prüfung · ab …“, „freigegeben, ab …“, „geplant ab …“. Zurückziehen geht bis zum Datum.
- **D V2:** Auf der Anbieter-Detailseite stehen freigegebene, geplante Preise (`planned_prices`). Klein, ohne Farbe, ohne Countdown, für Erhöhung und Senkung gleich.
- **E V2:** In der Queue ist das Datum die Frist. Der Drawer warnt bei weniger als 3 Werktagen. Die Freigabe plant ein, und die Mail `approved_scheduled` nennt das Datum.
- **Migration** `20261004000000_change_schedule.sql`:
  - Ein eingeplanter Vorgang braucht ein Datum.
  - Teilindex für den Watcher.
  - pgTAP-Test `11_change_schedule_test.sql`.
- **OpenAPI** ergänzt. Figma: Section „Gilt ab · Canvas-Wahl 04.10.2026“ im Screens-File.

## Abschluss

- Gemergt als #255 am 2026-10-04. Die Migration ist am selben Tag auf Staging eingespielt; die Tabelle war leer, die neue Bedingung greift also an keinem Altbestand.
- **Betrieb:** Auf Staging läuft der Watcher bereits scharf.
  - `WATCHERS_SHADOW=false` ist seit 2026-08-09 gesetzt, siehe `docs/backlog/notifications-alerts-concept.md`.
  - Der Scheduler läuft im API-Prozess alle 5 Minuten (`WATCHERS_ENABLED`, `WATCHERS_TICK_MS`).
  - Beleg: echte Marker ohne `_shadow` in `event_log`, zuletzt 2026-10-01; Shadow-Marker gibt es seit August keine mehr.
  - Eingeplante Änderungen gehen damit beim ersten Tick nach Mitternacht UTC live, ohne weitere Einstellung.
- **Restrisiko:** Der Tick hängt am laufenden API-Prozess. Schläft die Instanz oder startet sie neu, wird der Tick erst beim nächsten Lauf nachgeholt. Das ist idempotent, die Übernahme kommt dann nur später.
