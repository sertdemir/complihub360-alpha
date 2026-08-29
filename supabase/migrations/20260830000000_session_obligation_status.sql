-- Pflichten werden abhakbar: pro Sitzung und Pflicht ein Bearbeitungs-Zustand.
--
-- Warum das eine eigene Tabelle ist und kein Feld in `sessions.answers`:
-- `answers` haelt, was der Nutzer im Assistenten GESAGT hat — daraus rechnet
-- die Engine. Der Bearbeitungs-Stand ist das Gegenteil: er entsteht NACH der
-- Berechnung und darf sie nie beeinflussen. Beides zu mischen hiesse, dass ein
-- Haken das Ergebnis veraendern koennte.
--
-- Der Schluessel ist die Template-ID der Engine (packages/compliance-engine/
-- domain-schema.ts → DomainTemplateLibrary), etwa 'tax-vat-registration'.
-- Sie ist ein fester Slug, kein generierter Wert: `generator.ts` setzt
-- `id: template.id`. Deshalb ueberlebt ein Haken die Neuberechnung, auch wenn
-- der Nutzer seine Antworten aendert — genau das war die offene Frage.
--
-- Nur ABWEICHUNGEN werden gespeichert. Eine Pflicht ohne Zeile ist 'open';
-- sonst schriebe jede angezeigte Sitzung acht Zeilen ins Nichts.

CREATE TABLE IF NOT EXISTS public.session_obligation_status (
  session_id     uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  -- Engine-Template-ID. Bewusst text und keine FK: die Vorlagen leben im Code,
  -- nicht in der Datenbank.
  obligation_id  text NOT NULL,
  status         text NOT NULL CHECK (status IN ('in_progress', 'done', 'not_applicable')),
  -- Gesetzt, sobald status = 'done'. Ohne Datum ist "erledigt" keine Auskunft,
  -- sondern nur ein Haeckchen — und der Anker fuer die naechste Frist.
  done_at        date,
  -- Freiwillig, z. B. die LUCID-Nummer. Kein Beleg, keine Datei: das waere
  -- Dokumentenhaltung mit eigenen Aufbewahrungs- und Loeschfristen.
  note           text,
  created_at     timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at     timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (session_id, obligation_id)
);

CREATE INDEX IF NOT EXISTS idx_session_obligation_session
  ON public.session_obligation_status(session_id);

-- 'done' ohne Datum waere eine Behauptung ohne Zeitpunkt; ein Datum ohne
-- 'done' waere ein Widerspruch. Die Datenbank laesst beides nicht zu.
ALTER TABLE public.session_obligation_status
  DROP CONSTRAINT IF EXISTS session_obligation_done_at_matches_status;
ALTER TABLE public.session_obligation_status
  ADD CONSTRAINT session_obligation_done_at_matches_status
  CHECK ((status = 'done') = (done_at IS NOT NULL));

-- Zugriff spiegelt `sessions`: eigene Zeilen fuer registrierte Nutzer,
-- Gast-Sitzungen nur ueber die Service-Rolle (die API filtert nach guest_key).
ALTER TABLE public.session_obligation_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own obligation status" ON public.session_obligation_status;
CREATE POLICY "Users can read own obligation status"
  ON public.session_obligation_status FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = session_obligation_status.session_id AND s.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can write own obligation status" ON public.session_obligation_status;
CREATE POLICY "Users can write own obligation status"
  ON public.session_obligation_status FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = session_obligation_status.session_id AND s.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = session_obligation_status.session_id AND s.user_id = auth.uid()
  ));
