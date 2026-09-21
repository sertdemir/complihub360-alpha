# Loop-Protokoll

Der markenneutrale Mechanismus. Diese Datei ist in `complihub-loops` und
`cosmo-loops` **byteidentisch** — sie enthaelt bewusst nichts Projektspezifisches.
Alles, was nach Marke, Design-System oder Repo riecht, gehoert in eine Bar
(`bars/*.md`), nicht hierher.

Weicht die Datei zwischen den beiden Plugins ab, ist das entweder eine bewusste
Entscheidung oder ein Fehler. Pruefen mit:

```
diff <pfad>/complihub-loops/references/loop-protocol.md \
     <pfad>/cosmo-loops/references/loop-protocol.md
```

---

## 1 — Was ein Loop ist

Ein Loop ist kein Prompt und keine Checkliste. Er ist ein Zyklus mit einer
Abbruchbedingung, die **nicht der Builder selbst beurteilt**.

Fuenf Felder, mehr nicht:

```
GOAL:  Wie "fertig" aussieht — ein Satz, im Praesens, ohne Adjektive wie "gut" oder "sauber"
ACT:   Der eine fokussierte Schritt pro Durchlauf
CHECK: Die wiederholbare Messung — ein Kommando oder ein benanntes Urteil
KEEP:  Wann eine Aenderung bleibt, wann sie zurueckgerollt wird
STOP:  Erfolgsbedingung ODER Kein-Fortschritt-Bedingung ODER Approval-Gate
```

Der haeufigste Fehler ist ein subjektives STOP. `STOP: wenn es gut aussieht` ist
kein Loop, sondern ein Wunsch. Siehe Abschnitt 6.

---

## 2 — Eintrittsschwelle: wann ein Loop sich lohnt

Ein Gauntlet kostet ein Vielfaches eines One-Shots, weil pro Stueck ein Builder
**und** ein Critic laeuft, ueber mehrere Runden. Das rechnet sich nicht immer.

Loop fahren, wenn **mindestens zwei** davon zutreffen:

- Das Ergebnis wird von aussen gesehen (Kunde, Stakeholder, oeffentliche Seite).
- Es gibt eine benennbare Referenz, gegen die man vergleichen kann.
- Die erste Fassung ist erfahrungsgemaess nicht die letzte.
- Der Fehler waere teuer zu korrigieren, nachdem er ausgeliefert ist.

Kein Loop bei: Button-Fix, Textkorrektur, Rename, Dependency-Bump, allem mit
genau einer richtigen Antwort. Dort ist der One-Shot korrekt, und ein Critic
erzeugt nur Kosten und Scheinbeschaeftigung.

Wenn die Schwelle nicht erreicht ist: **das sagen und den One-Shot machen.**
Nicht den Loop trotzdem starten, weil er verfuegbar ist.

---

## 3 — Die Loop-Spec

Jeder Loop bekommt ein Verzeichnis unter `.loops/<slug>/`. Der Zustand liegt auf
Platte, nicht im Kontextfenster — damit ueberlebt ein Loop Kompaktierung,
Session-Neustart und Uebergabe an einen anderen Menschen.

```
.loops/<slug>/
  LOOP.md      # die Spec — wird einmal geschrieben, danach nur bei Scope-Aenderung angefasst
  ROUNDS.md    # der Rundenlog — waechst mit jeder Runde, wird nie umgeschrieben
  artifacts/   # optional: Screenshots, Exporte, Diffs pro Runde
```

`LOOP.md` hat genau dieses Format:

```markdown
---
slug: <kebab-case>
bar: <name der bar-datei ohne endung>
created: <YYYY-MM-DD>
max_rounds: <zahl>
status: open | won | stopped | blocked
---

## GOAL
<ein satz>

## PIECES
- <stueck-1>: <was es ist, warum es unabhaengig bewertbar ist>
- <stueck-2>: ...

## ACT
<der eine schritt pro durchlauf, pro stueck>

## CHECK
| Art | Kommando / Verfahren | Erwartung |
|---|---|---|
| binaer | `<kommando>` | exit 0 |
| geurteilt | blind A/B gegen <referenz> | Output gewinnt |

## KEEP
<regel>

## STOP
<eine der drei erlaubten formen aus abschnitt 6>

## GATES
<approval-gates, die den loop anhalten — siehe abschnitt 8>
```

`ROUNDS.md` waechst nach unten, ein Block pro Runde und Stueck:

```markdown
## Runde <n> — <stueck>
- **Builder**: <was geaendert wurde, ein bis zwei saetze>
- **Binaer**: <kommando> → pass | fail (<kurz>)
- **Critic**: verliert | gewinnt gegen <referenz>
- **Groesste Luecke**: <ein satz — nur EINE, die groesste>
- **Entscheidung**: KEEP | REVERT (<warum>)
```

Der Rundenlog wird **nie** aufgeraeumt oder gekuerzt. Verlorene Runden sind die
wertvollsten Eintraege: sie zeigen, was schon versucht wurde.

---

## 4 — Zerlegung in Stuecke

Ein Stueck ist gut geschnitten, wenn ein Critic es **allein** beurteilen kann,
ohne die anderen Stuecke gesehen zu haben. Faustregel: laesst sich die Frage
"gewinnt das gegen die Referenz?" nur beantworten, indem man auch Stueck B
anschaut, dann sind A und B in Wahrheit ein Stueck.

Zu grob geschnitten: der Critic nennt jede Runde eine andere Luecke, nichts
konvergiert. Zu fein: der Critic bewertet Details, die im Ganzen niemand sieht.

Drei bis sechs Stuecke sind fuer die meisten Aufgaben richtig. Mehr als acht ist
fast immer ein Zeichen, dass das GOAL zu gross ist — dann lieber zwei Loops.

---

## 5 — Builder und Critic

Das ist die Regel, an der alles haengt:

> **Der Critic ist ein eigener Aufruf mit frischem Kontext. Er sieht das
> Artefakt und die Bar — nie die Begruendung des Builders.**

Ein Builder, der seine eigene Arbeit bewertet, findet sie gut. Das ist kein
Charakterfehler des Modells, sondern eine Eigenschaft des geteilten Kontexts:
Wer die Begruendung fuer eine Entscheidung im Kontext hat, sieht das Ergebnis
durch diese Begruendung.

Daraus folgen vier harte Regeln:

1. **Getrennte Aufrufe.** Builder und Critic sind zwei Sub-Agenten, nicht zwei
   Absaetze im selben Prompt.
2. **Der Critic bekommt kein Rationale.** Kein "der Builder hat X gewaehlt, weil
   Y". Nur: das Artefakt, die Bar, die Frage.
3. **Der Critic nennt genau EINE Luecke** — die groesste. Eine Liste mit sieben
   Punkten laesst den Builder sich die einfachste aussuchen und die eigentliche
   Schwaeche ueberleben.
4. **Der Critic schlaegt keine Loesung vor.** Er beschreibt die Luecke. Wie sie
   geschlossen wird, entscheidet der Builder — sonst wird der Critic zum
   zweiten Builder und verliert seine Unabhaengigkeit.

Der Critic darf ausdruecklich hart sein. Ein Critic, der in Runde 1 "gewinnt"
sagt, hat entweder eine zu niedrige Bar bekommen oder seine Aufgabe nicht
verstanden.

---

## 6 — STOP: die drei erlaubten Formen

STOP muss ohne Auslegung entscheidbar sein. Genau drei Formen sind zulaessig,
und ein Loop nennt mindestens die ersten beiden:

**Erfolg** — die Bedingung, unter der der Loop gewonnen hat.
Sie besteht aus einem **binaeren Teil** (ein Kommando, exit 0) und darf einen
**geurteilten Teil** haben (der blinde Critic waehlt den Output). Der geurteilte
Teil zaehlt erst, wenn er sich **zweimal hintereinander** wiederholt — ein
einzelnes Critic-Urteil ist zu verrauscht, um darauf zu stoppen.

**Kein Fortschritt** — die Bedingung, unter der weiterlaufen sinnlos ist.
Zwei Runden ohne KEEP, oder der Critic nennt dreimal dieselbe Luecke, oder
`max_rounds` erreicht. Ohne diese Form laeuft ein Loop, der nicht konvergiert,
bis das Budget alle ist.

**Approval-Gate** — die Bedingung, unter der ein Mensch entscheidet.
Siehe Abschnitt 8.

Verboten als STOP, ohne Ausnahme:

| verboten | warum |
|---|---|
| `wenn es gut ist` | Selbsteinschaetzung des Builders |
| `wenn es professionell wirkt` | nicht messbar, nicht wiederholbar |
| `wenn der Nutzer zufrieden ist` | kein Kriterium, sondern eine Auslieferung |
| `nach 3 Runden` (allein) | Timeout ist eine Notbremse, kein Erfolgskriterium |
| `wenn alle Findings behoben sind` | ohne Liste vorher: unbegrenzt dehnbar |

Ein Loop ohne binaeren Anteil im STOP wird **nicht gestartet**. Gibt es keinen,
ist das eine Erkenntnis: dann fehlt ein Checker, und der ist die eigentliche
Aufgabe.

---

## 7 — Blind A/B

Der Vergleich gegen die Referenz laeuft blind, sonst gewinnt die Referenz aus
Autoritaet statt aus Qualitaet.

1. Referenz und Output werden als **A** und **B** uebergeben, in zufaelliger
   Reihenfolge, ohne Beschriftung.
2. Der Critic bekommt die Bewertungskriterien aus der Bar — nicht "welches ist
   besser", sondern die konkreten Achsen der Bar.
3. Der Critic waehlt und begruendet in zwei bis drei Saetzen.
4. Erst danach wird aufgeloest, welches welches war.

Waehlt der Critic den Output: eine Runde gewonnen. Zweimal hintereinander:
STOP-Erfolg (sofern der binaere Teil gruen ist).

Bei nicht-visuellen Artefakten (Code, Schema, Text) funktioniert derselbe
Ablauf, nur ist die Referenz dann ein Ausschnitt aus dem Bestand statt ein
Screenshot.

Wenn keine Referenz existiert, ist der Loop **rein binaer** — dann entfaellt der
Critic, und der Loop laeuft, bis die Checker gruen sind. Das ist ein
vollstaendig legitimer Loop; er ist nur billiger.

---

## 8 — Approval-Gates und Abbruch

Ein Loop laeuft autonom, aber nicht ueber jede Grenze. Beruehrt eine Runde etwas
aus der `GATES`-Sektion der Spec, haelt der Loop an und fragt. Er entscheidet
das nicht selbst, auch nicht "vorlaeufig".

Was ein Gate ausloest, steht in der Bar — typisch: Governance-Regeln,
Datenschutz, Sicherheit, alles mit Aussenwirkung, alles Irreversible.

Zusaetzlich gilt immer:

- **Der Nutzer kann jederzeit stoppen.** Ein laufender Loop ist kein Vertrag.
- **`max_rounds` ist eine Notbremse, kein Ziel.** Wird sie erreicht, ist das ein
  Ergebnis mit Aussage: der Loop konvergiert nicht. Das wird berichtet, nicht
  durch Hochsetzen der Grenze umgangen.
- **Ein blockierter Loop wird als `blocked` markiert**, mit dem Grund in
  `ROUNDS.md`. Er wird nicht still fallen gelassen.

---

## 9 — Was am Ende berichtet wird

Kein Fliesstext. Genau das:

- Status (`won` | `stopped` | `blocked`) und in welcher Runde
- Was die binaeren Checks am Ende sagen
- Die letzte vom Critic genannte Luecke, auch bei `won` — sie ist der beste
  Hinweis auf die naechste Iteration
- Was verworfen wurde und warum (aus den REVERT-Eintraegen)
- Bei Design-Loops: was gebraucht wurde, aber im Design-System fehlte
