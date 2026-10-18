#!/usr/bin/env python3
"""Ingest the EY Global VAT Guide country chapters into knowledge_chunks.

Chunks the 9 covered jurisdictions (DE UK NL FR IT ES US TR AT), embeds them
(768 dims — matches the vector(768) schema) and upserts into Supabase. The
corpus is INTERNAL ground truth for the assistant; the PDF itself must never
land in the repo or be quoted verbatim to users.

Embedding model (must match the one the assistant queries with, llm.ts):
  LLM_API_KEY set   → OpenAI-compatible endpoint, default Scaleway
                      qwen3-embedding-8b (LLM_BASE_URL / LLM_EMBED_MODEL
                      override). This is the target since 2026-10-18.
  GEMINI_API_KEY    → legacy gemini-embedding-001, transition only.
Every chunk records the model in metadata.embed_model; the assistant ignores
chunks embedded with a different model than its query.

Usage:
  LLM_API_KEY=... python3 scripts/ingest-ey-corpus.py [path-to-pdf]

Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.staging (repo root).
Re-running replaces each country's chunks (delete + insert per country).
"""
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser('~/Downloads/ey-gl-vat-guide-03-2026.pdf')
CHAPTERS = {'Austria': 'AT', 'France': 'FR', 'Germany': 'DE', 'Italy': 'IT', 'Netherlands': 'NL',
            'Spain': 'ES', 'Türkiye': 'TR', 'United Kingdom': 'UK', 'United States': 'US'}
CHUNK_CHARS = 1800
OVERLAP_CHARS = 200
EMBED_BATCH = 10  # small batches — free-tier TPM limits bite well below the API max of 100


def env_from(path: str) -> dict:
    vals = {}
    if os.path.exists(path):
        for line in open(path):
            m = re.match(r'^([A-Z_]+)=(.*)$', line.strip())
            if m:
                vals[m.group(1)] = m.group(2)
    return vals


def load_chapters() -> dict:
    from pypdf import PdfReader
    r = PdfReader(PDF)
    tops = []
    for it in r.outline:
        if not isinstance(it, list):
            try:
                tops.append((r.get_destination_page_number(it), it.title))
            except Exception:
                pass
    tops.sort()
    out = {}
    for i, (pg, title) in enumerate(tops):
        if title in CHAPTERS:
            end = tops[i + 1][0] if i + 1 < len(tops) else len(r.pages)
            out[CHAPTERS[title]] = '\n'.join((r.pages[p].extract_text() or '') for p in range(pg, end))
    return out


SECTION_RE = re.compile(r'^\s*([A-M])\.\s+([A-Z][^\n]{2,70})\s*$', re.M)


def chunk_chapter(code: str, text: str) -> list:
    # Track the running section header so every chunk knows its context.
    sections = [(m.start(), f"{m.group(1)}. {m.group(2).strip()}") for m in SECTION_RE.finditer(text)]

    def section_at(pos: int) -> str:
        current = 'Contacts / header'
        for start, title in sections:
            if start <= pos:
                current = title
            else:
                break
        return current

    chunks, pos, idx = [], 0, 0
    while pos < len(text):
        end = min(pos + CHUNK_CHARS, len(text))
        if end < len(text):
            # Prefer a paragraph boundary in the second half of the window.
            cut = text.rfind('\n', pos + CHUNK_CHARS // 2, end)
            if cut > pos:
                end = cut
        piece = text[pos:end].strip()
        if len(piece) > 200:
            chunks.append({
                'content': piece,
                'metadata': {'country': code, 'section': section_at(pos), 'chunk': idx,
                             'source': 'EY Global VAT Guide 03/2026 (internal)'},
            })
            idx += 1
        pos = max(end - OVERLAP_CHARS, pos + 1)
    return chunks


EMBED_DIMS = 768
LEGACY_EMBED_MODEL = 'gemini-embedding-001'


def _fit(v: list) -> list:
    # Matryoshka vectors (Qwen3-Embedding, truncated gemini-embedding-001) are
    # cut to the schema width and re-normalized so cosine similarity stays clean.
    if len(v) < EMBED_DIMS:
        raise ValueError(f'embedding has {len(v)} dims, schema needs {EMBED_DIMS}')
    v = v[:EMBED_DIMS]
    norm = sum(x * x for x in v) ** 0.5
    if not norm:
        raise ValueError('zero embedding vector')
    return [x / norm for x in v]


def _post_with_backoff(req) -> dict:
    # Rate-limit 429s are routine on batch runs — back off and retry instead of
    # dying mid-run.
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=120) as res:
                return json.loads(res.read())
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < 5:
                wait = 15 * (attempt + 1)
                print(f'  429 — waiting {wait}s')
                time.sleep(wait)
            else:
                raise
    raise RuntimeError('unreachable')


def openai_embed_batch(cfg: dict, texts: list) -> list:
    # Documents get NO instruction prefix — Qwen3-Embedding instructs queries only.
    req = urllib.request.Request(
        f"{cfg['base_url']}/embeddings",
        data=json.dumps({'model': cfg['model'], 'input': texts, 'dimensions': EMBED_DIMS}).encode(),
        headers={'Content-Type': 'application/json', 'Authorization': f"Bearer {cfg['key']}"}, method='POST')
    body = _post_with_backoff(req)
    rows = sorted(body['data'], key=lambda d: d.get('index', 0))
    if len(rows) != len(texts):
        raise RuntimeError(f'embeddings: sent {len(texts)} texts, got {len(rows)} vectors')
    return [_fit(d['embedding']) for d in rows]


def gemini_embed_batch(cfg: dict, texts: list) -> list:
    req = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{LEGACY_EMBED_MODEL}:batchEmbedContents?key={cfg['key']}",
        data=json.dumps({'requests': [
            {'model': f'models/{LEGACY_EMBED_MODEL}', 'content': {'parts': [{'text': t}]},
             'taskType': 'RETRIEVAL_DOCUMENT', 'outputDimensionality': EMBED_DIMS} for t in texts
        ]}).encode(),
        headers={'Content-Type': 'application/json'}, method='POST')
    return [_fit(e['values']) for e in _post_with_backoff(req)['embeddings']]


def embedder() -> dict:
    """Same precedence as resolveLlm() in services/compliance-api/src/llm.ts."""
    key = (os.environ.get('LLM_API_KEY') or '').strip()
    if key:
        return {'key': key, 'fn': openai_embed_batch, 'batch': 32,
                'base_url': (os.environ.get('LLM_BASE_URL') or 'https://api.scaleway.ai/v1').strip().rstrip('/'),
                'model': (os.environ.get('LLM_EMBED_MODEL') or 'qwen3-embedding-8b').strip()}
    key = (os.environ.get('GEMINI_API_KEY') or '').strip()
    if key:
        print('! GEMINI_API_KEY only — legacy embeddings (transition). Set LLM_API_KEY for Scaleway.')
        # small batches — free-tier TPM limits bite well below the API max of 100
        return {'key': key, 'fn': gemini_embed_batch, 'batch': 10, 'model': LEGACY_EMBED_MODEL}
    sys.exit('LLM_API_KEY not set — create a Scaleway API key (Generative APIs), see docs/runbooks/llm-scaleway-umstellung.md')


def supabase(url: str, key: str, method: str, path: str, payload=None):
    req = urllib.request.Request(f'{url}/rest/v1/{path}',
                                 data=json.dumps(payload).encode() if payload is not None else None,
                                 headers={'apikey': key, 'Authorization': f'Bearer {key}',
                                          'Content-Type': 'application/json', 'Prefer': 'return=minimal'},
                                 method=method)
    with urllib.request.urlopen(req, timeout=120) as res:
        return res.status


def main():
    emb = embedder()
    env = {**env_from(os.path.join(REPO, '.env.staging')), **os.environ}
    sb_url, sb_key = env.get('SUPABASE_URL'), env.get('SUPABASE_SERVICE_ROLE_KEY')
    if not sb_url or not sb_key:
        sys.exit('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing (.env.staging)')
    print(f"embedding with {emb['model']}")

    chapters = load_chapters()
    total = 0
    for code, text in chapters.items():
        chunks = chunk_chapter(code, text)
        embeddings = []
        for i in range(0, len(chunks), emb['batch']):
            embeddings += emb['fn'](emb, [c['content'] for c in chunks[i:i + emb['batch']]])
            time.sleep(1)  # stay friendly to the rate limit
        rows = [{'content': c['content'], 'metadata': {**c['metadata'], 'embed_model': emb['model']}, 'embedding': e}
                for c, e in zip(chunks, embeddings)]
        # Replace this country's chunks atomically enough for a reference corpus.
        supabase(sb_url, sb_key, 'DELETE', f'knowledge_chunks?metadata-%3E%3Ecountry=eq.{code}')
        for i in range(0, len(rows), 50):
            supabase(sb_url, sb_key, 'POST', 'knowledge_chunks', rows[i:i + 50])
        total += len(rows)
        print(f'{code}: {len(rows)} chunks')
    print(f"✓ {total} chunks ingested with {emb['model']}")


if __name__ == '__main__':
    main()
