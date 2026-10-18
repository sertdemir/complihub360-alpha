# Runbook: Assistent von Gemini auf Scaleway umstellen

Entscheidung: [ADR-0011](../decisions/ADR-0011-sprachmodell-scaleway-offene-modelle.md). Code: `services/compliance-api/src/llm.ts`.

Reihenfolge einhalten. Bis Schritt 4 antwortet der Assistent unverändert über Gemini.

## 1. Scaleway-Zugang anlegen

1. Konto bei Scaleway anlegen, Projekt „complihub360" wählen oder anlegen.
2. In der Konsole unter **IAM → API Keys** einen Schlüssel mit Berechtigung für **Generative APIs** erzeugen. Der **Secret Key** ist `LLM_API_KEY`.
3. AVV mit Scaleway abschließen und Scaleway in die Subprozessor-Liste der Datenschutzerklärung aufnehmen.

## 2. Verbindung prüfen

```bash
export LLM_API_KEY=<secret key>
curl -sS https://api.scaleway.ai/v1/models -H "Authorization: Bearer $LLM_API_KEY" | head -c 600
```

In der Liste müssen `mistral-small-3.2-24b-instruct-2506` und `qwen3-embedding-8b` stehen. Fehlt eines, die aktuellen IDs in `LLM_CHAT_MODEL` / `LLM_EMBED_MODEL` setzen.

## 3. DNA-Prüfbogen lokal

```bash
# Terminal 1
LLM_API_KEY=... npm run dev:service
# Terminal 2
node scripts/llm-eval/assistant-dna-review.mjs --api http://localhost:3005 --token <JWT eines Assistant-Pro-Testkontos>
```

Ohne Pro-Konto sind nur fünf Fragen pro Tag und Identität frei. Den Bogen lesen und je Frage das Urteil eintragen. **Ein Verstoß gegen eine harte DNA-Grenze stoppt hier.** Lokal ist der Korpus noch Gemini-eingebettet, die Antworten kommen also nur aus den Fakten; das prüft Ton und Grenzen, nicht die Trefferqualität.

## 4. Staging umstellen

Auf dem VPS in `/docker/complihub-api/.env`:

```bash
LLM_API_KEY=<secret key>
# GEMINI_API_KEY bleibt bis Schritt 6 stehen, wird aber nicht mehr genutzt
```

Container neu starten. Ab jetzt antwortet der Assistent über Mistral Small. Korpus-Auszüge fehlen bis Schritt 5, weil `sameEmbedModel` die alten Gemini-Vektoren ausfiltert.

## 5. Korpus neu einbetten

```bash
LLM_API_KEY=<secret key> python3 scripts/ingest-ey-corpus.py ~/Downloads/ey-gl-vat-guide-03-2026.pdf
```

Am Ende steht `✓ … chunks ingested with qwen3-embedding-8b`. Prüfen:

```sql
select metadata->>'embed_model' as model, count(*) from knowledge_chunks group by 1;
```

Es darf nur noch `qwen3-embedding-8b` stehen.

## 6. Prüfbogen gegen Staging, dann Gemini abschalten

1. Prüfbogen gegen Staging laufen lassen, jetzt mit Korpus.
2. Ist er sauber: `GEMINI_API_KEY` aus `/docker/complihub-api/.env` entfernen, Container neu starten, den Schlüssel in der Google-Konsole widerrufen.
3. Google aus der Subprozessor-Liste streichen.

## 7. Aufräumen im Code

Folge-PR: `geminiLegacy` und `gemini_embed_batch` entfernen, `GEMINI_API_KEY` aus den `.env.example`-Dateien streichen.

## Zurück, falls nötig

`LLM_API_KEY` leeren und Container neu starten. Dann greift wieder Gemini; nach Schritt 5 aber ohne Korpus-Treffer, bis der Korpus erneut mit Gemini eingebettet ist (`GEMINI_API_KEY=... python3 scripts/ingest-ey-corpus.py`).
