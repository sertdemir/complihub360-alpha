-- ─── Anbieter-Bewerbungen und Einladung ins Onboarding ──────────────────────
--
-- Entscheidung der Mitgruenderin, 24.11.2026 (Provider-Beta-Test P01):
--   1. Jede Bewerbung von /provider-apply erscheint im Admin-Bereich, mit
--      allen Angaben aus dem Formular. Die erste Sichtung macht ein Mensch.
--   2. Die Einladung geht aus dem Admin-Bereich: ein Klick, das System
--      verschickt die Mail mit einem Link, der nur zu dieser Bewerbung
--      gehoert. Der Zeitpunkt des Versands steht an der Bewerbung.
--   3. Ueber den Link richtet der Anbieter sein Konto ein. "Eingeladen" ist
--      nicht "verifiziert": der Anbieter entsteht als Entwurf (partner_status
--      inactive, lifecycle_status draft) und geht durch die bestehende Pruefung.
--
-- Das aendert die Entscheidung vom 09.10.2026 ("die Nachricht gehoert dem
-- Postfach, nicht der Datenbank") fuer genau einen Weg: die Bewerbung. Die
-- vier Wege der Kontaktseite bleiben, wie sie sind.
--
--   * Die Tabelle traegt personenbezogene Daten (Name, Adresse der
--     Kontaktperson). Nur die API mit dem Service-Schluessel liest und
--     schreibt; RLS ohne Policy = zu.
--   * Der Einladungslink steht nie im Klartext in der Datenbank, nur sein
--     SHA-256. Wer die Tabelle liest, kann keine Einladung einloesen.
--   * Eine neue Einladung ersetzt die alte (ein Hash je Bewerbung).
--   * Wird das Konto oder der Anbieter geloescht, bleibt die Bewerbung als
--     Vorgang stehen (ON DELETE SET NULL).

CREATE TABLE IF NOT EXISTS public.provider_applications (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  reference         text        NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  locale            text        NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'de', 'es', 'tr')),
  first_name        text,
  contact_name      text        NOT NULL,
  email             text        NOT NULL,
  firm              text        NOT NULL,
  website           text,
  credentials       text        NOT NULL,
  areas             text[]      NOT NULL DEFAULT '{}',
  markets           text[]      NOT NULL DEFAULT '{}',
  message           text,
  status            text        NOT NULL DEFAULT 'received'
                    CHECK (status IN ('received', 'invited', 'onboarding')),
  invited_at        timestamptz,
  invited_by        uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  invite_token_hash text,
  invite_expires_at timestamptz,
  invite_send_count integer     NOT NULL DEFAULT 0,
  redeemed_at       timestamptz,
  provider_key      text        REFERENCES public.providers(provider_key) ON DELETE SET NULL,
  user_id           uuid        REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS provider_applications_created_idx
  ON public.provider_applications(created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS provider_applications_invite_hash_idx
  ON public.provider_applications(invite_token_hash)
  WHERE invite_token_hash IS NOT NULL;

COMMENT ON TABLE public.provider_applications IS
  'Bewerbungen von /provider-apply samt Stand der Einladung ins Onboarding. Personenbezogen. Nur die API mit dem Service-Schluessel liest und schreibt.';
COMMENT ON COLUMN public.provider_applications.invite_token_hash IS
  'SHA-256 des Einladungslinks. Der Link selbst steht nur in der Mail.';

ALTER TABLE public.provider_applications ENABLE ROW LEVEL SECURITY;
