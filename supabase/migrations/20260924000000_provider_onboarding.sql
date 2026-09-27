-- ─── Onboarding und Verifikation: Speicher, Nachfragen, Entscheidungsprotokoll ─
--
-- Phase 2 des Provider-Plans (Canvas-Abnahme 2026-09-22: 1B Dossier, 2B
-- Leistung als Stamm mit Laenderzeilen, 3A Nachweis-Checkliste, 4A Annahme je
-- Dokument, 5B Freigabematrix, 6A Pruef-Queue, 7A Split-View, 8A Zell-Aktionen
-- mit Gate-Leiste). Grundlage bleibt Spec A (Provider Verification and
-- Dashboard Implementation Specification v1.0, 20.09.2026), §5 bis §9 und §25.
--
-- ─── Was bisher fehlte ───────────────────────────────────────────────────────
--
-- Das Datenmodell vom 20.09. kennt `provider_evidence.file_ref` — eine
-- Referenz in einen Speicher, den es nicht gab. Kein Bucket, kein Upload, kein
-- Weg fuer einen Reviewer, ein Dokument zu oeffnen. Ein Nachweis war damit
-- eine Zeile ohne Beleg.
--
-- Dazu zwei Luecken im Ablauf:
--   · Ein Reviewer, der einen Nachweis nachfordert, hatte keinen Ort dafuer.
--     Die Nachfrage lebte in einer Mail, und niemand konnte spaeter sagen, ob
--     sie erfuellt wurde.
--   · Jede Entscheidung (Nachweis geprueft, Land freigegeben, Konto aktiv)
--     schrieb hoechstens ein Event mit freiem Payload. Spec A §25 verlangt ein
--     Protokoll mit Vorher, Nachher, Grund und Pruefer — nachlesbar, nicht
--     rekonstruierbar.
--
-- ─── Was hier bewusst NICHT liegt ────────────────────────────────────────────
--
-- Das Aktivierungs-Gate (aktiv nur mit gepruefeten Pflichtnachweisen, einer
-- freigegebenen Leistung, drei Annahmen und Billing) lebt in der API als reine
-- Funktion `activationGate()` in providerReview.ts — nicht als Trigger. Ein
-- Trigger kann nur ablehnen; die Gate-Leiste (8A) muss aber sagen, WAS fehlt,
-- und das in einer Sprache, die ein Reviewer liest. Die Datenbank sichert
-- stattdessen, was sie gut kann: Unveraenderlichkeit, Zustandsmengen, Zugriff.

-- ─── 1. Der private Bucket ───────────────────────────────────────────────────
--
-- Pfad-Konvention: {provider_key}/{evidence_id}/{original_name}. Keine Policy
-- fuer anon oder authenticated: der Browser laedt ueber signierte URLs, die
-- die API mit der Service-Rolle ausstellt (storage.ts). Eine Storage-Policy
-- waere ein zweiter Zugangsweg neben dem Ownership-Guard — und zwei Tueren
-- sind eine zu viel.
--
-- 20 MB und drei MIME-Typen: ein Handelsregisterauszug, eine Police, ein
-- Ausweis-Scan. Wer mehr braucht, aendert die Zeile, nicht den Code.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('provider-evidence', 'provider-evidence', false, 20971520,
        ARRAY['application/pdf', 'image/png', 'image/jpeg'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ─── 2. Der Nachweis bekommt eine Datei ──────────────────────────────────────
--
-- `upload_confirmed` trennt zwei Zeitpunkte: die API legt die Zeile an und
-- stellt die Upload-URL aus (false); erst wenn der Browser fertig ist und die
-- API das Objekt im Bucket gesehen hat, wird sie true. Ein Nachweis mit
-- upload_confirmed = false ist fuer den Reviewer nicht da — er sieht nur, dass
-- ein Upload begonnen wurde.

ALTER TABLE public.provider_evidence
  ADD COLUMN IF NOT EXISTS original_name    text,
  ADD COLUMN IF NOT EXISTS mime_type        text,
  ADD COLUMN IF NOT EXISTS size_bytes       integer CHECK (size_bytes IS NULL OR size_bytes >= 0),
  ADD COLUMN IF NOT EXISTS uploaded_at      timestamptz,
  ADD COLUMN IF NOT EXISTS upload_confirmed boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.provider_evidence.file_ref IS
  'Objektpfad im privaten Bucket provider-evidence: {provider_key}/{evidence_id}/{original_name}. Nie eine URL — URLs werden je Abruf signiert (storage.ts) und laufen ab.';
COMMENT ON COLUMN public.provider_evidence.upload_confirmed IS
  'true erst, wenn die API das Objekt im Bucket gesehen hat (POST …/evidence/:id/confirm). Vorher ist die Zeile ein angekuendigter Upload, kein Nachweis.';

-- ─── 3. Nachfragen des Reviewers ─────────────────────────────────────────────
--
-- Eine Nachfrage haengt wahlweise an einer Leistung × Land (Zell-Aktion
-- "Nachweis anfordern", 8A) oder am Konto (Rechtsform, Vertretung). Sie wird
-- erfuellt, wenn ein passender Nachweis bestaetigt hochgeladen ist — die API
-- setzt dann fulfilled_evidence_id. `withdrawn`, wenn der Reviewer sie
-- zuruecknimmt. Eine erfuellte Nachfrage bleibt stehen: sie ist Teil der
-- Geschichte des Dossiers.

CREATE TABLE IF NOT EXISTS public.provider_evidence_requests (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key  text        NOT NULL REFERENCES public.providers(provider_key) ON DELETE CASCADE,
  evidence_type text        NOT NULL,
  service_id    uuid        REFERENCES public.provider_services(id) ON DELETE SET NULL,
  country_code  text,
  message       text        NOT NULL,
  status        text        NOT NULL DEFAULT 'open'
                            CHECK (status IN ('open', 'fulfilled', 'withdrawn')),
  requested_by  uuid,
  requested_at  timestamptz NOT NULL DEFAULT now(),
  fulfilled_at  timestamptz,
  fulfilled_evidence_id uuid REFERENCES public.provider_evidence(id) ON DELETE SET NULL,
  CONSTRAINT provider_evidence_requests_fulfilled_needs_evidence CHECK (
    status <> 'fulfilled' OR fulfilled_evidence_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS provider_evidence_requests_open_idx
  ON public.provider_evidence_requests (provider_key, status)
  WHERE status = 'open';

COMMENT ON TABLE public.provider_evidence_requests IS
  'Nachforderung eines Nachweises durch den Reviewer (Spec A §8 "more info required"). Offen, bis ein bestaetigter Upload desselben Typs sie erfuellt oder der Reviewer sie zuruecknimmt.';
COMMENT ON COLUMN public.provider_evidence_requests.message IS
  'Was genau fehlt, in Worten fuer den Anbieter. Sachlich und ohne Frist-Drohung — die Frist steht, wenn es eine gibt, im Lifecycle des Kontos.';

-- ─── 4. Das Entscheidungsprotokoll ───────────────────────────────────────────
--
-- Eine Zeile je Entscheidung eines Reviewers oder des Systems ueber ein
-- Anbieterkonto. `subject` sagt, woran entschieden wurde, `from_value` /
-- `to_value` halten den Zustand vorher und nachher, `reason` den Grund in
-- Worten. Append-only wie das Lead-Ledger: ein Protokoll, das sich aendern
-- laesst, beweist nichts.
--
-- Warum nicht `event_log`? Weil dessen Payload frei ist und niemand garantiert,
-- dass eine Zeile Vorher, Nachher und Pruefer traegt. Hier ist das Schema.

CREATE TABLE IF NOT EXISTS public.provider_review_log (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key  text        NOT NULL REFERENCES public.providers(provider_key) ON DELETE CASCADE,
  subject       text        NOT NULL
                            CHECK (subject IN ('evidence', 'coverage', 'service', 'lifecycle', 'request', 'application')),
  subject_id    text,
  action        text        NOT NULL,
  from_value    text,
  to_value      text,
  reason        text,
  actor_id      uuid,                         -- NULL = System (Watcher)
  actor_kind    text        NOT NULL DEFAULT 'reviewer'
                            CHECK (actor_kind IN ('reviewer', 'provider', 'system')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS provider_review_log_provider_idx
  ON public.provider_review_log (provider_key, created_at DESC);

CREATE OR REPLACE FUNCTION public.provider_review_log_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'provider_review_log ist append-only: % nicht erlaubt (Zeile %)', TG_OP, OLD.id
    USING ERRCODE = 'restrict_violation';
END $$;

DROP TRIGGER IF EXISTS provider_review_log_no_update ON public.provider_review_log;
CREATE TRIGGER provider_review_log_no_update
  BEFORE UPDATE OR DELETE ON public.provider_review_log
  FOR EACH ROW EXECUTE FUNCTION public.provider_review_log_immutable();

COMMENT ON TABLE public.provider_review_log IS
  'Entscheidungsprotokoll der Verifikation (Spec A §25): wer hat woran wann was von welchem Zustand in welchen geaendert, und warum. Append-only per Trigger (SQLSTATE 23001).';

-- ─── 5. lifecycle_status_since laeuft von selbst mit ─────────────────────────
--
-- Die API setzt den Status; das Datum "seit wann" wurde bisher nirgends
-- nachgezogen. Ein Trigger ist hier richtig, weil es keine Entscheidung ist,
-- sondern Buchhaltung.

CREATE OR REPLACE FUNCTION public.providers_lifecycle_since() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.lifecycle_status IS DISTINCT FROM OLD.lifecycle_status THEN
    NEW.lifecycle_status_since := now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS providers_lifecycle_since ON public.providers;
CREATE TRIGGER providers_lifecycle_since
  BEFORE UPDATE OF lifecycle_status ON public.providers
  FOR EACH ROW EXECUTE FUNCTION public.providers_lifecycle_since();

-- ─── 6. Benachrichtigungen duerfen auf ein Anbieterkonto zeigen ─────────────
--
-- `notifications.subject` kannte engagement, booking, session. Eine
-- Verifikations-Nachricht ("Nachweis angefordert", "Konto aktiv") zeigt auf
-- das Dossier des Anbieters — dafuer braucht die Liste den Wert 'provider'.

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_subject_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_subject_check
  CHECK (subject IN ('engagement', 'booking', 'session', 'provider'));

-- ─── 7. Zugriff: nur die Service-Rolle ───────────────────────────────────────

ALTER TABLE public.provider_evidence_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_review_log        ENABLE ROW LEVEL SECURITY;
