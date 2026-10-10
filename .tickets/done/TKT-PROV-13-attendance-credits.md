---
title: "Provider Phase 5 — Anwesenheit, No-Show, Neubuchung, Guthaben, Erinnerungen"
assignee: "Claude"
status: "done"
---

# Provider Phase 5 — Anwesenheit, No-Show, Neubuchung, Guthaben, Erinnerungen

Sechste Phase des Provider-Plans (Spec B „Booking attendance, cancellation and
credits"; Spec A §14, §16, §17; ADR-0005;
[ADR-0007](../../docs/decisions/ADR-0007-attendance-no-show-credits.md)).
Nutzer-Entscheidungen 2026-10-10, alle sechs „ja": **Spec B gilt** (30 %
Guthaben nach 14 Tagen) · **`no_show_by`** statt neuer Statuswerte ·
**Selbstauskunft beider Seiten, Widerspruch 48 h** · **Erinnerungen** T−24h/T−1h
und Tag 1/5/10 · **30-Tage-Fenster** ohne zweite Gebühr · **zwei Umbuchungen**.

Backend, Canvas, Figma und lokale UI nach dem UI-Workflow (Canvas → Figma →
lokal; Staging nach dem Review des Nutzers).

## Objective

1. Nach dem Termin meldet der Anbieter, ob das Gespräch stattfand, der Nutzer
   fehlte oder die Plattform versagte; der Nutzer meldet weiter, wenn der
   Anbieter fehlte, und kann einer Meldung widersprechen.
2. Nutzer-No-Show: Gebühr bleibt, 14 Tage Neubuchung ohne zweite Gebühr mit
   drei Erinnerungen; danach 30 % der Gebühr als Plattform-Guthaben, nie
   Bargeld. Plattformfehler: Neubuchung ohne Gebühr, kein Guthaben, kein
   Vorfall. Anbieter-No-Show: Vorfall, kein Guthaben.
3. Terminerinnerungen T−24h und T−1h an beide Seiten.
4. Derselbe Nutzer beim selben Anbieter binnen 30 Tagen zahlt keine zweite
   Gebühr; zwei Umbuchungen je Buchung.
5. Guthaben wird mit der nächsten Abo-Rechnung verrechnet und in der Vorschau
   gezeigt.

## Acceptance Criteria

### Backend

- [x] Migration `20261010000000_attendance_credits.sql`: `attendance_policy`
  (v1), `scheduling` + `no_show_by`, `no_show_reported_*`, `attendance`,
  `dispute_*`, `rebook_deadline`, `rebooked_from`, `reschedule_count`,
  `rebook_reminders_sent`, `credit_decided_at`; `provider_performance_incidents`;
  `provider_credits.booking_id` + Unique-Index. pgTAP 12.
- [x] `attendance.ts`: `classifyAttendance` (Zehn-Minuten-Regel),
  `rebookDeadline`, `creditCents`, `appointmentReminderDue`,
  `rebookReminderDue`, `findRecentLead`, `canReschedule`, `disputeOpen`,
  `loadAttendancePolicy`; 20 Unit-Tests.
- [x] Routen: `PATCH /provider/:key/bookings/:id/attendance`; `PATCH
  /scheduling/:id` mit `no_show_by provider` + Vorfall, `action: dispute`,
  Umbuchungslimit, Neubuchung in der Frist ohne Gebühr; `POST /scheduling`
  hängt an den bestehenden Lead (30 Tage / offene Frist); `PATCH
  /admin/bookings/:id/dispute`; beide Buchungslisten mit den neuen Feldern.
- [x] Watcher: `runAppointmentReminderTick` (T−24h/T−1h, beide Seiten, Flags),
  `runRebookTick` (Tag 1/5/10, Frist → 30 % Guthaben + Ledger-Credit + Event
  `lead.credit_issued`, einmalig); Shadow zuerst.
- [x] Monatslauf: Guthaben als negative Rechnungszeile bis zur Rechnungssumme,
  Verbrauch in `provider_credits`; Vorschau mit `credit_applied_cents`,
  `credits`, `total_after_credit_cents`.
- [x] Benachrichtigungen (`appointment_reminder`, `no_show_reported`,
  `rebook_reminder`, `dispute_opened`, `dispute_resolved`, `credit_issued`,
  `performance_incident`), vier Mails in vier Sprachen, Typen, OpenAPI,
  ADR-0007, Korrekturnotiz im Notifications-Konzept.
- [x] API-Tests: 14 Blöcke (attended, Nutzer-No-Show neutral ohne Gebühr im
  Text, Plattformfehler, Anbieter-No-Show → Vorfall, Widerspruch binnen/nach
  48 h + Admin, Neubuchung ohne Gebühr, Umbuchungslimit, Mehrfachbuchung,
  Guthaben Shadow/Live/einmalig, kein Guthaben bei Plattformfehler oder
  offenem Widerspruch, Erinnerungen, Listen-Leak-Guard, Monatslauf).

### UI

- [x] Canvas (vier Sektionen × drei Varianten): Anbieter meldet Anwesenheit;
  Nutzer nach No-Show (Frist, Widerspruch) und nach Anbieter-No-Show
  (Neubuchung/Rematch); Guthaben in der Abrechnung; Erinnerungs-Mails.
  Wahl des Nutzers 2026-10-10: **1B · 2B · 3A · 4A** (Auswahlkarten mit
  Folge-Satz und Zehn-Minuten-Frage · neutraler Kasten mit Frist, Neubuchung,
  anderem Anbieter, Widerspruch bis · Minus-Zeile in der Vorschau mit
  Herkunfts-Unterzeile · Mails als reiner Text).
- [x] Figma-Seite „Anwesenheit & Guthaben (Phase 5)" (3641:22627): Anbieter
  Anwesenheit melden 3643:4080 · Nutzer nach dem No-Show 3644:4326 ·
  Abrechnung mit Guthaben 3645:441 · Mails 3646:528 · Notiz 3646:572.
- [x] Lokal: `api/bookings.ts` (`BookingAttendance` an beiden Listen,
  `reportAttendance`, `disputeNoShow`, `rescheduleBooking` mit Neubuchung
  und `RESCHEDULE_LIMIT`), LeadsPage (Rückmeldung offen zuoberst, drei
  Auswahlkarten, Zehn-Minuten-Frage, Zeile nach der Meldung), TerminePage
  (neutraler Kasten für Nutzer-No-Show, Anbieter-No-Show, Plattformfehler,
  Widerspruch offen; Widerspruch über ConfirmDrawer; Neubuchung über die
  RescheduleDrawer im Neubuchungs-Modus; `noShowNote` entfernt), BillingPage
  (grüne Minus-Zeile, Unterzeile je Guthaben, Rest, „nicht ausgezahlt"),
  Mock (Zustände, Attendance-PATCH, Widerspruch, Neubuchung, Guthaben),
  Locales en/de/es/tr, Screenshots.
- [x] Review des Nutzers → Staging: Migration per Supabase-MCP (9 Stücke,
  2026-10-10), Watcher live, Testlauf 2026-10-10 01:05–01:07 UTC (unten).

## Staging-Testlauf 2026-10-10

Buchung `f367f0c0…` (dahlmann-cpa, Ledger `cf0bb2b1…` 134,10 USD captured),
Slot per SQL auf 09.10. 10:00 gelegt, damit der Anbieter melden kann.

- **Mehrfachbuchung (Entscheidung 5) schon vorher bestätigt:** die zweite
  Buchung des Nutzers (`edb14a50…`, 12.10.) hängt per `rebooked_from` an
  der ersten, teilt deren Ledger, Event `booking_linked_to_lead`, keine
  zweite Gebühr. Anbieter-Karte: „Rebooking of an earlier appointment · no
  second lead fee"; Nutzer-Karte: „New appointment for an earlier booking".
- **Anbieter meldet (1B):** „Awaiting your report · 1", drei Auswahlkarten,
  Folge-Satz „until October 24 … 30 % ($40.23)", Zehn-Minuten-Frage, „Yes,
  report it" → `no_show`, `no_show_by user`, `rebook_deadline 2026-10-24`,
  Event `booking_user_no_show`, Notification `no_show_reported`, Mail
  `no_show_user` an den Nutzer **versandt** (Resend, nicht Outbox).
- **Nutzer-Kasten (2B):** „According to the provider, the appointment did
  not take place", Widerspruch bis Mo 12.10. (48 h), nach dem Vorziehen der
  Frist „The window … has passed". Alte Bianchi-Buchung (31.08., `no_show`
  ohne `no_show_by`) zeigt den Anbieter-No-Show-Kasten — Altdaten-Regel
  aus ADR-0007 greift.
- **Guthaben:** Frist per SQL auf 09.10.; Watcher-Tick 01:07:17 UTC →
  `provider_credits` +4023 USD (`user_no_rebook_30pct`, booking_id,
  ledger_id), Ledger-Zeile `kind credit` 4023 mit `refers_to` Charge,
  Event `lead.credit_issued` (pct 30), Mail `credit_issued_provider`
  versandt (Status 200), `credit_decided_at` gesetzt.
- **Nicht gelaufen:** Monatslauf `dry_run` (Admin-Key liegt nur in der
  VPS-`.env`); die Vorschau in der Partner-Abrechnung trägt die Minus-Zeile.

Nebenbefund aus dem Testlauf: Nutzer-Sidebar ohne „Neue Funktionen · Bald"
— Absicht aus #286 (Beta 14.10.), kein Fehler.

## Nicht in diesem Ticket

Meeting-Anbieter mit Zeitstempeln (Entscheidung Nr. 4) · Serien-No-Shows,
Downgrade, Gate (Phase 6) · Guthaben gegen Lead-Belastungen · Kalender-Sync
(Phase 6) · Webhooks (Produktion).

## DNA-Check

Betroffen: Copy (No-Show-Mail, Erinnerungen, Fehlerkasten), Monetarisierung
(Guthaben, Mehrfachbuchung), Provider-Policies, Ranking (Vorfall). Voller
Filter im ADR-0007. Harte Grenzen geprüft: keine Angst als Mittel (Frist als
Angebot, Widerspruch sichtbar), kein erzeugter Bedarf (keine zweite Gebühr
für denselben Kontakt), Performance statt Zahlung im Ranking, derselbe
Respekt auf beiden Seiten.
