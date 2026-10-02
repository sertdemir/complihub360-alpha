# Guard-Hooks für Claude Code

Mechanische Stützen für die Agenten-Regeln dieses Repos. Verdrahtet in
[`../settings.json`](../settings.json), getestet mit `npm run hooks:test`
(läuft auch in CI, ohne Abhängigkeiten). Angelehnt an Hooks aus
[affaan-m/ECC](https://github.com/affaan-m/ECC) (MIT), auf CompliHub360
zugeschnitten.

| Hook | Wann | Wirkung |
|---|---|---|
| `block-no-verify.mjs` | vor jedem Bash-Aufruf | **sperrt** `--no-verify`, `git commit -n` und umgebogenes `core.hooksPath` bei commit/push/merge/cherry-pick/rebase/am |
| `config-protection.mjs` | vor Edit/Write | **fragt den Menschen**, bevor eine bestehende Lint-/Format-Config, die Hook-Konfiguration, `.agents/rules/`, die DNA (`KN-BRAND-001`), `.knowledge/vault/` oder ein `scripts/check-*.mjs` geändert wird |
| `privacy-raw-to-ai.mjs` | vor Edit/Write | **sperrt** Edits, die Raw-Ref (`raw://`, `rawVault` …) und AI-Endpoint (Gemini, Anthropic, OpenAI …) neu in einer Code-Datei zusammenführen — [privacy-no-raw-to-ai](../../.agents/rules/privacy-no-raw-to-ai.md) |
| `ui-typecheck.mjs` | nach Edit/Write unter `apps/vs1-demo/ui/src/` | meldet UI-Typfehler sofort an Claude zurück (`npm run typecheck` deckt die UI nicht ab) |

## Grenzen

- Die Hooks sehen nur die Tools Edit/Write/MultiEdit/NotebookEdit und Bash.
  Dateiänderungen über Bash (`sed -i`, Umleitungen) laufen an
  `config-protection` und `privacy-raw-to-ai` vorbei.
- `privacy-raw-to-ai` ist eine Heuristik auf Dateiebene, kein Datenfluss-Check.
  Sie ersetzt weder das Review noch die Tests der Gates.
- `block-no-verify` schützt Git-Hooks, die es lokal gibt. Das Repo selbst
  bringt derzeit keine mit; CI bleibt das eigentliche Gate.
- Hooks unter `.claude/hooks/` sind selbst geschützt: Ein Agent kann sie nicht
  ohne Rückfrage abschwächen.
