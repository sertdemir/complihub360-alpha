# Bar: landing — Oeffentliche Seiten

> Zieht `_compass.md`. Ergaenzt `screen.md` um alles, was daran haengt, dass
> Fremde die Seite sehen.

Diese Bar hat die hoechste Eintrittsschwelle-Berechtigung im Plugin: das
Ergebnis ist oeffentlich, und ein Fehler ist teuer zu korrigieren, nachdem er
ausgeliefert ist.

## Preload

Wie `screen.md`, plus:

- `PLAN-landingpage.md` — Stand und Absicht der Landingpage
- `.claude/skills/compass/references/accessibility.md`

## Zusaetzliche Achsen, ueber `screen.md` hinaus

1. **Aussage vor Aesthetik.** Versteht ein Fremder in fuenf Sekunden, was
   CompliHub360 tut? Der haeufigste Verlustgrund auf Landingpages ist eine
   schoene Seite, die nichts behauptet.
2. **Gradient-Treue.** Der Verlauf ist exakt der aus `_compass.md`. Eine
   Variante ist ein Finding, keine Interpretation.
3. **FAQ-Disziplin.** Genau eine FAQ-Komponente auf der Site — die geteilte
   `FaqList`. Thematische Tabs sind Sache des Aufrufers, nicht der Liste.
   Eine zweite FAQ-Implementierung ist ein Finding.
4. **Responsives Verhalten.** Nicht "sieht auf Mobil auch ok aus", sondern:
   die Hierarchie aus Achse 1 haelt bei 375 px.

## CHECK — binaer

```
node ${CLAUDE_PLUGIN_ROOT}/checkers/token-drift.mjs <pfade...>
node ${CLAUDE_PLUGIN_ROOT}/checkers/contrast.mjs
npm run typecheck
npm run build
npm run i18n:check
```

`i18n:check` ist hier nicht optional: eine oeffentliche Seite mit fehlenden
Uebersetzungen ist unfertig, unabhaengig davon, wie sie aussieht.

## STOP

```
Erfolg:  alle fuenf Kommandos exit 0
         UND der blinde Critic waehlt den Output in 2 aufeinanderfolgenden Runden
Kein Fortschritt: 2 Runden ohne KEEP, ODER dieselbe Luecke 3x, ODER max_rounds
```

`max_rounds: 6`.

## GATES

- **Aussagen ueber Zertifizierungen, Rechtsstand oder Compliance-Wirkung** →
  anhalten. Marketing-Text, der etwas Regulatorisches behauptet, wird von einem
  Menschen freigegeben. Ein Loop formuliert so etwas nicht selbstaendig aus.
- **Preise, Rechtstexte, Impressum** → anhalten.
- **Alles aus `screen.md`** gilt zusaetzlich.
