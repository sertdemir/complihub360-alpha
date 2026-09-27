-- ─── Marktanfragen: „Request This Market“ ────────────────────────────────────
--
-- Abgenommener Zustand `marketUnavailable` (Checklist v1.0): "Coverage is not
-- available for this market yet — Request this market and choose whether you
-- would like to receive an availability update." Die Risk Map zeigt ihn, wenn
-- die Engine KEINEN der angefragten Maerkte pruefen kann (Entscheidung
-- 2026-09-27). Bis hierhin gab es fuer „Request This Market“ keinen Ort.
--
-- ─── Was hier liegt ──────────────────────────────────────────────────────────
--
-- Eine Zeile je Anfragendem und Markt. Wer denselben Markt noch einmal
-- anfragt, aktualisiert seine Zeile (Bereiche, Update-Wunsch) statt eine
-- zweite anzulegen — die Nachfrage je Markt zaehlt Menschen, nicht Klicks.
--
-- Anfragende sind entweder ein Konto (user_id aus dem geprueften JWT) oder ein
-- Gast (guest_key aus dem localStorage). `requester_key` fasst beides in eine
-- Spalte, damit der Upsert einen einfachen Konflikt-Schluessel hat; der CHECK
-- haelt sie an user_id bzw. guest_key gebunden.
--
-- ─── Was hier bewusst NICHT liegt ────────────────────────────────────────────
--
-- Keine E-Mail-Adresse. Ein Update zur Verfuegbarkeit gibt es nur mit Konto
-- (Entscheidung 2026-09-27): die Adresse steht dann schon in auth.users und
-- wird beim Versand dort gelesen. Fuer Gaeste speichern wir keine
-- personenbezogenen Daten — `notify` ist ohne user_id nicht moeglich.

CREATE TABLE IF NOT EXISTS public.market_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_key text NOT NULL,
  user_id uuid,
  guest_key text,
  market text NOT NULL,
  domains text[] NOT NULL DEFAULT '{}',
  notify boolean NOT NULL DEFAULT false,
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT market_requests_one_requester
    CHECK (num_nonnulls(user_id, guest_key) = 1),
  CONSTRAINT market_requests_requester_key_matches
    CHECK (requester_key = coalesce('user:' || user_id::text, 'guest:' || guest_key)),
  CONSTRAINT market_requests_market_code
    CHECK (market ~ '^[A-Z]{2}$'),
  CONSTRAINT market_requests_guest_key_shape
    CHECK (guest_key IS NULL OR guest_key ~ '^[A-Za-z0-9_-]{8,64}$'),
  CONSTRAINT market_requests_notify_needs_account
    CHECK (notify = false OR user_id IS NOT NULL),
  CONSTRAINT market_requests_once_per_market
    UNIQUE (requester_key, market)
);

CREATE INDEX IF NOT EXISTS market_requests_market_idx ON public.market_requests (market);

-- Nur die API (Service-Rolle) liest und schreibt. anon und authenticated
-- sehen nichts — auch nicht, wer welchen Markt angefragt hat.
ALTER TABLE public.market_requests ENABLE ROW LEVEL SECURITY;
