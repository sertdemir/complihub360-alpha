---
name: complihub-loop-architect
description: Verwandelt ein vages CompliHub360-Ziel in eine ausfuehrbare Loop-Spec mit GOAL, ACT, CHECK, KEEP und STOP. Aktiviere, wenn der Nutzer einen Loop, Gauntlet oder eine Qualitaetsschleife fuer CompliHub360 aufsetzen will — Formulierungen wie "lass uns das als Loop fahren", "bau mir einen Loop fuer X", "Loop-Spec fuer den Screen", "wie waere die Stop-Bedingung", oder wenn ein Auftrag mehrere Runden Qualitaetsarbeit braucht statt eines One-Shots. Schreibt die Spec nach .loops/<slug>/LOOP.md und baut nichts. Verweigert Loops ohne binaer pruefbare Stop-Bedingung. NUR fuer CompliHub360 — fuer Cosmo Consult gilt cosmo-loop-architect.
---

# CompliHub Loop-Architect

Schreibt die Spec. Baut nichts. Der Bau ist Sache von `complihub-gauntlet`.

Lies zuerst `${CLAUDE_PLUGIN_ROOT}/references/loop-protocol.md` — der
Mechanismus steht dort und wird hier nicht wiederholt.

## Was dieser Skill tut

Aus einem Auftrag wie "die Landingpage muss besser werden" wird eine Datei, die
ein Agent ohne Rueckfragen abarbeiten kann und die ueber Kontext-Kompaktierung
hinweg gilt.

## Ablauf

### 1 — Eintrittsschwelle pruefen

Zuerst, immer: **lohnt sich hier ueberhaupt ein Loop?** Kriterien in
`loop-protocol.md` Abschnitt 2.

Wenn nein: das sagen, den One-Shot vorschlagen, und **keine Spec schreiben**.
Ein Loop fuer einen Button-Fix ist keine Sorgfalt, sondern Verschwendung. Diesen
Fall nicht schoenreden — der Nutzer hat mehr davon, wenn dieser Skill auch mal
Nein sagt.

### 2 — Bar waehlen

| Auftrag | Bar |
|---|---|
| Icon, Glyph, Symbol, Icon-Set | `icon` |
| Screen, View, Modal, Flow, Wizard-Schritt | `screen` |
| Landingpage, oeffentliche Seite, Marketing-Flaeche | `landing` |
| Compliance-Engine, Domaenenlogik, Redaction, Privacy-Gates | `engine` |

Passt nichts: **keine Bar erfinden.** Sagen, dass eine fehlt, und vorschlagen,
welche Achsen und welcher binaere Check sie braeuchte. Eine improvisierte Bar
ist schlimmer als keine, weil der Critic dann gegen nichts urteilt.

Alle Bars ausser `engine` ziehen `_compass.md`. Das ist nicht optional.

### 3 — GOAL schaerfen

Ein Satz, Praesens, ohne Wertadjektive. "Gut", "sauber", "professionell",
"modern" sind verboten — sie verschieben die Entscheidung in den Builder.

- schlecht: *Die Landingpage soll professionell wirken.*
- gut: *Ein Fremder versteht in fuenf Sekunden, was CompliHub360 tut, und findet den Einstieg in den Wizard.*

### 4 — Zerlegen

Stuecke nach `loop-protocol.md` Abschnitt 4. Die Probe: kann ein Critic dieses
Stueck **allein** beurteilen? Wenn nein, gehoert es mit einem anderen zusammen.

### 5 — CHECK aus der Bar uebernehmen

Die Kommandos stehen in der Bar. Nicht neu erfinden. Pruefen, dass sie in diesem
Repo wirklich laufen — ein CHECK, den niemand ausgefuehrt hat, ist kein CHECK.

Bei Design-Loops immer den Diff-Modus nehmen:

```
node ${CLAUDE_PLUGIN_ROOT}/checkers/token-drift.mjs --changed
```

Ohne `--changed` haftet der Loop fuer 600 Altlasten im Repo und geht nie auf
Gruen. Das ist der haeufigste Fehler beim Aufsetzen.

### 6 — STOP formulieren

Drei erlaubte Formen, siehe `loop-protocol.md` Abschnitt 6. Mindestens Erfolg
und Kein-Fortschritt.

**Harte Regel: kein binaerer Anteil, kein Loop.** Findet sich fuer das GOAL kein
Kommando, das exit 0 liefern kann, dann wird keine Spec geschrieben. Stattdessen
wird gesagt, welcher Checker fehlt — und der Bau dieses Checkers ist die
eigentliche Aufgabe. Das ist keine Bequemlichkeit, sondern der Punkt der ganzen
Methode.

### 7 — Gates aus der Bar uebernehmen

Ungefiltert. Gates werden nicht gekuerzt, weil sie im konkreten Fall
unwahrscheinlich wirken.

### 8 — Schreiben

`.loops/<slug>/LOOP.md` im Format aus `loop-protocol.md` Abschnitt 3, plus ein
leeres `.loops/<slug>/ROUNDS.md` mit Ueberschrift.

Existiert der Slug schon: **nicht ueberschreiben.** Den bestehenden Loop zeigen
und fragen, ob fortgesetzt oder neu angelegt wird.

## Ausgabe an den Nutzer

Kurz. Der Pfad zur Spec, das GOAL, das STOP, und die eine Sache, bei der du
unsicher warst. Nicht die ganze Datei nochmal in den Chat.

## Was dieser Skill nicht tut

- Er baut nicht. Kein Code, kein Figma, kein Commit.
- Er startet den Loop nicht — das macht `complihub-gauntlet`.
- Er erfindet keine Domaeneninhalte. Produkt- und Nutzeranforderungen kommen aus
  `GoogleDrive_Docs/`.
- Er arbeitet nicht fuer Cosmo Consult. Kommt so ein Auftrag: auf `cosmo-loops`
  verweisen, nichts bauen.
