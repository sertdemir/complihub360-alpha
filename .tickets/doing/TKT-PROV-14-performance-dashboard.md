---
title: "Provider Phase 6 — Performance aus Buchungen, Ranking ohne Annahmen, Serien-No-Shows, Analytics-Tiefe, Übersicht, Verfügbarkeit"
assignee: "Claude"
status: "doing"
---

# Provider Phase 6 — Performance, Ranking, Dashboard, Kalender

Siebte Phase des Provider-Plans (Spec A §14, §16, §17, §24; Spec B
„Dashboard navigation and modules", „Analytics and performance separation",
„Technical and operational provider support"; ADR-0007 „Offen").
Nutzer-Entscheidungen 2026-10-10, alle sechs „ja":

1. **Performance = Buchungs-Fakten.** Endpunkt je Anbieter aus `scheduling`,
   `provider_performance_incidents`, `reviews`: Buchungen, stattgefunden,
   Nutzer-No-Show, eigene No-Shows, Absagen, Bewertung mit Anzahl, offene
   Widersprüche. Pipeline-Quoten fallen weg. Quoten ab 5 Buchungen. Kein
   „Trust Score".
2. **Ranking ohne Annahmen.** Vorfälle und abgeschlossene Termine im
   Qualitätsfaktor; fehlen Daten, zählt der Faktor neutral statt 0,8/0,7/4,5.
   `rank_basis` nennt das offen.
3. **Serien-No-Shows.** Anbieter: 2 Vorfälle/90 Tage → Admin-Hinweis + Mail;
   3 → Buchungspause (§24) mit Einspruch, Sichtbarkeit bleibt. Nutzer: 2
   gemeldete No-Shows/90 Tage → Admin-Hinweis, kein Gate.
4. **Analytics-Tiefe.** basic: Fakten · enhanced: Verlauf nach Bereich, Land,
   Monat · advanced: CSV-Export. Fakten, Berechnung, Reviews für alle gleich.
5. **Dashboard.** „Übersicht" als Startseite; Anfragen-Seite abgehängt;
   Benachrichtigungen auf den eigenen Feed; Einstellungen mit echtem Profil;
   Ranking-Drawer raus; Hilfe-Drawer mit echten Themen und Ticket über
   `POST /contact` (Lane `partner`, Referenz, „Antwort binnen einem Werktag").
6. **Kalender.** Nylas bleibt der eine Kalender (offene Entscheidung Nr. 5
   beantwortet). Verfügbarkeitsfenster je Wochentag, Zeitzone, „Abwesend"
   sperrt die Slots. Keine Agenda-Ansicht.

Nicht in dieser Phase: Review-Pflicht mit Herabstufung (Konzept 06.08.) —
nur Erinnerung, keine Herabstufung (Spec A §17).

## Acceptance Criteria

### Backend

- [x] Migration: `performance_policy` (v1: rate_min_bookings 5,
  incident_window_days 90, incident_alert_count 2, incident_pause_count 3,
  user_no_show_alert_count 2), `providers.availability_hours jsonb`,
  `providers.timezone`, `providers.booking_paused_at`,
  `provider_enforcement_actions` (§24: Aktion, Grund, Quelle, Entscheider,
  Einspruch, Aufhebung). pgTAP.
- [x] `performance.ts`: `computePerformance`, `qualityFactor` (neutral ohne
  Daten), `serialNoShowState`, `availabilitySlots`, `analyticsDepth`,
  `trendsBy`. Unit-Tests.
- [x] Routen: `GET /provider/:key/performance` (Fakten; enhanced: Verlauf;
  advanced: `?format=csv`), `GET /provider/:key/overview`,
  `PATCH /provider/:key/availability` (+ hours, timezone), Slots mit
  Regeln/OOO/Pause, `POST /scheduling` 409 `BOOKING_PAUSED`,
  `POST /provider/:key/enforcement/:id/appeal`,
  `PATCH /admin/providers/:key/enforcement/:id` (aufheben/bestätigen).
- [x] Ranking: Vorfälle + `completed_count` im Qualitätsfaktor, neutrale
  Behandlung ohne Daten; `rank_basis` ergänzt.
- [x] Serien-No-Shows direkt beim Vorfall ausgewertet (Anbieter: Hinweis,
  Pause; Nutzer: Hinweis). Notifications, Mails (4 Sprachen).
- [ ] `/api/v1/metrics` nicht mehr vom Partner-Dashboard genutzt.
- [x] Typen, OpenAPI, ADR-0009, API-Tests (8 Blöcke: Performance je Tarif, CSV, Übersicht, Serien-No-Shows mit Pause, Einspruch und Aufhebung, Buchung in der Pause, Nutzer-Serie, Verfügbarkeit, Ranking ohne Annahmen).

### UI

- [ ] Canvas (vier Sektionen × drei Varianten): Übersicht · Performance mit
  Analytics-Tiefe · Verfügbarkeit · Hilfe und Support.
- [ ] Figma-Seite nach der Wahl des Nutzers.
- [ ] Lokal: OverviewPage (Landing), PerformancePage neu, SettingsPage
  (Profil echt, Verfügbarkeit), HelpDrawer neu, RankingImpactDrawer raus,
  NotificationsPage auf eigenen Feed, RequestsPage abgehängt, Nav nach
  Spec B, Locales, Mock, Screenshots.
- [ ] Review des Nutzers → Staging (Migration per Supabase-MCP, Testlauf).

## DNA-Check

Betroffen: Ranking/Matching (neutrale Behandlung ohne Daten, Vorfälle statt
Zahlung), Provider-Policies (Buchungspause mit Einspruch, Sichtbarkeit
bleibt), Copy (Performance ohne Score-Sprache, Hilfe ohne erfundene
Antwortzeit), Monetarisierung (Analytics-Tiefe ändert keine Fakten). Voller
Filter in ADR-0009.
