# Bar: icon — CompliHub-Icons

> Zieht `_compass.md`. Compass ist die Autoritaet, diese Datei ergaenzt nur das
> Icon-Spezifische.

Die vollstaendigste Bar in diesem Plugin: Validator **und** Referenz existieren
bereits. Deshalb der richtige Einstieg, wenn ein Gauntlet zum ersten Mal
gefahren wird.

## Preload

- `compass` (Pflicht)
- `svg-icon-builder` (Pflicht) — Haus-Stil, Modi, Kurvenhandwerk
- `.claude/skills/svg-icon-builder/reference/style-spec.md` — jeder Messwert

## Referenz fuer den blinden A/B

`.claude/skills/svg-icon-builder/reference/examples.svg`

Das ist ein echtes Referenz-Sheet im Haus-Stil, kein Fremdprodukt. Der Vergleich
lautet deshalb nicht "welches Icon ist schoener", sondern:

> **A und B liegen nebeneinander. Welches stammt aus demselben Set?**

Verliert der Output, ist die Luecke immer eine der vier Achsen unten.

## Bewertungsachsen des Critics

Genau diese vier, in dieser Reihenfolge. Der Critic nennt die groesste — eine.

1. **Silhouette bei 20 px.** Liest die Masse als klare Form, bevor Detail dazu
   kommt? Ein Icon, das erst bei 48 px funktioniert, ist durchgefallen.
2. **Kurven-Charakter.** Weiche Schultern statt Ecken, `Q`/`C` statt `L…L`,
   organische Klingen ohne gerades Segment. Der haeufigste Verlustgrund ist ein
   Icon, das wie Lucide aussieht: eckig, gleichfoermig, stroke-only.
3. **Massenverteilung im Duotone.** Gold traegt die Masse, Ink sitzt als Detail
   *innerhalb* des optischen Gewichts — nicht lose daneben. Soft-Gold bleibt
   untergeordnet.
4. **Reduktion.** Maximal drei visuelle Elemente. Ein viertes ist fast immer
   eines zu viel.

## CHECK — binaer

```
node .claude/skills/svg-icon-builder/scripts/validate.mjs <datei.svg> [...]
```

Prueft Palette, `stroke-linecap="round"`, `fill="none"` auf gestrichenen Pfaden,
`viewBox` vorhanden, kein `width`/`height` auf dem Root. Exit 0 = gruen.

Zusaetzlich, mit dem Checker aus diesem Plugin:

```
node ${CLAUDE_PLUGIN_ROOT}/checkers/token-drift.mjs --svg <datei.svg>
```

Faengt Farbwerte ab, die zwar syntaktisch gueltig sind, aber weder zur
Icon-Palette noch zu einem Compass-Token gehoeren.

## STOP

```
Erfolg:  validate.mjs exit 0
         UND der blinde Critic waehlt den Output in 2 aufeinanderfolgenden Runden
Kein Fortschritt: 2 Runden ohne KEEP, ODER dieselbe Luecke 3x, ODER max_rounds
```

`max_rounds: 5` ist fuer Icons realistisch. Braucht ein Icon mehr, stimmt meist
die Metapher nicht — das ist ein Konzeptproblem, kein Ausfuehrungsproblem, und
wird berichtet statt weiter iteriert.

## PIECES

Bei einem einzelnen Icon: **keine Zerlegung**, ein Stueck. Der Gauntlet laeuft
dann als schlanke Builder/Critic-Schleife ohne Fan-out.

Bei einem Set: ein Stueck pro Icon, plus ein abschliessendes Stueck
**"Set-Kohaerenz"** — ein Critic sieht alle Icons zusammen und prueft, ob sie als
Familie lesen. Dieses Stueck laeuft zuletzt und hat eine eigene Frage:

> Faellt eines aus der Reihe? Wenn ja, welches und woran?

## GATES

Keine. Icons sind reversibel und beruehren weder Governance noch Daten.
Der Loop laeuft durch.
