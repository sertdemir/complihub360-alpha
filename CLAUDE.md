# CompliHub360 — Projektkontext für Claude

CompliHub360 ist eine Orchestrator-Plattform für Compliance: Sie macht aus unstrukturiertem Compliance-Bedarf strukturierte Problemdefinitionen, belegte Informationen und passende Provider-Optionen. npm-Workspaces-Monorepo, Node ≥ 22.12, TypeScript.

---

# Die DNA gilt immer

CompliHub360 verkauft nicht Compliance-Services, sondern **Vertrauen**. Vor jeder Entscheidung, die ein User spüren wird, gilt:

> **Does this decision make the user feel that CompliHub360 is still always on their side?**

Kurzfassung: **Always on your side.** · Trust is our product. · Experience is how trust is delivered. · Voice: Professional first. Human always.

## Harte Grenzen — nicht abwägbar

Diese sind keine Filterfragen, sondern Blocker. Ein Verstoß ist ein Grund, die Arbeit zu stoppen:

- **Angst wird nie zur Conversion eingesetzt.** Dringlichkeit ist keine Verkaufstaktik.
- **We do not create needs. We identify them.** Optionale kommerzielle Chancen werden nie als Compliance-Pflicht dargestellt.
- Die AI gibt sich **nie** als Anwältin, Steuerberaterin, Zollspezialistin oder andere menschliche Fachperson aus.
- Unsicherheit wird nie hinter selbstsicherer Sprache versteckt — lieber die Grenze benennen.
- Respekt und Tonalität variieren **nie** nach Unternehmensgröße oder kommerziellem Wert.
- Es wird nie Reibung erzeugt, um den Zugang zu einem Menschen zu verhindern.
- Keine Hype-Sprache („revolutionary", „game-changing", „#1", „ultimate"). *Let the experience create the wow.*

> **Never make the user feel small so CompliHub360 can feel smart.**

## Wann du den vollen Knoten laden musst

Berührt die Aufgabe eines dieser Dinge, lies **vor** der Umsetzung
[`.knowledge/memory/nodes/KN-BRAND-001-complihub360-dna.md`](.knowledge/memory/nodes/KN-BRAND-001-complihub360-dna.md)
und prüfe gegen den Decision Filter:

Copy und Microcopy · Wizard (Fragen, Reihenfolge, Abbruchpunkte) · Risk Map (Darstellung, Dringlichkeitssprache) · Ranking und Matching · AI-Verhalten (Prompts, Antworten, Handoff) · Monetarisierung (Paywalls, Upsells, CTAs) · Registrierung und Gating · Provider-Policies

**Im Zweifel: prüfen.** Eine überflüssige Prüfung kostet Minuten, eine ausgelassene kostet Vertrauen.

Nicht ausgelöst durch: Refactorings ohne Verhaltensänderung, Build- und CI-Konfiguration, Tests, Dependency-Updates, Typ- und Lint-Korrekturen.

## Bei Konflikt

Widerspricht ein Spec, ein Ticket oder bestehender Code der DNA, **gewinnt die DNA** — den Widerspruch benennen und die andere Stelle korrigieren, statt ihn still zu umgehen.

**Einen DNA-Konflikt nie selbst auflösen.** Nicht befinden, ein Verstoß sei „vertretbar", „temporär" oder „durch Geschäftsinteresse gedeckt" — das ist die eine Entscheidung, die beim Menschen liegt. Stoppen, den Widerspruch benennen (welcher Filterpunkt, welche Stelle), eskalieren.

Regelwerk: [`.agents/rules/dna-decision-filter.md`](.agents/rules/dna-decision-filter.md) · Begründung: [ADR-0002](docs/decisions/ADR-0002-dna-as-binding-agent-rule.md)

## Wenn du Subagenten einsetzt

Subagenten erben diese Datei **nicht** zuverlässig — in der Remote-Umgebung erhalten sie empirisch gar keinen Projektkontext (geprüft 2026-08-20 mit `general-purpose`). Delegierst du eine Aufgabe aus dem Auslöserkatalog oben, gib die harten Grenzen und den Pfad zu `KN-BRAND-001` **explizit im Prompt mit**. Sonst arbeitet der Subagent ohne DNA.

---

# Privacy — ebenfalls nicht verhandelbar

Die Privacy-Architektur ist deterministisch und der AI immer vorgelagert. Details in [`.agents/rules/`](.agents/rules/):

- **Nie Rohdaten an eine AI.** Ein `raw://`-Ref oder Roh-Buffer darf keinen AI-Endpoint erreichen — nur `sanitized_storage_ref`.
- **Redaction bleibt deterministisch.** Regex und feste Heuristiken zur PII-Erkennung, keine LLMs oder probabilistischen Modelle.
- **Grenzübertritte werden auditiert** (Raw speichern, Sanitized speichern, Sanitized an AI, Retention-Löschung).
- Kundendokumente und PII gehören ausschließlich in die Laufzeit-Vaults (`packages/storage`, Zonen C/D) — **niemals** ins Repository.

---

# Wo was liegt

| Pfad | Inhalt |
|---|---|
| [`.knowledge/memory/INDEX.md`](.knowledge/memory/INDEX.md) | **Einstieg ins Projektwissen** — Register aller Wissensknoten |
| `.knowledge/vault/` | kanonische Originale, unveränderlich, mit SHA-256 |
| `GoogleDrive_Docs/` | Produkt-, User- und Feature-Anforderungen (Vision, Personas, Flows, Ranking, Monetarisierung) |
| `docs/decisions/` | Architecture Decision Records |
| `docs/api/openapi.yaml` | maßgeblich für Backend und Services |
| `.agents/rules/` | bindende Regeln für Agenten |
| `.tickets/` | Ticket-Lifecycle (`doing` → `review` → `done`) |

Führendes Wissenssystem ist der Obsidian-Vault „Complihub360" auf dem Rechner des Product Owners; `.knowledge/` ist dessen versionierter Spiegel, damit CI und Remote-Sessions die Knoten überhaupt lesen können.

# Befehle

```bash
npm run typecheck    # tsc über alle Workspaces
npm run test         # Tests über alle Workspaces
npm run lint         # eslint (.ts/.tsx)
npm run build        # Build über alle Workspaces
npm run dev:ui       # UI (@vs1-demo/ui)
npm run dev:service  # API (@complihub/compliance-api)
npm run i18n:check   # Übersetzungen prüfen
```

CI (`quality-gates`) läuft bei jedem PR gegen `main`. Vor dem Push mindestens `typecheck` und `test` lokal grün haben.
