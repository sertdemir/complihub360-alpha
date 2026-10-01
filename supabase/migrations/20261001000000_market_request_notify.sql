-- ─── Marktanfragen: das Update wirklich verschicken ──────────────────────────
--
-- Seit 20260929000000 speichert `market_requests` den Wunsch "Email me when
-- <market> is covered" (`notify`, nur mit Konto). Verschickt wurde nichts —
-- die Checkbox versprach etwas, das nicht passierte (Nutzer 2026-10-01: "bau
-- den Versand"). Der Watcher (watchers.ts, runMarketCoverageTick) verschickt
-- jetzt einmal je Zeile, sobald die Engine den Markt prueft, und setzt
-- `notified_at`. Dafuer braucht er zwei Dinge, die es noch nicht gab:
--
-- ─── 1. Die Sprache der Anfrage ──────────────────────────────────────────────
--
-- Wer auf Deutsch anfragt, soll auf Deutsch hoeren, dass der Markt da ist.
-- `public.users` kennt keine Sprache, also haelt die Anfrage sie fest. Nur
-- die vier Produktsprachen; ohne Angabe (aeltere Zeilen) schreibt der Mailer
-- Englisch.

ALTER TABLE public.market_requests
  ADD COLUMN IF NOT EXISTS locale text;

ALTER TABLE public.market_requests
  DROP CONSTRAINT IF EXISTS market_requests_locale_known;
ALTER TABLE public.market_requests
  ADD CONSTRAINT market_requests_locale_known
    CHECK (locale IS NULL OR locale IN ('en', 'de', 'es', 'tr'));

-- Der Watcher sucht "angemeldet, will Update, noch nicht benachrichtigt".
CREATE INDEX IF NOT EXISTS market_requests_pending_notify_idx
  ON public.market_requests (market)
  WHERE notify AND notified_at IS NULL;

-- ─── 2. Die Adresse — erst beim Versand, aus auth.users ─────────────────────
--
-- Entscheidung 2026-09-27: `market_requests` speichert keine Adresse; sie
-- wird beim Versand dort gelesen, wo der Login liegt. `public.users` taugt
-- dafuer nicht (entsteht faul, s. 20260922010000), und das Schema `auth`
-- liegt in PostgREST nicht offen. Also das Gegenstueck zu
-- `auth_user_id_by_email`: UUID rein, Adresse raus — sonst nichts.
--
-- Nur bestaetigte, nicht geloeschte Logins. Eine unbestaetigte Adresse
-- anzuschreiben hiesse, jemandem zu mailen, von dem wir nicht wissen, ob ihm
-- das Postfach gehoert.

CREATE OR REPLACE FUNCTION public.auth_user_email_by_id(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
-- Wie auth_user_id_by_email: fester search_path, sonst bestimmt der
-- Aufrufer, welche Tabelle "auth.users" meint.
SET search_path = pg_catalog, public, auth, pg_temp
AS $$
  SELECT u.email
  FROM auth.users u
  WHERE u.id = p_user_id
    AND u.deleted_at IS NULL
    AND u.email_confirmed_at IS NOT NULL
$$;

COMMENT ON FUNCTION public.auth_user_email_by_id(uuid) IS
  'Login-UUID -> bestaetigte Adresse aus auth.users, fuer den Versand des Markt-Updates (market_requests.notify). NULL bei unbekanntem, geloeschtem oder unbestaetigtem Login. Liefert ausschliesslich die Adresse; das Schema auth bleibt sonst zu.';

REVOKE ALL ON FUNCTION public.auth_user_email_by_id(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_email_by_id(uuid) TO service_role;
