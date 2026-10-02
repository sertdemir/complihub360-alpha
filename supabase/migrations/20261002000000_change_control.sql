-- ════════════════════════════════════════════════════════════════════════════
-- Change-Control fuer aktive Partner (Spec A §18–20, §28)
-- ════════════════════════════════════════════════════════════════════════════
--
-- `provider_change_requests` gibt es seit dem Datenmodell (20260920000000),
-- befuellt wurde sie nie: jede Aenderung eines aktiven Partners ging sofort
-- live. Ab jetzt schreibt die API dort hinein (changeControl.ts). Diese
-- Migration ergaenzt, was die Tabelle dafuer braucht:
--
--   effect                 was mit dem neuen Wert passiert ist:
--                            held     — wartet, NICHT uebernommen
--                            applied  — sofort uebernommen, pruefpflichtig
--                            pause    — wesentliches Ereignis, Leistungen
--                                       pausiert (immer immediate_24h)
--   applied_at             wann der neue Wert live ging (bei held erst nach
--                          der Freigabe)
--   provider_note          was der Partner dazu schreibt
--   reviewer_note          Begruendung des Pruefteams — Pflicht bei Ablehnung
--   event_type, occurred_on, affected_service_ids
--                          nur bei effect = 'pause'
--
-- Dazu: hoechstens EIN offener wartender Vorgang je Partner und Ziel. Ein
-- zweites Speichern fuehrt den offenen Vorgang fort, statt einen
-- konkurrierenden anzulegen — sonst koennte das Pruefteam den aelteren Wert
-- ueber den neueren freigeben.

ALTER TABLE public.provider_change_requests
  ADD COLUMN IF NOT EXISTS effect text NOT NULL DEFAULT 'held'
    CHECK (effect IN ('held', 'applied', 'pause')),
  ADD COLUMN IF NOT EXISTS applied_at timestamptz,
  ADD COLUMN IF NOT EXISTS provider_note text CHECK (provider_note IS NULL OR length(provider_note) <= 1000),
  ADD COLUMN IF NOT EXISTS reviewer_note text CHECK (reviewer_note IS NULL OR length(reviewer_note) <= 1000),
  ADD COLUMN IF NOT EXISTS event_type text CHECK (event_type IS NULL OR event_type IN (
    'licence_restricted', 'authority_lost', 'insurance_lost', 'security_incident',
    'insolvency_or_closure', 'booking_unfulfillable', 'integrity_concern', 'account_compromised')),
  ADD COLUMN IF NOT EXISTS occurred_on date,
  ADD COLUMN IF NOT EXISTS affected_service_ids uuid[] NOT NULL DEFAULT '{}';

-- Ein Ereignis ist immer die 24-Stunden-Klasse und traegt seinen Typ.
ALTER TABLE public.provider_change_requests
  DROP CONSTRAINT IF EXISTS provider_change_requests_pause_shape;
ALTER TABLE public.provider_change_requests
  ADD CONSTRAINT provider_change_requests_pause_shape CHECK (
    (effect = 'pause') = (event_type IS NOT NULL)
    AND (effect <> 'pause' OR deadline_class = 'immediate_24h')
  );

-- Abgelehnt wird nie ohne Begruendung — der Partner soll wissen, warum.
ALTER TABLE public.provider_change_requests
  DROP CONSTRAINT IF EXISTS provider_change_requests_reject_reason;
ALTER TABLE public.provider_change_requests
  ADD CONSTRAINT provider_change_requests_reject_reason CHECK (
    status <> 'rejected' OR (reviewer_note IS NOT NULL AND length(trim(reviewer_note)) > 0)
  );

CREATE UNIQUE INDEX IF NOT EXISTS provider_change_requests_one_open_hold
  ON public.provider_change_requests (provider_key, coalesce(service_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE effect = 'held' AND status IN ('submitted', 'under_review');

COMMENT ON COLUMN public.provider_change_requests.effect IS
  'held = wartet, nicht uebernommen · applied = sofort uebernommen, pruefpflichtig · pause = wesentliches Ereignis, betroffene Leistungen pausiert (changeControl.ts).';
