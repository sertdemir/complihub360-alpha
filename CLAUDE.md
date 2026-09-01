# CompliHub360 — Arbeitskonventionen

## Design

- **"Gradient"** (Nutzer-Vokabular, Festlegung 2026-08-25): Sagt der Nutzer
  "Gradient" / "der Verlauf", ist IMMER genau diese Farbkombination gemeint —
  `linear-gradient(165deg, #EAF3F1 0%, #DDECE8 55%, #E9E4D3 100%)`
  (Petrol- zu Gold-Tint). Sie liegt unter den Showcase-Panels der Homepage
  (EntryDoorDemo, RiskMapShowcase) und ist der Konsistenzanker für alle
  weiteren getönten Flächen. Keine Varianten erfinden.
- **FAQ** (Festlegung 2026-08-28): Es gibt genau EINE FAQ-Komponente auf der
  Site — die geteilte `FaqList` aus `components/home/HomeFaq.tsx`
  (Chevron-Disclosure, single-open, erste Frage standardmäßig offen). Jede
  Fläche, die eine FAQ bekommt, nutzt sie; keine Parallel-Implementierungen
  bauen. Thematische Tabs (wie auf der Startseite) sind Sache des Aufrufers,
  nicht der Liste.
- **Redesign-Workflow** (Festlegung 2026-08-28): Bei einer Seiten-Überarbeitung
  oder einer neuen Seite ZUERST die ganze Seite durchgehen und für ALLE
  Sektionen je drei Varianten in EINEM Canvas abbilden — nicht Sektion für
  Sektion nachliefern. Der Nutzer geht dann alles in einem Durchgang durch und
  nennt seine Wahl je Sektion; erst danach wird ausgerollt.

## Ansprache

- **Du, nicht Sie** (Festlegung 2026-08-29). Der Nutzer und Claude duzen sich.
  Gilt für Chat-Antworten; Produkt-Copy und Oberflächentexte bleiben davon
  unberührt — die siezen weiter.

## Vault-Log (Festlegung 2026-09-01)

- Das Projekt-Gedächtnis liegt im Obsidian-Vault-Repo
  **`sertdemir/complihub360-vault`**, Haupt-Vault im Ordner
  `Complihub360/` (1:1 vom Mac importiert; Konvention im dortigen README).
- **Nach jedem Merge in dieses Repo** schreibt Claude dort fort und
  pusht direkt auf `main` des Vault-Repos — kein PR-Umweg:
  Sitzungs-Log → `08 Daily/JJJJ-MM-TT Kurztitel.md` · Doku →
  `05 Technik/` + Wikilink in der Technik-MOC · Entscheidungen → eine
  Notiz je Entscheidung in `07 Entscheidungen/` (Template
  `13 Templates/Entscheidung.md`) + Zeile oben im Entscheidungslog ·
  Merk-Fakten → `11 Claude Memory/` (eine Notiz = ein Fakt).
- Frontmatter wie in den Vault-Templates, Wikilinks statt Pfade.
  Keine Secrets, keine personenbezogenen Daten.
