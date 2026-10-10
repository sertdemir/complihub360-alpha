# ADR-0007: Anwesenheit, No-Show und Guthaben — Selbstauskunft, Widerspruch, 30 % nach 14 Tagen

**Status:** ACCEPTED
**Date:** 2026-10-10
**Bezug:** *Provider Dashboard Pricing & Operations Implementation Specification* v1.0 („Spec B") — „Booking attendance, cancellation and credits" (Attendance verification · User cancellation or verified no-show · Provider no-show), „After booking", API-Events `booking.rescheduled`, `booking.cancelled`, `meeting.completed`, `lead.credit_issued` · *Spec A* §14 (Ranking: Complaint, cancellation and no-show history), §16/§17 (Performance, Credits) · [`KN-BRAND-001`](../../.knowledge/memory/nodes/KN-BRAND-001-complihub360-dna.md) §1, §3, §6 · ADR-0005 (Buchung → Belastung) · `TKT-PROV-13`
**Entscheidungen des Nutzers (2026-10-10), alle sechs „ja":** Spec B gilt (30 % Guthaben) · `no_show_by` statt neuer Statuswerte · Selbstauskunft beider Seiten mit Widerspruch binnen 48 h · Terminerinnerungen T−24h/T−1h und Neubuchungs-Erinnerungen Tag 1/5/10 · derselbe Nutzer beim selben Anbieter binnen 30 Tagen ohne zweite Gebühr · zwei Umbuchungen je Buchung

## Context

Phase 4 liefert die Belastung bei der Buchung und sagt ausdrücklich: „die Gebühr bleibt auch bei No-Show (Phase 5 regelt Guthaben)". Beim Inventar für Phase 5 zeigte sich:

- **`no_show` hieß stillschweigend „der Anbieter kam nicht".** Nur der Nutzer konnte den Status setzen (`PATCH /scheduling/:id`), die Oberfläche nannte ihn „Provider did not show". Spec B braucht dazu den **Nutzer**-No-Show (Guthabenpfad) und den **Plattformfehler** (Neubuchung ohne zweite Gebühr) — drei Fälle in einem Wort.
- **Niemand schrieb `provider_credits`.** Die Tabelle aus Phase 1 trug den Grund `user_no_rebook_30pct` und hatte keinen Schreiber; der Monatslauf stellte nur das Abo in Rechnung.
- **`reminder_24h_sent` und `reminder_1h_sent`** existierten seit August und wurden nie gelesen. Spec B nennt „three rebooking reminders" nach einem No-Show; Terminerinnerungen davor standen nur im alten Konzept, als offen markiert.
- **Das ältere Konzept widersprach Spec B**: `notifications-alerts-concept.md` sagte „kein Refund, kein Guthaben", die Nutzer-Copy `noShowNote` ebenso.
- **Mehrfachbuchung**: derselbe Nutzer konnte denselben Anbieter in einer neuen Sitzung erneut buchen, jede Buchung kostete die Gebühr (Staging-Befund 2026-10-09). Keine Spec-Regel, aber zwei Präzedenzfälle mit 30-Tage-Fenster (Klick-Ausschluss in Spec B, Detail-Öffnung in P3).
- **Zehn-Minuten-Regel ohne Zeitstempel**: Spec B verlangt einen Meeting-Link mit Join/Leave-Daten; der Meeting-Anbieter ist offene Entscheidung Nr. 4. Ohne ihn ist die Regel nicht automatisch prüfbar.

## Decision

1. **Spec B gilt.** Nutzer-No-Show ohne Neubuchung binnen 14 Tagen → 30 % der gezahlten Gebühr als Plattform-Guthaben, nie Bargeld; Lead und Follow-up-Recht bleiben beim Anbieter. Konzept und Nutzer-Copy tragen die Korrektur.

2. **Wer fehlte, steht in `no_show_by`** (`user | provider | platform`), analog `cancelled_by`. Keine neuen Statuswerte; bestehende `no_show`-Zeilen gelten als `provider`, denn das meinten sie. Plattformfehler → `cancelled` by `system` + `no_show_by platform`.

3. **Selbstauskunft beider Seiten, Widerspruch binnen 48 h.** Der Anbieter meldet über `PATCH /provider/:key/bookings/:id/attendance` (`attended | user_no_show | platform_failure`), der Nutzer meldet den Anbieter-No-Show weiter über `PATCH /scheduling/:id` und kann einem gemeldeten Nutzer-No-Show mit `{action:'dispute'}` widersprechen → `dispute_status open`; der Admin entscheidet (`upheld` → Vorfall, nie Guthaben · `dismissed` → Frist läuft weiter). Die Zehn-Minuten-Regel ist eine reine Funktion (`classifyAttendance`), die später die echten Zeitstempel bekommt; `scheduling.attendance` ist dafür reserviert.

4. **Erinnerungen**: Termin T−24h und T−1h an beide Seiten (die alten Flags werden endlich benutzt); Neubuchung Tag 1, 5, 10 der Frist an den Nutzer. Beide im Watcher, Shadow zuerst.

5. **Dieselbe Person beim selben Anbieter binnen 30 Tagen** (oder in einer offenen Neubuchungsfrist) zahlt keine zweite Gebühr: die Buchung hängt am bestehenden Lead (`rebooked_from`, geerbtes `lead_ledger_id`), kein Ledger, kein Zähler, Event `booking_linked_to_lead`. Eine Neubuchung in der Frist ist dasselbe über den Umbuchungs-Pfad.

6. **Zwei Umbuchungen je Buchung** (`reschedule_count`, 409 `RESCHEDULE_LIMIT`), danach nur Absage.

7. **Alles Konfigurierbare liegt versioniert in `attendance_policy`** (Wartezeit, Frist, Prozent, Widerspruchsfenster, 30-Tage-Fenster, Limit, Erinnerungsstufen), Spec B: „configurable rather than hard-coded".

8. **Guthaben im Monatslauf**: offenes Guthaben wird als negative Rechnungszeile bis zur Rechnungssumme verrechnet, der Verbrauch als negative `provider_credits`-Zeile; die Summe über `provider_credits` bleibt die Wahrheit. Die Vorschau zeigt Bestand, Verrechnung und Rest.

## Consequences

- `scheduling` trägt `no_show_by`, `no_show_reported_at/by`, `dispute_status`, `rebook_deadline`, `rebooked_from`, `reschedule_count`, `rebook_reminders_sent`, `credit_decided_at`, `attendance`; `provider_performance_incidents` ist neu; `provider_credits` hängt an der Buchung (ein positives Guthaben je Buchung, Unique-Index).
- Die Guthaben-Entscheidung fällt genau einmal (`credit_decided_at`), auch bei Shadow/Live-Wechsel; offener Widerspruch hält sie an.
- Der Nutzer-Draht trägt Fristen und Zustände, nie Gebühr, Band oder Guthaben (Leak-Guard-Test).
- Der Anbieter-No-Show ist ein Vorfall in `provider_performance_incidents`; Ranking folgt Performance, nie Zahlung (§14). Die Verknüpfung in die Matching-Priorität ist Phase 6.
- Beide älteren Quellen tragen die Korrektur: `notifications-alerts-concept.md` §3 (Notiz), `userws.noShowNote` (ersetzt).

## Offen (benannt, nicht gelöst)

- **Meeting-Anbieter mit Zeitstempeln** (Entscheidung Nr. 4). Bis dahin entscheidet die Selbstauskunft; der Widerspruch ist das Korrektiv.
- **Serien-No-Shows** auf beiden Seiten (Konzept: Downgrade, Gate) — Phase 6 mit der Performance-Konsolidierung.
- **Guthaben über die Abo-Rechnung hinaus**: Rest bleibt stehen; eine Verrechnung gegen künftige Lead-Belastungen ist nicht gebaut.

## DNA-Check (KN-BRAND-001 §6)

- **Ehrlich, ohne Angst:** Die No-Show-Mail an den Nutzer nennt die Frist als Angebot, den Widerspruch als Recht, und schließt Kosten aus. Kein Vorwurf, keine Dringlichkeit als Druck.
- **Verantwortung, wenn etwas schiefgeht:** Plattformfehler → Neubuchung ohne zweite Gebühr, ohne Vorfall, ohne Guthaben — die Plattform trägt ihren Fehler selbst.
- **Fairness zwischen Providern:** Guthaben nach Regel und Policy, nie nach Plan; der Anbieter-No-Show kostet Performance, kein Geld.
- **We do not create needs:** Eine zweite Gebühr für denselben Kontakt in 30 Tagen wäre eine Gebühr ohne neuen Bedarf — deshalb hängt die Buchung am bestehenden Lead.
- **Derselbe Respekt:** Nutzer und Anbieter melden mit denselben Mitteln; der Admin entscheidet nach Sachlage.
