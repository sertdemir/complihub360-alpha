-- Benachrichtigungen bekommen eine eigene Quelle.
--
-- Warum nicht `event_log`: das ist ein BETRIEBSPROTOKOLL. Jede Zeile beschreibt,
-- was im System passiert ist — `provider_lead_charged`, `document_ai_blocked`,
-- `billing_portal_opened`. Wer daraus einen Nutzer-Feed baut, hat drei Probleme
-- auf einmal:
--
--   1. Es steht nirgends, WEN eine Zeile angeht. `actor_id` ist die Spalte
--      dafuer, aber sie wird an keiner einzigen Schreibstelle gesetzt (Stand
--      2026-08-31: 0 von allen Zeilen, ueber alle Typen). Eine Einschraenkung
--      auf den angemeldeten Nutzer ist damit unmoeglich.
--   2. Die Nutzlasten sind fuer Betrieb und Fehlersuche gedacht, nicht fuer
--      Anzeige. `email_sent`-Zeilen tragen eine Mailadresse.
--   3. Aus 1 und 2 zusammen: der Feed zeigte JEDEM angemeldeten Konto ALLE
--      Zeilen — fremde Vorgaenge samt fremder Mailadressen.
--
-- Diese Tabelle dreht das um: eine Zeile entsteht nur, wenn sie einen
-- bestimmten Menschen etwas angeht, und sie traegt den Empfaenger im Schluessel.
-- `event_log` bleibt unveraendert das Protokoll; beide werden parallel
-- geschrieben und haben verschiedene Leser.

CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Der Empfaenger. Nicht der Ausloeser: eine Benachrichtigung erzaehlt, was
  -- jemand ANDERES getan hat. Wer sich selbst einen Termin bucht, bekommt
  -- keine Nachricht darueber.
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        text NOT NULL,
  -- Worauf der Screen verlinkt. `subject_id` ist bewusst text und keine FK:
  -- die Ziele liegen in verschiedenen Tabellen.
  subject     text CHECK (subject IN ('engagement', 'booking', 'session')),
  subject_id  text,
  -- NUR was die Oberflaeche zum Anzeigen braucht: Anbietername, Termin,
  -- Sitzungs-Titel. KEINE Mailadressen, keine Freitexte aus Nachrichten,
  -- keine Betriebsdaten. Das ist der Punkt, an dem Befund 2 oben repariert
  -- wird — durchgesetzt wird es in notifications.ts (notify()).
  payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  -- NULL = ungelesen. Ein Zeitpunkt statt eines Hakens, damit "seit wann
  -- gesehen" spaeter beantwortbar bleibt.
  read_at     timestamptz,
  -- Fuer Schreibstellen, die wiederholt laufen (der SLA-Waechter tickt im
  -- Minutentakt). Wer sich nicht wiederholen darf, setzt einen Schluessel;
  -- wer sich wiederholen DARF — jede neue Nachricht im Verlauf — laesst ihn
  -- leer. Postgres behandelt NULL im eindeutigen Index als verschieden,
  -- genau diese Semantik ist gewollt.
  dedupe_key  text
);

CREATE INDEX IF NOT EXISTS idx_notifications_user
  ON public.notifications(user_id, created_at DESC);

-- Ungelesene zaehlen ist der haeufigste Zugriff (die Glocke in jeder Kopfzeile).
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications(user_id) WHERE read_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe
  ON public.notifications(user_id, dedupe_key) WHERE dedupe_key IS NOT NULL;

-- Zugriff wie bei `session_obligation_status`: eigene Zeilen fuer registrierte
-- Nutzer. Geschrieben wird ausschliesslich ueber die Service-Rolle (die API) —
-- niemand soll sich selbst Benachrichtigungen schreiben koennen.
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Gelesen-Markieren ist die einzige Aenderung, die dem Empfaenger gehoert.
DROP POLICY IF EXISTS "Users can mark own notifications read" ON public.notifications;
CREATE POLICY "Users can mark own notifications read"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
