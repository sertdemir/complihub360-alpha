# ADR-0011: Sprachmodell — offene Modelle über Scaleway statt Gemini

**Status:** ACCEPTED (Entscheidung des Nutzers am 2026-10-18: „Scaleway mit Mistral Small")
**Date:** 2026-10-18
**Bezug:** [`KN-BRAND-001`](../../.knowledge/memory/nodes/KN-BRAND-001-complihub360-dna.md) §5 (AI Voice & Behavior) · [`privacy-no-raw-to-ai`](../../.agents/rules/privacy-no-raw-to-ai.md) · [`privacy-audit-required`](../../.agents/rules/privacy-audit-required.md) · ADR-0002 (DNA ohne CI-Gate) · [`docs/ai/jev-system-one-plan.md`](../ai/jev-system-one-plan.md) · `TKT-AI-01`

## Context

Der Assistent (`services/compliance-api/src/assistant.ts`) nutzt Gemini für zwei Dinge: die Antwort (`gemini-flash-latest`) und die Vektoren der Korpus-Suche (`gemini-embedding-001`, 768 Dimensionen). Gemini ist ein geschlossenes Modell eines US-Anbieters, und das Alias `latest` wechselt das Modell ohne unser Zutun.

Gewünscht ist ein Modell, das gleichwertig, offen und preiswert ist.

## Decision

1. **Offene Modelle über einen EU-Anbieter, kein eigener Server.** Scaleway Generative APIs (Paris), OpenAI-kompatible Schnittstelle.
   - Antwort: **Mistral Small 3.2** (`mistral-small-3.2-24b-instruct-2506`, Apache 2.0).
   - Embeddings: **Qwen3-Embedding-8B** (`qwen3-embedding-8b`, Apache 2.0), per Matryoshka auf **768** gekürzt und neu normiert — das Schema `vector(768)` bleibt.
2. **Anbieterneutral im Code.** `llm.ts` spricht jede OpenAI-kompatible API. Anbieter und Modell kommen aus `LLM_BASE_URL`, `LLM_CHAT_MODEL`, `LLM_EMBED_MODEL`. Ein Wechsel zu IONOS, OVHcloud oder einem eigenen vLLM-Server ist Konfiguration, kein Code.
3. **Kein Ausweichen zur Laufzeit.** Fällt Scaleway aus, antwortet der Assistent 502. Er gibt die Frage nie still an einen anderen Anbieter weiter.
4. **Gemini nur als Übergang.** Solange `LLM_API_KEY` fehlt, läuft der alte Weg weiter, damit Staging bis zur Umstellung antwortet. Nach dem Cutover wird der Gemini-Zweig entfernt (Runbook Schritt 7).
5. **Vektoren tragen ihr Modell.** Jeder Chunk speichert `metadata.embed_model`. `match_knowledge_chunks` filtert darauf **vor** dem LIMIT (Migration `20261018090000`, pgTAP-Test 23); der Altbestand ohne Feld gilt als `gemini-embedding-001`. So liefert die Übergangszeit nie Zufallstreffer aus fremden Vektoren. Bleibt eine Suche leer und hat der Korpus gar keine Chunks dieses Modells, schreibt der Assistent `ERR_ASSISTANT_CORPUS` und `corpus_missing: true`. Damit ist „nichts Passendes" von „falsch eingebettet" unterscheidbar.
6. **Markdown wird deterministisch entfernt.** Offene Modelle halten Prompt-Regel 5a (nur Klartext) nicht zuverlässig ein. `toPlainText` entfernt Fettung, Überschriften und Backticks.
7. **Audit nennt den Verarbeiter, auch im Fehlerfall.** `event_log` `assistant_chat` trägt `provider`, `model`, `embed_model`, `outcome` und bei Fehlern `stage`, weiterhin ohne Frageinhalt. Ein nicht geschriebener Eintrag wird geloggt (`ERR_ASSISTANT_AUDIT`). Abgeschnittene Antworten (`finish_reason=length`) werden nicht ausgeliefert.
8. **DNA-Prüfung vor dem Cutover durch einen Menschen.** `scripts/llm-eval/assistant-dna-review.mjs` erzeugt einen Prüfbogen mit zwölf Fragen in DE, EN, ES und TR. Mechanische Hinweise prüfen nur die Form; das Urteil trägt der Mensch ein (ADR-0002). Ein Verstoß gegen eine harte Grenze stoppt den Cutover.

## Consequences

- **Datenschutz:** Fragen verlassen die EU nicht mehr. Scaleway wird Unterauftragsverarbeiter; der Auftragsverarbeitungsvertrag (AVV) und die Subprozessor-Liste der Datenschutzerklärung sind vor dem Cutover zu ergänzen, Google entfällt danach.
- **Einmalig neu einbetten:** Der Korpus muss mit Qwen3-Embedding neu eingebettet werden (`scripts/ingest-ey-corpus.py`). Bis dahin antwortet der Assistent ohne Korpus-Auszüge, nur mit den strukturierten Fakten — ehrlich, aber dünner.
- **Kosten:** Listenpreise laut Scaleway 0,15 € je 1 Mio. Input- und 0,35 € je 1 Mio. Output-Tokens für Mistral Small, 0,10 € je 1 Mio. für Embeddings. Vor dem Cutover gegen die Preisseite prüfen.
- **Offen:** Türkisch ist bei Mistral Small nicht offiziell bestätigt. Fällt der Prüfbogen für TR schwach aus, ist die Alternative `LLM_CHAT_MODEL` auf ein Qwen-Modell zu setzen — ohne Codeänderung.
- **Privacy-Hook:** `privacy-raw-to-ai.mjs` kennt jetzt auch `api.scaleway.ai`, IONOS-Inference, `/v1/embeddings` und `LLM_API_KEY` als AI-Endpunkt.

## Alternatives

- **A — Eigener GPU-Server mit vLLM.** Volle Kontrolle, aber Betrieb rund um die Uhr und ein Vielfaches der Kosten bei heutigem Volumen. Bleibt als späterer Schritt offen, ohne Codeänderung.
- **B — IONOS (Berlin) mit Qwen.** Gleichwertig, deutsches Rechenzentrum. Nicht gewählt, weil Scaleway Antwort- und Embedding-Modell der Wahl aus einer Hand bietet. Bleibt per Konfiguration erreichbar.
- **C — Gemini behalten.** Verworfen: geschlossenes Modell, US-Anbieter, wechselndes `latest`-Alias.
