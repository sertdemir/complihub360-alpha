-- ─── Embedding-Suche nur innerhalb EINES Modells (ADR-0011, 2026-10-18) ─────
--
-- Der Assistent wechselt von gemini-embedding-001 auf qwen3-embedding-8b.
-- Vektoren verschiedener Modelle sind nicht vergleichbar: eine Qwen-Frage
-- gegen einen Gemini-Vektor ergibt Zufallsaehnlichkeit. Bisher filterte die
-- API erst NACH dem LIMIT — Fremdvektoren konnten die sechs Plaetze belegen
-- und passende Treffer verdraengen (Silent-Failure-Review 2026-10-18).
--
-- Jetzt filtert die Funktion selbst, VOR dem LIMIT. Chunks ohne
-- metadata.embed_model sind der Altbestand und gelten als
-- 'gemini-embedding-001'. Ohne Parameter (/api/v1/search) bleibt alles wie
-- bisher.
--
-- Die alte Signatur wird ersetzt, nicht ueberladen: zwei Funktionen gleichen
-- Namens machen den PostgREST-Aufruf mit drei Argumenten mehrdeutig.

drop function if exists public.match_knowledge_chunks(vector, double precision, integer);

create function public.match_knowledge_chunks (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  embed_model text default null
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    kc.id,
    kc.content,
    kc.metadata,
    1 - (kc.embedding <=> query_embedding) as similarity
  from public.knowledge_chunks kc
  where 1 - (kc.embedding <=> query_embedding) > match_threshold
    and (
      match_knowledge_chunks.embed_model is null
      or coalesce(kc.metadata->>'embed_model', 'gemini-embedding-001') = match_knowledge_chunks.embed_model
    )
  order by similarity desc
  limit match_count;
$$;

-- Wie 20261011000100: der Korpus ist intern, nur die API (service_role) sucht.
revoke all on function public.match_knowledge_chunks(vector, double precision, integer, text) from public, anon, authenticated;
grant execute on function public.match_knowledge_chunks(vector, double precision, integer, text) to service_role;
