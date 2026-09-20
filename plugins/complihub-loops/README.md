# complihub-loops

Loop Engineering und Gauntlet-Loops fuer CompliHub360.

**Nur CompliHub360.** Cosmo Consult hat ein eigenes, unabhaengiges Plugin
(`cosmo-loops`). Die beiden teilen sich bewusst keinen gemeinsamen Kern — siehe
"Warum zwei Plugins" unten.

## Was das loest

Ein Screen, ein Icon oder eine Landingpage wird heute von derselben Instanz
gebaut, die sie anschliessend fuer gut befindet. Das ist kein Modellfehler,
sondern eine Eigenschaft des geteilten Kontexts: wer die Begruendung fuer eine
Entscheidung im Kopf hat, sieht das Ergebnis durch diese Begruendung.

Dieses Plugin trennt Bauen und Bewerten:

- Der **Builder** macht einen Schritt.
- Ein **binaerer Check** entscheidet, was ueberhaupt zaehlt.
- Ein **Critic** mit frischem Kontext vergleicht blind gegen eine vorab gesetzte
  Latte und nennt die groesste Luecke — eine.
- Das **STOP** ist messbar, nicht geschmacklich.

## Installation

Das Repo ist sein eigener Marketplace. In diesem Repo:

```
/plugin marketplace add .
/plugin install complihub-loops@complihub
```

`.claude/settings.json` registriert den Marketplace bereits fuer alle, die dem
Ordner vertrauen.

## Benutzung

```
/complihub-loops:loop-spec  <auftrag>     # Spec schreiben, nichts bauen
/complihub-loops:gauntlet   <slug|ziel>   # Loop fahren
```

Claude zieht die Skills auch von selbst, wenn ein Auftrag danach klingt
("fahr das als Loop", "kritisier das hart gegen Compass").

## Aufbau

```
skills/complihub-loop-architect/   Auftrag  →  ausfuehrbare Spec
skills/complihub-gauntlet/         Spec     →  gefahrene Runden
bars/_compass.md                   Design-System-Anker, von jeder Design-Bar gezogen
bars/{icon,screen,landing,engine}  Latte, Achsen, Checks, Gates je Domaene
checkers/token-drift.mjs           Compass-Token-Drift (binaer)
checkers/contrast.mjs              WCAG 2.2 AA auf den Tokenpaaren (binaer)
references/loop-protocol.md        der markenneutrale Mechanismus
```

Der Zustand eines Loops liegt unter `.loops/<slug>/` — versioniert, damit er
Kontext-Kompaktierung und Session-Wechsel ueberlebt.

## Die Checker

```
node plugins/complihub-loops/checkers/token-drift.mjs --changed    # nur der eigene Diff
node plugins/complihub-loops/checkers/token-drift.mjs --tokens     # tokens.json gegen Compass
node plugins/complihub-loops/checkers/token-drift.mjs --svg a.svg  # Icon-Palette
node plugins/complihub-loops/checkers/contrast.mjs                 # Gate-Modus
node plugins/complihub-loops/checkers/contrast.mjs --no-baseline   # volles Palette-Audit
```

**`--changed` ist bei Design-Loops Pflicht.** Ein voller Scan meldet aktuell
ueber 600 Altlasten im Repo — daran geht kein Gate je auf Gruen, und ein Loop
haftet nicht fuer den Bestand, sondern fuer seinen eigenen Diff.

Zwei bekannte Zustaende, beide dokumentiert statt versteckt:

- `ui/design-system/tokens.json` weicht von der Compass-Spezifikation ab
  (Petrol, Gold, Border). Solange die Drift besteht, gilt Compass.
- Die Compass-v1-Palette hat fuenf offene Kontrastprobleme, festgehalten in
  `checkers/contrast-baseline.json`. Sie werden bei jedem Lauf mit `[bekannt]`
  ausgegeben und zaehlen nicht als neuer Fehler.

Beides gehoert in eigene Loops mit eigenen Tickets, nicht nebenbei in den
naechsten Screen.

## Warum zwei Plugins

`references/loop-protocol.md` ist in beiden Plugins byteidentisch — das ist die
einzige Dublette. Ein gemeinsames Kern-Plugin waere der Kanal, ueber den
Konventionen zwischen den Projekten leaken, und genau das verbietet die
Guardrail in `.agents/skills/qa-master/SKILL.md` ("No project mixing").
Plugin-zu-Plugin-Abhaengigkeiten sind ausserdem fragil.

Drift-Schutz statt Kopplung:

```
diff plugins/complihub-loops/references/loop-protocol.md \
     <pfad-zu>/cosmo-loops/references/loop-protocol.md
```

Alles andere unterscheidet sich ohnehin: Referenz, Achsen, Checks, Artefakte und
Gates haben zwischen CompliHub und Cosmo kaum Ueberschneidung.
