-- Das Dossier eines Anbieters: Leistungen und Nachweise
--
-- Die Partnerseite (Canvas "Partnerseite", Nutzer-Wahl 2026-09-15, Sektion 3B)
-- zeigt drei Karten: Leistungen, Qualifikation, Abdeckung. Abdeckung steht
-- schon in `countries_supported` und `languages`. Die beiden anderen nicht:
-- `categories` nennt nur Bereichs-Slugs ("tax-vat"), und die Nachweise, die ein
-- Anbieter im Intake mitschickt (`certifications`), landeten bisher lediglich
-- als Anzahl im Event-Log und wurden danach weggeworfen.
--
-- Ohne diese Spalten haette die Seite zwei Moeglichkeiten: leere Karten oder
-- erfundene Inhalte. Beides ist ausgeschlossen — also bekommt der Anbieter
-- einen Ort, an dem er sagt, was er tut und was er vorweisen kann.
--
-- Struktur (beides jsonb, weil die Zeilen Paare sind, keine flachen Listen):
--   services     [{ "title": "OSS/IOSS-Registrierung",
--                   "includes": ["Anmeldung beim BZSt", "Quartalsmeldungen"] }]
--   credentials  [{ "label": "Steuerberater-Zulassung (DE)",
--                   "note": "seit 2013 · Kammer geprueft" }]
--
-- NULL heisst: der Anbieter hat nichts hinterlegt. Die Karte sagt das dann auch
-- so — sie erfindet keine Leistung und keinen Titel.

ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS services jsonb,
  ADD COLUMN IF NOT EXISTS credentials jsonb,
  ADD COLUMN IF NOT EXISTS excluded_services text[],
  ADD COLUMN IF NOT EXISTS work_mode text;

COMMENT ON COLUMN public.providers.services IS
  'Leistungen als [{title, includes[]}]. Aus dem Intake. NULL = nichts hinterlegt, die Karte bleibt leer statt zu raten.';
COMMENT ON COLUMN public.providers.credentials IS
  'Geprüfte Nachweise als [{label, note}] — Zulassung, Fachtitel, Zertifikate. Im Onboarding von CompliHub360 geprüft.';
COMMENT ON COLUMN public.providers.excluded_services IS
  'Was dieser Anbieter ausdrücklich NICHT macht. Steht als "Was nicht dabei ist" unter den Leistungen — ein Anbieter, der seine Grenze nennt, spart dem Mandanten ein Gespräch.';
COMMENT ON COLUMN public.providers.work_mode IS
  'Arbeitsweise in einem Wort oder zweien, z. B. "remote" oder "remote · Portal". Freitext des Anbieters.';
