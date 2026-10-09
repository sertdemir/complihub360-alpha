-- ════════════════════════════════════════════════════════════════════════════
-- Provider Phase 5: Anwesenheit → No-Show → Neubuchung → Guthaben
-- ════════════════════════════════════════════════════════════════════════════
--
-- Spec B "Booking attendance, cancellation and credits", Spec A §14/§16/§17,
-- ADR-0007. Entscheidungen des Nutzers vom 2026-10-10: Spec B gilt (30 %
-- Guthaben nach 14 Tagen ohne Neubuchung, kein Bargeld); `no_show_by` statt
-- neuer Statuswerte; Selbstauskunft beider Seiten mit Widerspruch binnen
-- 48 h; Terminerinnerungen T-24h/T-1h und Neubuchungs-Erinnerungen Tag
-- 1/5/10; derselbe Nutzer beim selben Anbieter binnen 30 Tagen ohne zweite
-- Gebuehr; zwei Umbuchungen je Buchung.
--
-- Was diese Migration anlegt:
--   1. attendance_policy               — alles Konfigurierbare, versioniert
--   2. scheduling                      — wer nicht kam, Widerspruch, Frist,
--                                        Neubuchungs-Kette, Umbuchungs-Zaehler
--   3. provider_performance_incidents  — der Vorfall, wenn der Anbieter fehlte
--   4. provider_credits                — Guthaben haengt an der Buchung
--
-- Was sie bewusst NICHT tut: neue Statuswerte fuer scheduling. `no_show`
-- bedeutete bisher stillschweigend „der Anbieter kam nicht" (gesetzt vom
-- Nutzer). Spec B braucht dazu den Nutzer-No-Show und den Plattformfehler.
-- Wer fehlte, steht jetzt in `no_show_by` — wie `cancelled_by` bei der
-- Absage (20260831000001). Bestehende no_show-Zeilen werden als Anbieter-
-- No-Show nachgetragen, denn genau das meinten sie.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. Die Regeln als Konfiguration
-- ════════════════════════════════════════════════════════════════════════════
--
-- Spec B: "must be configurable rather than hard-coded". Eine Zeile je
-- Fassung; die API liest die juengste mit effective_from <= heute. Die
-- Buchung traegt keine Policy-Version — die Frist wird beim No-Show in
-- `rebook_deadline` eingefroren, das genuegt fuer die Belegbarkeit.

CREATE TABLE IF NOT EXISTS public.attendance_policy (
  version                integer     PRIMARY KEY,
  provider_wait_minutes  integer     NOT NULL CHECK (provider_wait_minutes BETWEEN 0 AND 60),
  rebook_days            integer     NOT NULL CHECK (rebook_days BETWEEN 1 AND 90),
  credit_pct             integer     NOT NULL CHECK (credit_pct BETWEEN 0 AND 100),
  dispute_hours          integer     NOT NULL CHECK (dispute_hours BETWEEN 1 AND 720),
  same_user_window_days  integer     NOT NULL CHECK (same_user_window_days BETWEEN 0 AND 365),
  reschedule_limit       integer     NOT NULL CHECK (reschedule_limit BETWEEN 0 AND 10),
  reminder_offsets_min   integer[]   NOT NULL,
  rebook_reminder_days   integer[]   NOT NULL,
  effective_from         date        NOT NULL DEFAULT current_date,
  note                   text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  CHECK (cardinality(reminder_offsets_min) BETWEEN 0 AND 5),
  CHECK (cardinality(rebook_reminder_days) BETWEEN 0 AND 5)
);

COMMENT ON TABLE public.attendance_policy IS
  'Anwesenheits-, Neubuchungs- und Guthabenregeln (Spec B "Booking attendance, cancellation and credits"), versioniert. Zehn Minuten Wartezeit des Anbieters, 14 Tage Neubuchungsfrist, 30 % Guthaben, 48 h Widerspruch, 30 Tage ohne zweite Gebuehr fuer denselben Nutzer, zwei Umbuchungen, Erinnerungen vor dem Termin (Minuten) und zur Neubuchung (Tage nach dem No-Show).';

INSERT INTO public.attendance_policy
  (version, provider_wait_minutes, rebook_days, credit_pct, dispute_hours, same_user_window_days, reschedule_limit, reminder_offsets_min, rebook_reminder_days, effective_from, note)
VALUES
  (1, 10, 14, 30, 48, 30, 2, ARRAY[1440, 60], ARRAY[1, 5, 10], DATE '2026-10-10',
   'Spec B v1.0 plus Nutzer-Entscheidungen 2026-10-10: Selbstauskunft beider Seiten, Widerspruch 48 h, Terminerinnerungen T-24h/T-1h, Neubuchungs-Erinnerungen Tag 1/5/10, 30-Tage-Fenster ohne zweite Gebuehr, zwei Umbuchungen.')
ON CONFLICT (version) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. Die Buchung weiss, wer fehlte, und was daraus folgt
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.scheduling
  ADD COLUMN IF NOT EXISTS no_show_by            text CHECK (no_show_by IN ('user', 'provider', 'platform')),
  ADD COLUMN IF NOT EXISTS no_show_reported_at   timestamptz,
  ADD COLUMN IF NOT EXISTS no_show_reported_by   uuid,
  ADD COLUMN IF NOT EXISTS attendance            jsonb,
  ADD COLUMN IF NOT EXISTS dispute_status        text NOT NULL DEFAULT 'none'
                                                 CHECK (dispute_status IN ('none', 'open', 'upheld', 'dismissed')),
  ADD COLUMN IF NOT EXISTS disputed_at           timestamptz,
  ADD COLUMN IF NOT EXISTS dispute_note          text,
  ADD COLUMN IF NOT EXISTS rebook_deadline       date,
  ADD COLUMN IF NOT EXISTS rebooked_from         uuid REFERENCES public.scheduling(id),
  ADD COLUMN IF NOT EXISTS reschedule_count      integer NOT NULL DEFAULT 0 CHECK (reschedule_count >= 0),
  ADD COLUMN IF NOT EXISTS rebook_reminders_sent integer NOT NULL DEFAULT 0 CHECK (rebook_reminders_sent >= 0),
  ADD COLUMN IF NOT EXISTS credit_decided_at     timestamptz;

COMMENT ON COLUMN public.scheduling.no_show_by IS
  'Wer zum Termin fehlte: user (Anbieter meldet, Spec B "user no-show"), provider (Nutzer meldet, Performance-Vorfall), platform (technischer Plattformfehler, Neubuchung ohne zweite Gebuehr). NULL, solange niemand fehlte. Vor Phase 5 hiess status=no_show stillschweigend "provider".';
COMMENT ON COLUMN public.scheduling.attendance IS
  'Teilnahme-Zeitstempel {provider_joined_at, provider_left_at, user_joined_at, user_left_at, source}, sobald ein Meeting-Anbieter sie liefert (offene Entscheidung Nr. 4). Bis dahin NULL; die Zehn-Minuten-Regel in attendance.ts ist darauf vorbereitet.';
COMMENT ON COLUMN public.scheduling.dispute_status IS
  'Widerspruch des Nutzers gegen einen gemeldeten Nutzer-No-Show: none, open (binnen dispute_hours eingelegt), upheld (Admin gibt dem Nutzer recht → no_show_by wird provider), dismissed (Meldung bleibt).';
COMMENT ON COLUMN public.scheduling.rebook_deadline IS
  'Bis wann der Nutzer nach Absage, No-Show oder Plattformfehler ohne zweite Gebuehr neu buchen kann (Spec B: 14 Tage). Laeuft die Frist ohne Neubuchung ab, entsteht bei einem Nutzer-No-Show das Guthaben.';
COMMENT ON COLUMN public.scheduling.rebooked_from IS
  'Die Buchung, an deren Lead diese haengt: Neubuchung in der Frist, oder derselbe Nutzer beim selben Anbieter im 30-Tage-Fenster. Dann gibt es kein eigenes Ledger (lead_ledger_id wird geerbt) und keine zweite Gebuehr.';
COMMENT ON COLUMN public.scheduling.reschedule_count IS
  'Wie oft dieser Termin verschoben wurde; attendance_policy.reschedule_limit deckelt es (Nutzer-Entscheidung 2026-10-10: zwei).';
COMMENT ON COLUMN public.scheduling.credit_decided_at IS
  'Wann der Waechter die Frist abgeschlossen hat — mit oder ohne Guthaben. Verhindert, dass derselbe Ablauf zweimal zaehlt.';

-- Bestehende no_show-Zeilen: bis Phase 5 konnte nur der Nutzer diesen Status
-- setzen, und die Oberflaeche nannte ihn "Provider did not show".
UPDATE public.scheduling SET no_show_by = 'provider'
 WHERE status = 'no_show' AND no_show_by IS NULL;

-- Der Waechter sucht offene Fristen; ohne Teilindex liest er jede Buchung.
CREATE INDEX IF NOT EXISTS scheduling_rebook_open_idx
  ON public.scheduling (rebook_deadline)
  WHERE rebook_deadline IS NOT NULL AND credit_decided_at IS NULL;

-- Erinnerungen vor dem Termin: nur bestaetigte Termine in der Zukunft.
CREATE INDEX IF NOT EXISTS scheduling_upcoming_idx
  ON public.scheduling (slot_start)
  WHERE status = 'confirmed';

-- ════════════════════════════════════════════════════════════════════════════
-- 3. Der Anbieter fehlte: ein Vorfall, kein Guthaben
-- ════════════════════════════════════════════════════════════════════════════
--
-- Spec B: "Record a provider performance incident based on verified attendance
-- data. Repeated incidents may affect match eligibility because performance,
-- not payment, affects ranking." Eine Zeile je Buchung — ein zweiter Bericht
-- zur selben Buchung ist eine Korrektur, kein zweiter Vorfall.

CREATE TABLE IF NOT EXISTS public.provider_performance_incidents (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key  text        NOT NULL REFERENCES public.providers(provider_key) ON DELETE CASCADE,
  booking_id    uuid        NOT NULL UNIQUE REFERENCES public.scheduling(id),
  kind          text        NOT NULL CHECK (kind IN ('no_show', 'late')),
  source        text        NOT NULL CHECK (source IN ('user_report', 'attendance_data', 'admin')),
  note          text,
  recorded_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS provider_performance_incidents_provider_idx
  ON public.provider_performance_incidents (provider_key, recorded_at DESC);

COMMENT ON TABLE public.provider_performance_incidents IS
  'Performance-Vorfaelle eines Anbieters (Spec B "provider no-show"): Quelle ist die Meldung des Nutzers, spaeter Teilnahmedaten. Zaehlt in Performance und Matching (Spec A §14), nie in die Abrechnung.';

-- ════════════════════════════════════════════════════════════════════════════
-- 4. Guthaben haengt an der Buchung
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.provider_credits
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.scheduling(id);

COMMENT ON COLUMN public.provider_credits.booking_id IS
  'Die Buchung, aus der das Guthaben stammt (user_no_rebook_30pct, platform_failure). NULL bei admin und consumed.';

-- Ein Guthaben je Buchung: der Waechter darf eine abgelaufene Frist nicht
-- zweimal in Geld verwandeln.
CREATE UNIQUE INDEX IF NOT EXISTS provider_credits_booking_uq
  ON public.provider_credits (booking_id)
  WHERE booking_id IS NOT NULL AND amount_cents > 0;

-- ════════════════════════════════════════════════════════════════════════════
-- Zugriff: deny-all, nur der Service-Role-Schluessel der API
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.attendance_policy               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_performance_incidents  ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.attendance_policy              FROM anon, authenticated;
REVOKE ALL ON public.provider_performance_incidents FROM anon, authenticated;
