# Vault — kanonische Originale (Repo-Spiegel)

> [!] **Führendes System ist der Obsidian-Vault „Complihub360".** Dieser Ordner ist die versionierte Spiegelung davon im Repository.
> Grund: Agenten, die in CI oder in einer Remote-Session am Code arbeiten, haben **keinen Zugriff** auf den lokalen Obsidian-Vault. Ohne Kopie im Repo ist die DNA für sie unsichtbar — und damit wirkungslos.

Der Vault ist das **unveränderliche Archiv**. Hier liegt jedes Wissensdokument in seiner Originalfassung, so wie es freigegeben wurde — plus, wo sinnvoll, eine verlustfreie Textextraktion für Diff- und Suchbarkeit.

## Regeln

1. **Nicht inhaltlich bearbeiten.** Ein Vault-Artefakt wird nach der Ablage nicht mehr verändert. Inhaltliche Änderungen entstehen als **neue Version** (`_V2`), die alte Fassung bleibt liegen.
2. **Original zuerst.** Die Quelldatei (`.docx`, `.pdf`, …) ist maßgeblich. Eine `.md`-Extraktion daneben ist Komfort, nicht Ersatz.
3. **Integrität nachweisbar.** Für jedes Artefakt wird der SHA-256 im zugehörigen Wissensknoten hinterlegt. Prüfen mit:
   ```bash
   sha256sum .knowledge/vault/brand/CompliHub360_DNA_V1.docx
   ```
   Derselbe Hash gilt für die Datei im Obsidian-Vault — so ist belegbar, dass beide Seiten dieselbe Fassung tragen.
4. **Jedes Artefakt hat einen Knoten.** Ohne Eintrag in [`../memory/INDEX.md`](../memory/INDEX.md) ist ein Dokument im Vault für Agenten unsichtbar.
5. **Keine personenbezogenen oder Kundendaten.** Der Vault ist für interne Wissens- und Strategiedokumente. Kundendokumente und PII gehören ausschließlich in die Laufzeit-Vaults der Privacy-Pipeline (`packages/storage` → Raw/Sanitized Vault, Zone C/D) und niemals ins Repository.

## Drei Dinge heißen „Vault" — nicht verwechseln

| Was | Wo | Inhalt |
|---|---|---|
| **Obsidian-Vault „Complihub360"** | lokal auf dem Mac | führendes Wissenssystem, Ordner `00`–`99` |
| **Dieser Ordner** | `.knowledge/vault/` | Repo-Spiegel der freigegebenen Wissensartefakte |
| **Raw / Sanitized Vault** | `packages/storage` | Laufzeit-Speicher für hochgeladene **Kunden**dokumente (Privacy-Zonen C/D) |

Der dritte hat mit den ersten beiden nichts zu tun.

## Synchronisation mit dem Obsidian-Vault

| Obsidian-Vault | Repo |
|---|---|
| `95 Anhänge/CompliHub360_DNA_V1.docx` | `.knowledge/vault/brand/CompliHub360_DNA_V1.docx` |
| `02 Strategie/CompliHub360 DNA V1.md` | `.knowledge/vault/brand/CompliHub360_DNA_V1.md` (Extraktion) |
| `20 Claude Memory/KN-BRAND-001 …` | `.knowledge/memory/nodes/KN-BRAND-001-…md` |

Ändert sich im Obsidian-Vault eine Fassung, wird sie hier als **neue Version** nachgezogen und der SHA-256 im Knoten aktualisiert.

## Inhalt

| Artefakt | Version | Wissensknoten | SHA-256 (Original) |
|---|---|---|---|
| [`brand/CompliHub360_DNA_V1.docx`](brand/CompliHub360_DNA_V1.docx) | V1 | [`KN-BRAND-001`](../memory/nodes/KN-BRAND-001-complihub360-dna.md) | `ba9d0491c128d4d3d5f269ad204655918e9a6c2a6a15d2f82537dc7a30a3c4e8` |
