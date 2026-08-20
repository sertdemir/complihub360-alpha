# Memory — agentenlesbares Projektgedächtnis

> [!] Entspricht dem Ordner **`20 Claude Memory`** im Obsidian-Vault „Complihub360" und wird von dort gespiegelt. Führend ist der Obsidian-Vault; diese Kopie existiert, damit Agenten in CI und Remote-Sessions die Knoten überhaupt lesen können.

Die Memory ist die **verdichtete, strukturierte Schicht** über dem [Vault](../vault/README.md). Sie beantwortet für Agenten drei Fragen, ohne dass ein Original geöffnet werden muss:

1. **Was gilt?** — Kernaussagen und Prinzipien eines Dokuments.
2. **Wie verbindlich?** — Autoritätsstufe und betroffene Domänen (`binds`).
3. **Woher?** — Rückverweis auf das kanonische Vault-Artefakt inklusive Integritäts-Hash.

## Einstieg

→ **[INDEX.md](INDEX.md)** — Register aller Wissensknoten.

## Vault vs. Memory

| | Vault | Memory |
|---|---|---|
| Inhalt | Original, unverändert | verdichteter Wissensknoten |
| Änderbar | nein (nur neue Version) | ja (Knoten darf geschärft werden) |
| Zielgruppe | Nachweis, Zitat, Audit | Agenten und Menschen im Alltag |
| Format | `.docx`, `.pdf`, Textextraktion | Markdown mit YAML-Frontmatter |

Ein Knoten **ersetzt das Original nicht**. Bei wörtlichem Zitat oder Zweifel gilt der Vault.

## Nutzung durch Agenten

Vor produkt-, UX-, UI-, Copy-, Ranking- oder AI-Verhaltensentscheidungen: `INDEX.md` lesen, die Knoten mit passendem `binds`-Eintrag laden und die Entscheidung gegen deren Prüfkriterien testen. Für `KN-BRAND-001` ist das der Decision Filter (§6) und die Governing Question:

> *Does this decision make the user feel that CompliHub360 is still always on their side?*

Widerspricht ein anderes Dokument einem Knoten mit `authority: source-of-truth`, gewinnt der Knoten — und der Widerspruch wird gemeldet, statt still umgangen zu werden.
