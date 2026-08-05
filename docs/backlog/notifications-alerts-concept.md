# Konzept · Alerts, Reminders & E-Mail-Kommunikation

> **Status:** Beschlossen 2026-08-04 · Teil von [User-Flow & Matchmaking v2](user-flow-matchmaking-v2-spec.md) (§6/§7/§11).
> Deckt die Kommunikation **ab der Buchung** (Post-Handoff) inkl. Review-/Ranking-Schleife ab.

---

## Prinzipien

1. **Ein Event → zwei Kanäle:** jedes relevante Ereignis löst E-Mail (`mailer.ts`, i18n EN/DE/ES/TR) **und** In-App-Notification (Dashboard-Feed) aus.
2. **Beidseitig & symmetrisch:** User und Provider bekommen gespiegelte Kommunikation.
3. **Kontrolle bei uns:** der Watchdog (`watchers.ts`, Cron) treibt alles zeitgesteuert; das Admin-Cockpit sieht alles und kann eingreifen.
4. **Alles füttert das Ranking:** Outcome-, No-Show- und Review-Daten fließen in den Provider-Quality-Score (Ranking-Faktor, Spec §6) und einen internen Lead-Quality-Score (User, Bad-Actor-Schutz).
5. **Mehrwert-Prinzip (Beschluss P7):** bei Buchung erhält der Provider sofort das Dossier (Risk Map + User-Kontakt) → der Lead ist **bezahlt, unabhängig von No-Show/Storno**. Reveal ist beidseitig zum Buchungszeitpunkt, kein Storno-Fenster.

---

## 1 · Kommunikations-Lifecycle

| Zeitpunkt | Event | User bekommt | Provider bekommt | Kanal |
|---|---|---|---|---|
| **T0 Buchung** | `scheduling_confirmed` | Bestätigung + **Provider-Identität** + `.ics` + Reschedule/Cancel-Link | **Bezahlter Lead + Dossier** (Risk Map + User-Kontakt) + `.ics` + Prep | Mail + In-App |
| **T0** | `provider_lead_charged` | Beleg | Lead-Fee berechnet (Stripe) | Mail |
| **T−24h** | `reminder_24h` | Erinnerung + Agenda | Erinnerung + Dossier-Link | Mail + In-App |
| **T−1h** | `reminder_1h` | Erinnerung + Join-Link | Erinnerung + Join-Link | Mail + In-App |
| **Provider storniert** | `provider_cancelled` | Alert + **1-Klick-Re-Match** (Alternativ-Provider aus der Risk Map) | Storno-Bestätigung + Quality-Hinweis | Mail + In-App |
| **User storniert/rebucht** | `user_cancelled` / `user_rescheduled` | Bestätigung | Alert + Slot frei | Mail + In-App |
| **nach Termin-Ende** | `outcome_check` | „Hat der Termin stattgefunden?" | „Hat der Termin stattgefunden?" | Mail + In-App |
| **T+2h** | `review_request` | Bewerte den Provider → Ranking | Bewerte den Lead/User | Mail + In-App |
| **T+3d / T+7d** | `review_reminder` ×2 | Nudge falls offen | Nudge falls offen | Mail + In-App |
| **T+14d** | `review_closed` | Fenster zu | Fenster zu | — |

---

## 2 · Review-/Ranking-Schleife (beidseitig)

- **User → Provider:** Sterne + Kategorien (Fachkompetenz / Reaktion / Preis-Leistung) + optional Text → **Provider-Quality-Score** (Ranking-Faktor, Spec §6) und die **verifizierten Reviews**, die im anonymen Listing/Detail (Stufe 1/2) als Trust-Signal erscheinen.
- **Provider → User:** „War der Lead qualifiziert? Erschienen?" → interner **Lead-Quality-Score** (Bad-Actor-Schutz).
- Reviews aus echten bezahlten Terminen = die einzigen „verifizierten" Reviews.
- **Wichtig:** die User-Review wird **auch bei Provider-No-Show** ausgelöst (der No-Show IST das Qualitätssignal — siehe §3), nicht nur bei erfolgtem Termin.

---

## 3 · No-Show & Storno (= die Kontrolle)

**Provider-No-Show** (User meldet über `outcome_check`):
- User bekommt eine **E-Mail mit zwei Optionen**: (a) **neuen Provider** (1-Klick-Re-Match aus der Risk Map) *oder* (b) **CompliHub kontaktiert den Provider** und fragt nach / vermittelt.
- User wird zur **Review über den Provider** aufgefordert → No-Show schlägt aufs **Quality-Score/Ranking** durch.
- **Keine Geld-Gutschrift** (Mehrwert-Prinzip: der Provider hatte das Dossier). Lead-Fee bleibt.
- Serien-No-Shows → `partner_status=downgraded` + Admin-Alert.

**User-No-Show** (Provider meldet):
- Kein Refund (Mehrwert-Prinzip). Intern **Lead-Quality-Minus** für den User; Serien-No-Show-User → Gate/Prüfung.

**Provider-Storno vor Termin:** User wird aktiv aufgefangen (Re-Match), Provider-Quality-Hinweis.
**User-Storno/Reschedule:** Slot zurück in den Kalender, Provider informiert.

**Eskalation:** Anomalien (hohe Storno-/No-Show-Rate je Provider, Review-Backlog, geflaggte Bad-Leads) → **Admin-Cockpit** mit Eingriff (Re-Match, Provider kontaktieren/suspendieren).

---

## 4 · Technische Umsetzung

- **E-Mail:** `services/compliance-api/mailer.ts` (i18n EN/DE/ES/TR) — neue Templates je Event, `.ics`-Kalender-Anhänge.
- **In-App:** `event_log` → Notifications-Read-Model → User- & Provider-Dashboard-Feed (bestehen bereits).
- **Zeitsteuerung:** `services/compliance-api/watchers.ts` (Cron, bereits für SLA) erweitert — scannt `scheduling` nach fälligen Remindern (T−24h/T−1h), Outcome-Checks, Review-Nudges; emittiert Mail + Notification; eskaliert Anomalien.
- **Datenmodell neu/erweitert:**
  - `scheduling` — booking_id, provider_key, user_id, slot_start/end, status `confirmed|cancelled|completed|no_show`, reminder_flags, lead_charged bool.
  - `reviews` — id, booking_id, from_role (user|provider), to_role, rating, categories[], text, verified bool, created_at.
  - Event-Typen (event_log): `scheduling_confirmed`, `provider_lead_charged`, `reminder_24h`, `reminder_1h`, `provider_cancelled`, `user_cancelled`, `user_rescheduled`, `outcome_check`, `review_request`, `review_submitted`, `no_show`.
- **Admin-Kontrolle:** neue Cockpit-Lens „Meetings & Leads" (anstehende Termine, Storno-/No-Show-Rate je Provider, Review-Completion, geflaggte Bad-Leads).

---

## 5 · Offene Detailfragen (nicht build-blockierend)

- Reminder-Offsets final (T−24h / T−1h ok?).
- Reschedule-Limit (wie oft umbuchbar, bevor der Lead „verbraucht" ist?).
- Verifizierte-Review-Schwelle fürs Listing (ab wie vielen Reviews Rating anzeigen?).
- Kalender-Sync-Technik (Aggregator vs. eigenes OAuth) — offen bis Phase 2 (Spec §11).
