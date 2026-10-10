-- ════════════════════════════════════════════════════════════════════════════
-- Provider Phase 6: Performance aus Fakten, Serien-No-Shows, Verfuegbarkeit
-- ════════════════════════════════════════════════════════════════════════════
--
-- Spec A §14 (Ranking), §16 (Module), §17 (Performance: keine Strafe ohne
-- verlaessliche Daten, Stichprobe und Zeitraum bleiben nachvollziehbar), §24
-- (Durchsetzung mit Einspruch); Spec B "Analytics and performance separation"
-- und "Calendar". Entscheidungen des Nutzers vom 2026-10-10, alle sechs "ja"
-- (ADR-0009, TKT-PROV-14).
--
-- Was diese Migration anlegt:
--   1. performance_policy             — Stichprobe, Vorfall-Fenster, Schwellen
--   2. providers                      — Verfuegbarkeitsfenster, Zeitzone, Pause
--   3. provider_enforcement_actions   — Buchungspause und Einspruch (§24)
--
-- Was sie bewusst NICHT tut: Kennzahlen speichern. Performance wird aus
-- `scheduling`, `provider_performance_incidents` und `reviews` gerechnet —
-- jede Zahl bleibt auf ihre Zeilen zurueckfuehrbar. Die alten Spalten
-- `confirmation_rate`, `avg_response_hours` und `breach_count` der
-- Anfrage-Pipeline bleiben stehen, aber das Ranking liest sie nicht mehr.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. Die Regeln als Konfiguration
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.performance_policy (
  version                   integer     PRIMARY KEY,
  rate_min_bookings         integer     NOT NULL CHECK (rate_min_bookings BETWEEN 1 AND 100),
  window_days               integer     NOT NULL CHECK (window_days BETWEEN 7 AND 730),
  incident_window_days      integer     NOT NULL CHECK (incident_window_days BETWEEN 7 AND 365),
  incident_alert_count      integer     NOT NULL CHECK (incident_alert_count BETWEEN 1 AND 20),
  incident_pause_count      integer     NOT NULL CHECK (incident_pause_count BETWEEN 1 AND 20),
  user_no_show_alert_count  integer     NOT NULL CHECK (user_no_show_alert_count BETWEEN 1 AND 20),
  effective_from            date        NOT NULL DEFAULT current_date,
  note                      text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  CHECK (incident_pause_count >= incident_alert_count)
);

COMMENT ON TABLE public.performance_policy IS
  'Performance- und Durchsetzungsregeln (Spec A §17, §24), versioniert: ab wie vielen Buchungen eine Quote gezeigt wird, welcher Zeitraum zaehlt, und ab wie vielen Vorfaellen in welchem Fenster der Anbieter einen Hinweis bzw. eine Buchungspause bekommt. Der Nutzer-No-Show-Zaehler loest nur einen Admin-Hinweis aus.';

INSERT INTO public.performance_policy
  (version, rate_min_bookings, window_days, incident_window_days, incident_alert_count, incident_pause_count, user_no_show_alert_count, effective_from, note)
VALUES
  (1, 5, 90, 90, 2, 3, 2, DATE '2026-10-11',
   'Nutzer-Entscheidungen 2026-10-10: Quoten ab 5 Buchungen (TKT-PROV-12 C3), 90-Tage-Fenster; Anbieter 2 Vorfaelle → Hinweis, 3 → Buchungspause mit Einspruch; Nutzer 2 gemeldete No-Shows → Admin-Hinweis, kein Gate.')
ON CONFLICT (version) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. Verfuegbarkeit, Zeitzone, Buchungspause
-- ════════════════════════════════════════════════════════════════════════════
--
-- `availability_hours`: je Wochentag (mon..sun) eine Liste von Fenstern
-- {"from":"09:00","to":"12:00"} in der Zeitzone des Anbieters. NULL = die
-- bisherigen Buerozeiten (Mo-Fr 9-11:30 und 14-15 Uhr) als Vorgabe. Der
-- Slot-Generator liest NUR diese Fenster, zieht Buchungen und die Belegung
-- des verbundenen Kalenders ab und sperrt bei `availability = 'ooo'` sowie
-- bei gesetzter `booking_paused_at`.

ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS availability_hours jsonb,
  ADD COLUMN IF NOT EXISTS timezone           text NOT NULL DEFAULT 'Europe/Berlin',
  ADD COLUMN IF NOT EXISTS booking_paused_at  timestamptz;

COMMENT ON COLUMN public.providers.availability_hours IS
  'Buchbare Fenster je Wochentag in der Zeitzone des Anbieters: {"mon":[{"from":"09:00","to":"12:00"}], ...}. NULL = Vorgabe (Mo-Fr 9:00-11:30, 14:00-15:00). Slots sind 30 Minuten.';
COMMENT ON COLUMN public.providers.timezone IS
  'IANA-Zeitzone, in der availability_hours gelesen werden.';
COMMENT ON COLUMN public.providers.booking_paused_at IS
  'Gesetzt, solange eine Buchungspause gilt (Spec A §24). Sperrt Slots und POST /scheduling (409 BOOKING_PAUSED), nie die Sichtbarkeit. Quelle und Einspruch stehen in provider_enforcement_actions.';

-- Die Zeitzone prueft die API mit Intl.DateTimeFormat (ein CHECK auf
-- pg_timezone_names ist nicht erlaubt); hier reicht die Vorgabe.

-- Die matchable-View traegt die Pause nicht: sie entscheidet nur ueber die
-- Buchung (wie billing_ready → bookable_chargeable), nicht ueber das Matching.

-- ════════════════════════════════════════════════════════════════════════════
-- 3. Durchsetzung mit Einspruch (§24)
-- ════════════════════════════════════════════════════════════════════════════
--
-- "Record reasons, evidence, decision maker, dates, scope and outcome."
-- Eine Zeile je Massnahme. Die automatische Buchungspause nach drei
-- Vorfaellen traegt source=auto_no_show und verweist auf die Vorfaelle;
-- der Anbieter legt Einspruch ein (appeal_*), der Admin entscheidet
-- (decided_*), aufgehoben heisst lifted_at gesetzt.

CREATE TABLE IF NOT EXISTS public.provider_enforcement_actions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key    text        NOT NULL REFERENCES public.providers(provider_key) ON DELETE CASCADE,
  action          text        NOT NULL CHECK (action IN ('booking_pause', 'correction_request', 'profile_limitation', 'reverification', 'suspension')),
  source          text        NOT NULL CHECK (source IN ('auto_no_show', 'admin')),
  reason          text        NOT NULL,
  evidence        jsonb,
  created_by      uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  appeal_note     text,
  appeal_at       timestamptz,
  decided_by      uuid,
  decided_at      timestamptz,
  decision        text        CHECK (decision IN ('upheld', 'lifted')),
  lifted_at       timestamptz,
  CHECK (decision IS NULL OR decided_at IS NOT NULL),
  CHECK (appeal_at IS NULL OR appeal_note IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS provider_enforcement_actions_open_idx
  ON public.provider_enforcement_actions (provider_key, created_at DESC)
  WHERE lifted_at IS NULL;

COMMENT ON TABLE public.provider_enforcement_actions IS
  'Durchsetzungsmassnahmen nach Spec A §24 mit dokumentiertem Einspruch. booking_pause sperrt Buchungen (providers.booking_paused_at), nie die Sichtbarkeit. source auto_no_show = drei Vorfaelle im Fenster der performance_policy; evidence traegt die Vorfall-IDs.';

-- ════════════════════════════════════════════════════════════════════════════
-- Zugriff: deny-all, nur der Service-Role-Schluessel der API
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.performance_policy            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_enforcement_actions  ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.performance_policy           FROM anon, authenticated;
REVOKE ALL ON public.provider_enforcement_actions FROM anon, authenticated;
