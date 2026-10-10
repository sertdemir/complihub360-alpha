# ADR-0009: Performance aus Fakten, Ranking ohne Annahmen, Buchungspause mit Einspruch, Tiefe ohne Vorteil

**Status:** ACCEPTED
**Date:** 2026-10-10
**Bezug:** *Provider Verification & Dashboard Implementation Specification* („Spec A") §14 (Matching and ranking), §16 (Dashboard modules), §17 (Performance dashboard and quality loop), §24 (Enforcement and appeal) · *Provider Dashboard Pricing & Operations Implementation Specification* v1.0 („Spec B") — „Dashboard navigation and modules", „Analytics and performance separation", „Technical and operational provider support", „Calendar" · [`KN-BRAND-001`](../../.knowledge/memory/nodes/KN-BRAND-001-complihub360-dna.md) §1, §3, §6 · ADR-0004 (Verifikationstiefe statt partner_status) · ADR-0007 („Offen": Serien-No-Shows, Verknüpfung der Vorfälle ins Matching) · `TKT-PROV-14`
**Entscheidungen des Nutzers (2026-10-10), alle sechs „ja":** Performance aus Buchungs-Fakten, Quoten ab 5 · Ranking ohne Annahmen · Serien-No-Shows 2/90 Tage Hinweis, 3 Buchungspause mit Einspruch, Nutzer nur Hinweis · Analytics-Tiefe basic/enhanced/advanced bei gleichen Fakten · Übersicht als Startseite, Anfragen-Seite abgehängt, echtes Profil, Hilfe mit Ticket · Nylas bleibt der eine Kalender, Verfügbarkeit je Wochentag, „Abwesend" sperrt

## Context

Das Inventar für Phase 6 (2026-10-10) fand im Partner-Dashboard Reste der stillgelegten Anfrage-Pipeline und mehrere Stellen, an denen die Oberfläche etwas behauptete, was der Code nicht tat:

- **Performance war nicht je Anbieter.** `GET /api/v1/metrics` las `engagement_requests` ohne Filter — jeder Partner sah dieselben globalen Quoten einer Pipeline, die es nicht mehr gibt. Was es wirklich gab (Buchungen, Vorfälle aus Phase 5, `completed_count`, verifizierte Reviews, Absagen), las keine Seite.
- **Das Ranking rechnete mit Annahmen.** Fehlten Daten, standen Bewertung 4,5, Bestätigungsrate 0,8 und Antwortfaktor 0,7 als Standardwerte. Ein Anbieter ohne einen einzigen Termin lag damit vor einem mit ehrlichen 4,2 aus zwölf Terminen. Die Vorfälle aus `provider_performance_incidents` flossen nicht ein, obwohl der Tabellenkommentar es versprach.
- **Analytics-Stufen** (`plan_catalog.analytics_level`) standen im Katalog und in der Vorschau, aber keine Oberfläche las sie.
- **Startseite** war die stillgelegte Anfragen-Seite; Benachrichtigungen lasen den Admin-Feed (für Partner immer 403); die Einstellungen trugen eine fest eingetragene Kanzlei; ein nicht eingebundener Ranking-Drawer mit erfundenen Gewichten 40/25/20/15 wurde ausgeliefert; der Hilfe-Drawer erklärte die alte Pipeline und versprach „4 h Antwortzeit", die niemand misst.
- **Kalender:** Nylas ist angebunden, aber die Slots waren feste Bürozeiten in Serverzeit für alle, und „Abwesend" wurde bei den Slots nicht beachtet.
- **Serien-No-Shows** beider Seiten hatte ADR-0007 ausdrücklich auf diese Phase verschoben.

## Decision

1. **Performance = Buchungs-Fakten.** `GET /provider/:key/performance` rechnet je Anbieter aus `scheduling`, `provider_performance_incidents` und `reviews`: Buchungen im Fenster, stattgefunden, Nutzer-No-Show, eigene No-Shows, Absagen beider Seiten, offene Widersprüche, Vorfälle im Vorfall-Fenster, Bewertung mit Anzahl, „würden wieder buchen". Jede Zahl trägt `count`, `of` und `rate`; die Quote steht erst ab `performance_policy.rate_min_bookings` (5), sonst `null`. Die alten Pipeline-Quoten fallen weg; `/api/v1/metrics` bleibt stehen, das Partner-Dashboard liest es nicht mehr. Kein „Trust Score", kein Wort „Score" (§17).

2. **Ranking ohne Annahmen.** Der Qualitätsfaktor (`qualityFactor`) besteht aus Bewertung aus Buchungen, Abschlussquote und Vorfällen. Fehlt einem Teil die Stichprobe, steht er neutral auf 0,5 — weder Bonus noch Strafe (§17 „Do not penalize … until there is sufficient, reliable data"). „Keine Vorfälle" ist eine Beobachtung, kein fehlender Wert, und zählt voll. `confirmation_rate`, `avg_response_hours` und `breach_count` der alten Pipeline liest das Ranking nicht mehr. `rank_basis` nennt `completed`, `bookings`, `incidents`, `window_days` und `neutral[]`, damit die Oberfläche sagen kann, was neutral stand. Gewichte stehen weiter nicht auf dem Draht (§14 Erklärbarkeit).

3. **Serien-No-Shows.** Direkt beim Vorfall ausgewertet (kein Wächter nötig): Anbieter mit zwei Vorfällen in 90 Tagen → Hinweis an die Mitglieder, Mail, `admin_alert`; drei → Buchungspause als Maßnahme nach §24 (`provider_enforcement_actions`, `source auto_no_show`, Vorfall-IDs als Beleg), `providers.booking_paused_at`. Die Pause sperrt Slots (`booking_open false, reason paused`) und `POST /scheduling` (409 `BOOKING_PAUSED`, ohne Grund auf dem Nutzer-Draht) und nimmt den Buchen-Knopf in der Detailansicht — nie die Sichtbarkeit (§14). Der Anbieter legt einmal Einspruch ein (`POST …/enforcement/:id/appeal`, mit Text); der Admin entscheidet (`PATCH /admin/providers/:key/enforcement/:id`, `lifted|upheld`). Nutzer mit zwei gemeldeten No-Shows in 90 Tagen → nur `admin_alert`, kein Gate (Beta).

4. **Analytics-Tiefe ohne Vorteil.** `basic` (Essential): die Fakten. `enhanced` (Growth): dazu `trends` nach Bereich, Land (aus dem Ledger der Buchung) und Monat. `advanced` (Global): dazu `?format=csv` (eine Zeile je Buchung, ohne Nutzerdaten); darunter 403 `ANALYTICS_LEVEL`. Fakten, Berechnung, Reviews und Ranking sind in jedem Tarif dieselben (Spec B „Analytics and performance separation").

5. **Übersicht als Startseite.** `GET /provider/:key/overview` liefert Spec B „Overview" aus vorhandenen Zeilen: Status (verifiziert, zahlungsbereit, Verfügbarkeit, Buchung offen mit Grund, Kalender verbunden), Tarif mit Rabattkontingent, belastete Leads des Zyklus, Guthaben, die nächsten drei Termine, offene Rückmeldungen und Widersprüche, auslaufende Nachweise (30 Tage), offene Maßnahme, Aufgaben mit Sprungziel. UI: Anfragen-Seite abgehängt, Benachrichtigungen auf den eigenen Feed, Einstellungen mit echtem Profil, Ranking-Drawer entfernt, Hilfe-Drawer mit echten Themen und Ticket über `POST /contact` (Lane `partner`, Referenz, „Antwort in der Regel binnen einem Werktag, für alle Tarife gleich" — ein Ziel, kein Versprechen). Keine Ticket-Tabelle: die Kontakt-Route speichert bewusst keine Nachrichten.

6. **Kalender.** Nylas bleibt der eine Kalender; offene Entscheidung Nr. 5 (Google/Microsoft-Sync) ist damit beantwortet. `providers.availability_hours` (Fenster je Wochentag, 30-Minuten-Raster, max. drei je Tag) und `providers.timezone` (IANA, per Intl geprüft) über `PATCH /provider/:key/availability` (derselbe Aufruf wie „Abwesend"). Die Slots entstehen aus den Fenstern in der Zeitzone des Anbieters, minus Buchungen, minus Kalender-Belegung; ohne Fenster gilt die bisherige Vorgabe. „Abwesend" sperrt die Slots (`reason ooo`). Keine Agenda-Ansicht.

7. **Alles Konfigurierbare liegt versioniert in `performance_policy`** (Mindeststichprobe, Fenster, Vorfall-Fenster, Schwellen für Hinweis und Pause, Nutzer-Schwelle).

## Consequences

- Neue Tabellen `performance_policy`, `provider_enforcement_actions`; `providers` + `availability_hours`, `timezone`, `booking_paused_at`. Keine gespeicherten Kennzahlen — jede Zahl ist auf ihre Zeilen zurückführbar.
- `rank_basis` wächst um Buchungs-Fakten und `neutral`; `response_hours` und `confirmation_rate` bleiben im Vertrag und stehen auf null.
- Die Slots-Antwort trägt `booking_open` und `reason`; `BookingErrorCode` + `BOOKING_PAUSED`, `PROVIDER_UNAVAILABLE`.
- Drei neue Benachrichtigungen an den Anbieter (`serial_no_show_alert`, `booking_paused`, `enforcement_decided`), eine Mail in vier Sprachen mit zwei Stufen; Admin-Hinweise als `event_log` `admin_alert`.
- Die Review-Pflicht mit Herabstufung aus dem Konzept vom 06.08. wird **nicht** gebaut — nur Erinnerung. Eine Herabstufung für fehlende Selbstauskunft widerspräche §17.

## Offen (benannt, nicht gelöst)

- **Meeting-Anbieter mit Zeitstempeln** (Entscheidung Nr. 4): Vorfälle kommen weiter aus Meldungen und Widersprüchen.
- **Ausnahmen für einzelne Tage** (Feiertage) in der Verfügbarkeit — dafür ist der verbundene Kalender da.
- **Ticket-Historie** für den Anbieter: bewusst keine Tabelle, solange die Kontakt-Route Nachrichten nicht speichert.
- **Nutzer-Gate** bei Serien-No-Shows: nur Hinweis; eine Prüfung oder Sperre braucht eine eigene Entscheidung.

## DNA-Check (KN-BRAND-001 §6)

- **Ehrlich, ohne Angst:** Was fehlt, heißt „noch zu wenig Daten", nicht „—" mit unsichtbarem Abzug. Die Hinweis-Mail nennt die Schwelle und den Einspruch; die Pause-Mail sagt, dass das Profil sichtbar bleibt.
- **Fairness zwischen Providern:** Fehlende Daten sind neutral; Vorfälle zählen nach Regel; der Tarif ändert weder Fakten noch Rang. Ein Anbieter ohne Daten liegt nicht vor einem mit ehrlichen Fakten.
- **Verantwortung, wenn etwas schiefgeht:** Die Pause ist dokumentiert, begründet, mit Belegen und Einspruch; der Admin entscheidet, nicht ein Zähler allein.
- **We do not create needs:** Die Tiefe ist ein Zusatz, nicht ein Schloss vor den Fakten; der CSV-Hinweis ist eine Zeile, kein Upsell-Kasten.
- **Derselbe Respekt:** Nutzer-Serien bekommen nur einen Hinweis an das Team; niemand wird automatisch gesperrt.
