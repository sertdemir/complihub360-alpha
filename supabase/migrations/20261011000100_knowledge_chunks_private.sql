-- ─── Der Wissenskorpus ist intern (Beta-Plan Mo 19.10.) ──────────────────────
--
-- `knowledge_chunks` traegt die Abschnitte des EY Global VAT Guide (438 auf
-- Staging, eingespielt mit scripts/ingest-ey-corpus.py). Das Skript sagt: der
-- Korpus ist INTERNE Grundlage fuer den Assistenten und wird Nutzern nie
-- woertlich gezeigt. Die Policy aus der Init-Migration ("globally readable",
-- USING true) gab ihn trotzdem jedem, der den anon-Key aus dem Browser-Bundle
-- nimmt und gegen PostgREST fragt — den ganzen Leitfaden, Abschnitt fuer
-- Abschnitt. Gefunden beim Vorbereiten der Beta-Datenbank (10.10.2026).
--
-- Gelesen wird der Korpus nur von der API, mit dem Service-Role-Key
-- (assistant.ts ueber match_knowledge_chunks). Der umgeht RLS. Also:
-- [Nachtrag 18.10.2026, nur Kommentar: /search las den Korpus bis dahin
-- ebenfalls, mit einem konstanten Vektor, und gab die Abschnitte im Wortlaut
-- an Gaeste — am Schutz hier vorbei. Seit #338 liest /search ihn nicht mehr.]
-- Policy weg (RLS bleibt an = deny-all fuer anon/authenticated), und die
-- RPC nur noch fuer service_role — sonst liefert sie per Embedding-Suche
-- dieselben Abschnitte, an der Tabelle vorbei.

drop policy if exists "Knowledge Chunks are globally readable" on public.knowledge_chunks;
alter table public.knowledge_chunks enable row level security;

revoke all on function public.match_knowledge_chunks(vector, double precision, integer) from public, anon, authenticated;
grant execute on function public.match_knowledge_chunks(vector, double precision, integer) to service_role;
