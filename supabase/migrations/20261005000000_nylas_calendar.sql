-- ─── Kalender-Anbindung (Nylas, Spec §11 P4) ────────────────────────────────
--
-- Drei Felder, mehr braucht die erste Stufe nicht:
--   providers.nylas_grant_id     — das verbundene Anbieter-Konto bei Nylas
--   providers.nylas_calendar_id  — welcher Kalender des Kontos gilt
--   scheduling.nylas_event_id    — der erzeugte Termin, damit Storno und
--                                  Verschieben spaeter daran andocken koennen
--
-- Alle drei sind NULLABLE und ohne Default: Ein Anbieter ohne verbundenen
-- Kalender bleibt buchbar, der Generator liefert dann wie bisher
-- Geschaeftszeiten. Die Anbindung ist eine Verbesserung, keine Voraussetzung.
--
-- Die Grant-ID ist kein Geheimnis im Sinne eines Tokens (die Tokens liegen bei
-- Nylas), identifiziert aber das Konto eines Partners — deshalb bleibt die
-- Spalte hinter derselben RLS wie der Rest der providers-Zeile.

alter table if exists public.providers
    add column if not exists nylas_grant_id text,
    add column if not exists nylas_calendar_id text;

alter table if exists public.scheduling
    add column if not exists nylas_event_id text;

comment on column public.providers.nylas_grant_id is
    'Nylas grant of the connected provider calendar. NULL = no calendar connected; slots fall back to the business-hours generator.';
comment on column public.providers.nylas_calendar_id is
    'Calendar within the grant that counts for availability and bookings (usually the primary address).';
comment on column public.scheduling.nylas_event_id is
    'Event created in the provider calendar for this booking. NULL = none created (calendar not connected, or the call failed — the booking stands either way).';

-- Nur Zeilen MIT Grant sind fuer den Kalender-Pfad interessant; der Teilindex
-- bleibt klein, auch wenn die Mehrzahl der Anbieter nie einen verbindet.
create index if not exists idx_providers_nylas_grant
    on public.providers (nylas_grant_id)
    where nylas_grant_id is not null;
