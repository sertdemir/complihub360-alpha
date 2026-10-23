-- ─── Offenlegung an den Anbieter erst nach dem Audit ─────────────────────────
--
-- Bei einer Buchung gehen die Daten, die der Nutzer im Pruefdialog bestaetigt
-- hat (shared_snapshot), an den Anbieter — ein Grenzuebertritt, der einen
-- Audit-Eintrag braucht (.agents/rules/privacy-audit-required.md). Bis hierher
-- hing die Sicht des Anbieters an `identity_revealed`, das beim Insert gesetzt
-- wurde; das Audit `lead.revealed` kam danach und wurde bei einem Fehler nur
-- geloggt.
--
-- `identity_revealed` traegt zwei Richtungen (der Nutzer sieht den Anbieter,
-- der Anbieter den Nutzer). Die Freigabe der Nutzerdaten bekommt deshalb ein
-- eigenes Feld: `shared_released_at` wird erst gesetzt, wenn das Audit steht
-- (services/compliance-api/src/disclosure.ts). Die Sicht des Nutzers bleibt
-- an `identity_revealed`.
--
-- Rein additiv: die bisherige API laeuft mit dieser Migration unveraendert
-- weiter. Buchungen, die sie in der Zwischenzeit anlegt, gibt der Abgleich
-- (runDisclosureAuditTick) frei, sobald er ihr Audit findet.

ALTER TABLE public.scheduling
  ADD COLUMN IF NOT EXISTS shared_released_at timestamptz;

COMMENT ON COLUMN public.scheduling.shared_released_at IS
  'Wann die bestaetigten Nutzerdaten (shared_snapshot) fuer den Anbieter freigegeben wurden — erst nach dem Audit lead.revealed. NULL: noch nicht freigegeben.';

-- Altbestand: was bis heute offengelegt war, bleibt es. Die Offenlegung ist
-- geschehen; sie jetzt zurueckzuziehen nimmt dem Anbieter den Kontakt zu
-- laufenden Terminen, ohne etwas ungeschehen zu machen.
UPDATE public.scheduling
   SET shared_released_at = coalesce(sharing_confirmed_at, created_at)
 WHERE identity_revealed AND shared_released_at IS NULL;

-- Ein Audit je Buchung: Buchungspfad und Abgleich koennen sich ueberschneiden;
-- der zweite Eintrag scheitert hier und gilt dem Aufrufer als "steht schon".
CREATE UNIQUE INDEX IF NOT EXISTS event_log_lead_revealed_once
  ON public.event_log ((payload->>'bookingId'))
  WHERE type = 'lead.revealed';
