# Memory — Wissensknoten-Register

Register aller Wissensknoten. Ein Knoten ist die agentenlesbare, verdichtete Fassung eines Vault-Artefakts: Metadaten, Kernaussagen, Prüfkriterien und Verweise auf die kanonische Quelle.

**Lesereihenfolge für Agenten:** erst diesen Index, dann den relevanten Knoten, und nur bei Zitatbedarf oder Zweifel das Vault-Original.

## Aktive Knoten

| ID | Titel | Domäne | Version | Autorität | Vault-Quelle |
|---|---|---|---|---|---|
| [`KN-BRAND-001`](nodes/KN-BRAND-001-complihub360-dna.md) | CompliHub360 DNA V1 — Brand, Experience & Voice Foundation | brand | V1 | source-of-truth | [`vault/brand/CompliHub360_DNA_V1.docx`](../vault/brand/CompliHub360_DNA_V1.docx) |

## Autoritätsstufen

| Stufe | Bedeutung |
|---|---|
| `source-of-truth` | Bei Widerspruch gewinnt dieser Knoten. Abweichende Dokumente sind zu korrigieren. |
| `reference` | Verbindlicher Kontext, aber einer `source-of-truth` untergeordnet. |
| `draft` | Noch nicht freigegeben. Nicht als Entscheidungsgrundlage verwenden. |

## Namenskonvention

`KN-<DOMÄNE>-<NNN>-<slug>.md` — z. B. `KN-BRAND-001-complihub360-dna.md`.

Domänen: `BRAND` · `PRODUCT` · `ARCH` · `PRIVACY` · `DESIGN` · `GTM` · `OPS`

## Neuen Knoten anlegen

1. Original **zuerst** in `.knowledge/vault/<domäne>/` ablegen (siehe [Vault-README](../vault/README.md)).
2. SHA-256 des Originals berechnen: `sha256sum <datei>`.
3. Knoten unter `nodes/` anlegen — Frontmatter mit `id`, `title`, `type`, `domain`, `version`, `status`, `authority`, `vault_ref`, `sha256_docx`, `binds`, `tags`.
4. Zeile in die Tabelle oben eintragen.
5. Bei Ersetzung eines älteren Knotens: `supersedes:` im Frontmatter setzen und den alten Knoten auf `status: superseded` ändern — **nicht löschen**.
