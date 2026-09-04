---
name: complihub-gauntlet
description: Faehrt einen Gauntlet-Loop fuer CompliHub360 — Fan-out in Builder pro Stueck, je ein getrennter Critic mit frischem Kontext, blinder A/B-Vergleich gegen eine vorab gesetzte Latte, Runden bis die Stop-Bedingung greift. Aktiviere, wenn der Nutzer einen Loop starten, fortsetzen oder eine Runde fahren will — "fahr den Loop", "starte den Gauntlet", "noch eine Runde", "lass das gegen Compass pruefen", "kritisiere das hart" — oder wenn eine Loop-Spec unter .loops/ existiert und abgearbeitet werden soll. Verankert Compass als Design-System-Autoritaet und laedt den compass-Skill vor jedem Design-Loop. NUR fuer CompliHub360 — fuer Cosmo Consult gilt cosmo-gauntlet.
---

# CompliHub Gauntlet

Faehrt den Loop. Die Spec kommt von `complihub-loop-architect`.

Lies zuerst `${CLAUDE_PLUGIN_ROOT}/references/loop-protocol.md`. Der Mechanismus
steht dort. Diese Datei sagt nur, wie er in CompliHub360 ausgefuehrt wird.

## Vor dem Start

**1 — Spec laden.** `.loops/<slug>/LOOP.md`. Fehlt sie, erst
`complihub-loop-architect` laufen lassen. Ohne Spec kein Loop — improvisierte
Loops sind der Zustand, den dieses Plugin ersetzt.

**2 — Bar laden.** `${CLAUDE_PLUGIN_ROOT}/bars/<bar>.md`, und wenn die Bar
`_compass.md` zieht, diese auch.

**3 — Preload ausfuehren.** Was die Bar unter *Preload* nennt, wird geladen,
bevor die erste Runde laeuft. Bei allen Bars ausser `engine` heisst das:
**der `compass`-Skill ist Pflicht.** Ohne ihn hat der Critic keine Autoritaet,
gegen die er urteilt, und faellt auf allgemeinen Geschmack zurueck.

Schreibt der Loop nach Figma, kommt `figma-use` dazu — vor jedem `use_figma`,
ohne Ausnahme.

**4 — Binaere Checks einmal trocken laufen lassen.** Wenn sie schon vor Runde 1
rot sind, ist das der Ausgangszustand, nicht dein Fehler — das gehoert als
Runde 0 in `ROUNDS.md`. Laufen sie gar nicht (fehlendes Skript, Tippfehler im
Pfad), ist der Loop **blocked**, nicht "wir machen erstmal ohne".

## Die Runde

Pro Stueck, Stuecke parallel:

**Builder.** Bekommt: GOAL, sein Stueck, die Bar, den bisherigen `ROUNDS.md`.
Fuehrt ACT aus — **einen** Schritt, nicht drei. Bei Runde ≥2 zusaetzlich die
letzte vom Critic genannte Luecke, und nur die.

**Binaerer Check.** Kommandos aus der Bar. Rot? Der Builder fixt, bevor der
Critic ueberhaupt gerufen wird — einen Critic auf ein Artefakt zu werfen, das
den Typecheck bricht, verbrennt eine Runde.

**Critic.** Eigener Sub-Agent, frischer Kontext. Bekommt: das Artefakt, die Bar,
die Bewertungsachsen. Bekommt **nicht**: die Begruendung des Builders, den
bisherigen Log, das Wissen, welche Seite die Referenz ist.

Der blinde A/B laeuft nach `loop-protocol.md` Abschnitt 7. Der Critic nennt
**eine** Luecke — die groesste — und schlaegt keine Loesung vor.

**KEEP oder REVERT.** Nach der Regel in der Spec. Eintrag in `ROUNDS.md`,
sofort, nicht am Ende gesammelt. Ein Loop, dessen Log erst am Schluss
geschrieben wird, verliert alles bei Kontext-Kompaktierung.

**STOP pruefen.** Alle drei Formen, in dieser Reihenfolge: Gate → Erfolg →
Kein-Fortschritt.

## Fan-out

Ab drei Stuecken laufen Builder parallel als Sub-Agenten. Darunter lohnt der
Overhead nicht.

Der Critic ist **immer** ein eigener Aufruf, auch bei einem einzigen Stueck.
Das ist der Kern der Methode und die einzige Regel, die nie aus
Effizienzgruenden faellt.

## CompliHub-spezifische Pflichten

**Ticket-Gate.** Beruehrt der Loop Code, gilt `.agents/rules/agent-governance.md`
unveraendert: Ticket in `.tickets/doing/` bevor implementiert wird, Statuspflege,
Audit-Log-Eintrag, Verschieben nach `.tickets/done/`. Der Loop ersetzt das nicht
— er laeuft darin.

**Gates halten an.** Was in der Bar unter GATES steht, stoppt den Loop und legt
die Entscheidung beim Nutzer. Nicht "vorlaeufig weiterlaufen und spaeter fragen".
Bei `engine` sind das Datenschutz- und Engine-Safety-Grenzen — die sind nicht
verhandelbar und werden auch dann nicht ueberschritten, wenn der Loop dadurch
stehen bleibt.

**Compass-Gaps protokollieren.** Was gebraucht wurde und Compass nicht hergab,
kommt ans Ende von `ROUNDS.md` (Format in `_compass.md`). Ohne diesen Schritt
umgeht jeder Loop das Design-System still.

**Bekannte Drift nicht nebenbei aufraeumen.** Stoesst der Loop auf die
Token-Drift in `ui/design-system/tokens.json` oder auf die Baseline-Findings in
`checkers/contrast-baseline.json`: melden, weiterlaufen. Das sind eigene Loops
mit eigenen Tickets.

## Abschluss

Bericht nach `loop-protocol.md` Abschnitt 9. Status in `LOOP.md` setzen
(`won` | `stopped` | `blocked`).

Bei `stopped` wegen `max_rounds`: **nicht** die Grenze hochsetzen und
weiterfahren. Ein Loop, der nicht konvergiert, hat etwas gezeigt — meist ist das
GOAL zu gross oder die Stuecke sind falsch geschnitten. Das ist das Ergebnis,
und es wird so berichtet.
