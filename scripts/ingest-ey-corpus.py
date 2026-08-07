#!/usr/bin/env python3
"""Ingest the EY Global VAT Guide country chapters into knowledge_chunks.

Chunks the 9 covered jurisdictions (DE UK NL FR IT ES US TR AT), embeds them
with Gemini text-embedding-004 (768 dims — matches the vector(768) schema) and
upserts into Supabase. The corpus is INTERNAL ground truth for the assistant;
the PDF itself must never land in the repo or be quoted verbatim to users.

Usage:
  GEMINI_API_KEY=... python3 scripts/ingest-ey-corpus.py [path-to-pdf]

Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.staging (repo root).
Re-running replaces each country's chunks (delete + insert per country).
"""
import json
import os
import re
import sys
import time
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


EMBED_MODEL = 'gemini-embedding-001'  # outputDimensionality 768 = vector(768) schema
EMBED_DIMS = 768


def _normalize(v: list) -> list:
    # Truncated (non-3072) gemini-embedding-001 vectors are not unit-length —
    # re-normalize so cosine similarity in match_knowledge_chunks stays clean.
    norm = sum(x * x for x in v) ** 0.5 or 1.0
    return [x / norm for x in v]


def gemini_embed_batch(api_key: str, texts: list) -> list:
    req = urllib.request.Request(
        f'https://generativelanguage.googleapis.com/v1beta/models/{EMBED_MODEL}:batchEmbedContents?key={api_key}',
        data=json.dumps({'requests': [
            {'model': f'models/{EMBED_MODEL}', 'content': {'parts': [{'text': t}]},
             'taskType': 'RETRIEVAL_DOCUMENT', 'outputDimensionality': EMBED_DIMS} for t in texts
        ]}).encode(),
        headers={'Content-Type': 'application/json'}, method='POST')
    # Free-tier 429s are routine — back off and retry instead of dying mid-run.
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=120) as res:
                body = json.loads(res.read())
            return [_normalize(e['values']) for e in body['embeddings']]
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < 5:
                wait = 15 * (attempt + 1)
                print(f'  429 — waiting {wait}s')
                time.sleep(wait)
            else:
                raise
    raise RuntimeError('unreachable')


def supabase(url: str, key: str, method: str, path: str, payload=None):
    req = urllib.request.Request(f'{url}/rest/v1/{path}',
                                 data=json.dumps(payload).encode() if payload is not None else None,
                                 headers={'apikey': key, 'Authorization': f'Bearer {key}',
                                          'Content-Type': 'application/json', 'Prefer': 'return=minimal'},
                                 method=method)
    with urllib.request.urlopen(req, timeout=120) as res:
        return res.status


def main():
    gemini_key = os.environ.get('GEMINI_API_KEY')
    if not gemini_key:
        sys.exit('GEMINI_API_KEY not set — create one at https://aistudio.google.com/apikey')
    env = {**env_from(os.path.join(REPO, '.env.staging')), **os.environ}
    sb_url, sb_key = env.get('SUPABASE_URL'), env.get('SUPABASE_SERVICE_ROLE_KEY')
    if not sb_url or not sb_key:
        sys.exit('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing (.env.staging)')

    chapters = load_chapters()
    total = 0
    for code, text in chapters.items():
        chunks = chunk_chapter(code, text)
        embeddings = []
        for i in range(0, len(chunks), EMBED_BATCH):
            embeddings += gemini_embed_batch(gemini_key, [c['content'] for c in chunks[i:i + EMBED_BATCH]])
            time.sleep(1)  # stay friendly to the free-tier rate limit
        rows = [{'content': c['content'], 'metadata': c['metadata'], 'embedding': e}
                for c, e in zip(chunks, embeddings)]
        # Replace this country's chunks atomically enough for a reference corpus.
        supabase(sb_url, sb_key, 'DELETE', f'knowledge_chunks?metadata-%3E%3Ecountry=eq.{code}')
        for i in range(0, len(rows), 50):
            supabase(sb_url, sb_key, 'POST', 'knowledge_chunks', rows[i:i + 50])
        total += len(rows)
        print(f'{code}: {len(rows)} chunks')
    print(f'✓ {total} chunks ingested')


if __name__ == '__main__':
    main()
