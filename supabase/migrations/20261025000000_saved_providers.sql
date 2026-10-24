-- ─── Gemerkte Anbieter ("Saved providers", Handover 1.0 §5 "Add to Selection") ──
--
-- Nutzerentscheidung 24.10.2026: "Add to Selection" kommt zusammen mit der
-- Merkliste im Arbeitsbereich (/dashboard/saved-providers, bis dahin "Coming
-- soon"). Ein Nutzer merkt sich einen Anbieter aus der Risk Map, um ihn
-- spaeter zu vergleichen und zu buchen.
--
--   * Gespeichert wird der provider_key, nie der public_ref: der Ref ist das
--     Gesicht nach aussen, die API uebersetzt in beide Richtungen.
--   * Der Anbieter erfaehrt davon nichts — kein Event an ihn, keine Abrechnung.
--     Gemerkt ist kein Interesse, das er sehen oder bezahlen muesste.
--   * Bis zur Buchung bleibt der Anbieter in der Liste anonym (ADR-0004).
--   * Optional die Sitzung, aus der er gemerkt wurde — fuer "aus Risk Map X".
--     Eine geloeschte Sitzung loescht den Eintrag nicht.
--   * Wird das Konto geloescht, faellt die Merkliste mit (FK auf auth.users,
--     ON DELETE CASCADE) — keine Zeile ueberlebt ihren Nutzer.
--   * Faellt der Anbieter aus der Plattform (ON DELETE CASCADE), faellt der
--     Eintrag mit; faellt er nur aus der View, zeigt die Liste "nicht mehr
--     verfuegbar", statt ihn still zu verschweigen.

CREATE TABLE IF NOT EXISTS public.saved_providers (
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_key text        NOT NULL REFERENCES public.providers(provider_key) ON DELETE CASCADE,
  session_id   uuid,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, provider_key)
);

CREATE INDEX IF NOT EXISTS saved_providers_user_idx
  ON public.saved_providers(user_id, created_at DESC);

COMMENT ON TABLE public.saved_providers IS
  'Merkliste je Nutzer (Handover 1.0 §5 "Add to Selection"). Nur die API mit dem Service-Schluessel liest und schreibt; der Anbieter erfaehrt nichts davon, es wird nichts berechnet.';

-- Zugriff: nur die API mit dem Service-Schluessel. RLS ohne Policy = zu.
ALTER TABLE public.saved_providers ENABLE ROW LEVEL SECURITY;
