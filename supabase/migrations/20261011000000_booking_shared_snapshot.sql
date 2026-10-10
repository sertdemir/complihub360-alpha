-- ════════════════════════════════════════════════════════════════════════════
-- Was geteilt wird, ist was bestaetigt wurde (EN-Launch Schritt 4, B1)
-- ════════════════════════════════════════════════════════════════════════════
--
-- Checklist v1.0, Privacy Critical Test "Data minimization": "Only fields
-- disclosed in the confirmation screen and required for the request are
-- shared." Bis hier las der Anbieter die Firma aus der letzten Anfrage des
-- Nutzers, der Pruefdialog zeigte sie aus dem Profil — zwei Quellen, zwei
-- moegliche Werte. Entscheidung des Nutzers 2026-10-10 (B1): beim Buchen
-- werden genau die Werte festgehalten, die der Dialog gezeigt hat, und der
-- Anbieter liest nur sie.
--
-- `shared_snapshot` = { email, company_name, message, topic }. Die Form
-- erzwingt die Datenbank: keine weiteren Schluessel, und ein Wert darf nur
-- stehen, wenn sein Feld in `shared_fields` freigegeben ist. Aeltere Buchungen
-- bleiben ohne Schnappschuss (NULL); fuer sie gilt im API weiter nur
-- `shared_fields`.

alter table public.scheduling add column if not exists shared_snapshot jsonb;

alter table public.scheduling drop constraint if exists scheduling_shared_snapshot_shape;
alter table public.scheduling add constraint scheduling_shared_snapshot_shape check (
  shared_snapshot is null or (
    jsonb_typeof(shared_snapshot) = 'object'
    and (shared_snapshot - array['email', 'company_name', 'message', 'topic']) = '{}'::jsonb
    and (coalesce(shared_snapshot->>'email', '') = ''        or 'email' = any(shared_fields))
    and (coalesce(shared_snapshot->>'company_name', '') = '' or 'company_name' = any(shared_fields))
    and (coalesce(shared_snapshot->>'message', '') = ''      or 'message' = any(shared_fields))
  )
);

comment on column public.scheduling.shared_snapshot is
  'Die Werte, die der Nutzer im Pruefdialog bestaetigt hat (email, company_name, message, topic). Der Anbieter liest nur diese. EN-Launch Schritt 4, B1.';
