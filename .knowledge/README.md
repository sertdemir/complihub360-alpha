# Knowledge — Wissensbasis von CompliHub360

Repo-seitige Wissensablage. Führendes System ist der **Obsidian-Vault „Complihub360"** auf dem Rechner des Product Owners; dieser Ordner spiegelt die freigegebenen Artefakte, damit Agenten in CI und in Remote-Sessions sie lesen können.

## Struktur

| Ordner | Inhalt | Obsidian-Entsprechung |
|---|---|---|
| [`memory/`](memory/README.md) | verdichtete Wissensknoten, agentenlesbar — **Einstieg:** [INDEX](memory/INDEX.md) | `20 Claude Memory` |
| [`vault/`](vault/README.md) | kanonische Originale, unveränderlich, mit SHA-256 | `95 Anhänge` + Fachordner |
| [`notebooklm/`](notebooklm/README.md) | Exporte und Quellen aus NotebookLM | — |

## Für Agenten

Vor produkt-, UX-, UI-, Copy-, Ranking- oder AI-Verhaltensentscheidungen:

1. [`memory/INDEX.md`](memory/INDEX.md) lesen.
2. Die Knoten laden, deren `binds` zur Aufgabe passt.
3. Die Entscheidung gegen deren Prüfkriterien testen.

Für [`KN-BRAND-001`](memory/nodes/KN-BRAND-001-complihub360-dna.md) (CompliHub360 DNA) ist das der Decision Filter und die Governing Question:

> *Does this decision make the user feel that CompliHub360 is still always on their side?*

Widerspricht ein anderes Dokument einem Knoten mit `authority: source-of-truth`, gewinnt der Knoten — und der Widerspruch wird gemeldet, statt still umgangen zu werden.

## Abgrenzung

`vault/` hier hat **nichts** mit dem Raw Vault und Sanitized Vault in `packages/storage` zu tun. Jene sind Laufzeit-Speicher für hochgeladene Kundendokumente in den Privacy-Zonen C und D. Kundendaten und PII gehören niemals in dieses Verzeichnis.
