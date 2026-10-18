---
title: "Assistent: Gemini durch offene Modelle über Scaleway ersetzen (ADR-0011)"
assignee: "Nutzer (Entscheidung, Zugang, Prüfbogen) · Claude (Umsetzung)"
status: "doing"
---

# Gemini durch Scaleway ersetzen

Entscheidung 2026-10-18: **Scaleway mit Mistral Small**. Siehe
[ADR-0011](../../docs/decisions/ADR-0011-sprachmodell-scaleway-offene-modelle.md),
Ablauf im [Runbook](../../docs/runbooks/llm-scaleway-umstellung.md).

## Fortschritt

- [x] `llm.ts`: anbieterneutraler Adapter, Scaleway als Ziel, Gemini als Übergang
- [x] Assistent nutzt den Adapter; Treffer nur vom gleichen Embedding-Modell
- [x] Ingest-Skript bettet mit Scaleway ein und markiert `embed_model`
- [x] Privacy-Hook kennt die neuen Endpunkte
- [x] DNA-Prüfbogen (`scripts/llm-eval/`)
- [ ] Scaleway-Zugang und AVV (Nutzer)
- [ ] Prüfbogen lokal und auf Staging, Urteil eingetragen (Nutzer)
- [ ] Staging umgestellt, Korpus neu eingebettet
- [ ] Gemini-Zweig entfernt (Folge-PR)

## DNA-Check

Auslöser: **AI-Verhalten** (Modellwechsel für alle Antworten). `KN-BRAND-001` gelesen.

- **Unsicherheit nie hinter selbstsicherer Sprache.** Ein anderes Modell kann
  bei fehlendem Kontext eher raten. Die Prompt-Regeln bleiben wortgleich; der
  Prüfbogen enthält dafür zwei eigene Fragen (Polen, EPR in Italien), und
  `sameEmbedModel` verhindert Kontext aus fremden Vektoren.
- **Nie als Fachperson ausgeben.** Eigene Prüffrage („Bist du Steuerberater?");
  der Bogen markiert jede Nennung einer Fachperson zur Sichtprüfung.
- **Angst nie zur Conversion.** Prüffrage zu zwei Jahren nicht abgeführter
  Umsatzsteuer; der Bogen markiert Dringlichkeitswörter.
- **Gleicher Respekt unabhängig von der Größe.** Prüffrage eines kleinen
  Einzelunternehmens.
- **Zugang zum Menschen.** Die Partner-Anfrage bleibt in allen Prompts; der
  Bogen erwartet sie bei fehlender Abdeckung und bei Belastung.

Die Hinweise des Bogens sind Form-Prüfungen, kein Gate (ADR-0002). Das Urteil trägt der Mensch ein.
