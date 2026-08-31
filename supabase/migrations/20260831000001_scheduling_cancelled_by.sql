-- Wer hat abgesagt?
--
-- `scheduling.status` kennt genau ein 'cancelled'. Wer es ausgeloest hat,
-- steht nirgends — und damit ist jede Auswertung darueber Raterei.
--
-- Das ist keine Buchhaltungs-Feinheit, sondern die Voraussetzung fuer die
-- Bewertung eines Anbieters. Eine Absage DURCH DEN MANDANTEN sagt nichts ueber
-- den Anbieter: sie in die Rangfolge einzurechnen hiesse, ihn fuer die
-- Terminplanung seines Kunden zu bestrafen. Eine Absage DURCH DEN ANBIETER
-- sagt sehr wohl etwas — und ohne diese Spalte sind beide dieselbe Zeile.
--
-- Heute schreibt nur der Mandanten-Pfad (PATCH /api/v1/scheduling/:id), also
-- steht dort 'user'. Ein Anbieter-Pfad existiert noch nicht; wenn er kommt,
-- traegt er 'provider' ein und erst dann darf die Rangfolge das lesen.

ALTER TABLE public.scheduling
  ADD COLUMN IF NOT EXISTS cancelled_by text
    CHECK (cancelled_by IN ('user', 'provider', 'system'));

ALTER TABLE public.scheduling
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

-- Bestehende Zeilen bleiben NULL. Das ist die ehrliche Auskunft: fuer die
-- Absagen von vorher wissen wir es nicht. Sie rueckwirkend auf 'user' zu
-- setzen waere eine Behauptung ueber Daten, die wir nie erhoben haben.

COMMENT ON COLUMN public.scheduling.cancelled_by IS
  'Wer die Buchung abgesagt hat. NULL = nicht abgesagt ODER vor 2026-08-31 abgesagt (damals nicht erhoben).';
