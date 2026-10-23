# Runbook: Assistent von Gemini auf Scaleway umstellen

Entscheidung: [ADR-0011](../decisions/ADR-0011-sprachmodell-scaleway-offene-modelle.md). Code: `services/compliance-api/src/llm.ts`.

> **Abgeschlossen am 23.10.2026.** Staging und Beta laufen über Scaleway, beide Korpora sind mit `qwen3-embedding-8b` neu eingebettet, `GEMINI_API_KEY` ist von beiden Servern entfernt und bei Google gelöscht, der Gemini-Code ist raus. Das Runbook bleibt als Protokoll und als Vorlage für einen späteren Anbieterwechsel stehen. Staging und Beta teilen einen `LLM_API_KEY`; beim Erneuern beide `.env` tauschen.

Reihenfolge einhalten. Bis Schritt 4 antwortete der Assistent unverändert über Gemini.

## 0. Migration VOR dem Merge einspielen

`20261018090000_match_chunks_embed_model.sql` ersetzt `match_knowledge_chunks` durch eine Fassung mit dem Parameter `embed_model`. Der neue Code schickt ihn mit. **Läuft der Code vor der Migration, findet PostgREST die Funktion nicht und der Assistent antwortet 502.** Deshalb zuerst auf Staging (und Beta) einspielen, dann mergen. Die Migration ist rückwärtsverträglich: Der alte Code ruft mit drei Argumenten und bekommt dasselbe Ergebnis wie bisher.

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

Einmalig `services/compliance-api/.env` anlegen (von Git ausgeschlossen):

```text
SUPABASE_URL=https://kqylqwogxbiwpnomkzsn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role-Schlüssel aus Supabase → Project Settings → API Keys>
LLM_API_KEY=<Scaleway Secret Key>
API_KEY=<beliebiger lokaler Testwert>
```

`API_KEY` braucht es, weil `/api/v1/assistant/chat` nur angemeldet erreichbar ist (Nutzer-JWT oder Server-Schlüssel).

```bash
# Terminal 1
npm run dev:service          # warten auf "Compliance API running on port 3005"
# Terminal 2
node scripts/llm-eval/assistant-dna-review.mjs --api http://localhost:3005 --api-key <API_KEY>
```

Nach fünf Fragen greift das Gratis-Kontingent (402). Der Bogen hält an und nennt die nächste Frage: Server in Terminal 1 neu starten (Ctrl+C, `npm run dev:service`), dann mit `--from 6` und danach `--from 11` weiter. Jeder Teil landet in einer eigenen Datei. Mit einem Assistant-Pro-Konto geht es in einem Lauf (`--token <JWT>`).

Den Bogen lesen und je Frage das Urteil eintragen. **Ein Verstoß gegen eine harte DNA-Grenze stoppt hier.** Im Kopf muss überall `openai-compatible:…` stehen. Lokal ist der Korpus noch Gemini-eingebettet, die Antworten kommen also nur aus den Fakten; das prüft Ton und Grenzen, nicht die Trefferqualität.

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

Es darf nur noch `qwen3-embedding-8b` stehen. Pro Land darf es nur einen Lauf geben:

```sql
select metadata->>'country' as land, count(distinct metadata->>'ingest_run') as laeufe, count(*)
from knowledge_chunks group by 1 order by 1;
```

`laeufe` muss überall 1 sein. Ein Abbruch mitten im Lauf lässt die alten Chunks stehen; einfach neu starten.

Die Kennung im Ingest (`LLM_EMBED_MODEL` oder Standard `qwen3-embedding-8b`) muss **exakt** der auf dem Server entsprechen. Weicht sie ab, findet der Assistent keinen Chunk und schreibt `ERR_ASSISTANT_CORPUS` ins Log; im `event_log` steht dann `corpus_missing: true`.

## 6. Prüfbogen gegen Staging, dann Gemini abschalten

1. Prüfbogen gegen Staging laufen lassen, jetzt mit Korpus. Im Kopf des Bogens muss überall `openai-compatible:…` stehen, sonst hat noch Gemini geantwortet.
2. **Schwelle kalibrieren:** `match_threshold` 0.4 stammt aus der Gemini-Zeit. Nach dem Lauf die Werte `top_similarity` im `event_log` ansehen:

   ```sql
   select payload->>'top_similarity' as top, payload->>'chunks' as chunks, "timestamp"
   from event_log where type = 'assistant_chat_result' and payload->>'provider' = 'openai-compatible'
   order by "timestamp" desc limit 20;
   ```

   Liegen passende Treffer deutlich über oder unter der Schwelle, `MATCH_THRESHOLD` in `assistant.ts` anpassen.

   **Erledigt am 23.10.2026:** Mit Qwen lagen passende Treffer bei 0,656–0,761, unpassende bei 0,567–0,646 (12 Prüffragen). Die Schwelle steht jetzt bei **0,6**. Das ist vorläufig; nach einer Woche echter Fragen erneut mit der Abfrage oben prüfen. `top_similarity` steht im Ereignis `assistant_chat_result`, nicht in `assistant_chat`.
3. Ist er sauber: `GEMINI_API_KEY` aus `/docker/complihub-api/.env` entfernen, Container neu starten, den Schlüssel in der Google-Konsole widerrufen.
4. Google aus der Subprozessor-Liste streichen.

   **Erledigt am 23.10.2026** für Staging und Beta: Schlüssel aus beiden `.env` entfernt, Container mit `docker compose up -d --force-recreate api` neu erzeugt (ein `restart` liest die `.env` nicht neu), Probefrage auf beiden über Scaleway. Beide Gemini-Schlüssel in AI Studio gelöscht. Die Datenschutzerklärung nennt seit #384 Scaleway statt Gemini. Beta wurde zusätzlich mit „Deploy Beta" auf `main` gebracht und mit eigenem Ingest neu eingebettet (Supabase-Werte aus `/docker/complihub-beta-api/.env` laden, `SUPABASE_URL` vor dem Lauf prüfen).

## 7. Aufräumen im Code

Erledigt: `geminiLegacy` und `gemini_embed_batch` sind entfernt, `GEMINI_API_KEY` steht in keiner `.env.example` mehr. Ein übrig gebliebener `GEMINI_API_KEY` wird ignoriert; ohne `LLM_API_KEY` antwortet der Assistent 503. `LEGACY_EMBED_MODEL` bleibt nur, damit Chunks ohne `embed_model`-Feld nie als Treffer gelten.

## Zurück, falls nötig

Seit Schritt 7 gibt es keinen Rückweg zu Gemini mehr im Code. Ein Anbieterwechsel geht über `LLM_BASE_URL`, `LLM_CHAT_MODEL` und `LLM_EMBED_MODEL` an einen anderen OpenAI-kompatiblen Endpunkt (IONOS, OVHcloud, eigener vLLM-Server). Ändert sich das Embedding-Modell, muss der Korpus neu eingebettet werden (Schritt 5).
