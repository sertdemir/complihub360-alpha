# Compass — der Design-System-Anker

**Jede Design-Bar in diesem Plugin zieht diese Datei.** Sie ist das Gegenstueck
zu `_polaris.md` in `cosmo-loops` und hat dieselbe Rolle: sie macht das
Design-System zur Autoritaet, gegen die geurteilt wird — nicht den Geschmack des
Critics.

## Autoritaet

Compass ist die Single Source of Truth fuer jede Farbe, jeden Abstand, jede
Komponente in CompliHub360.

- **Figma**: `a4BeKbsBGoHkcudhKXUJTl` — "C360 - Design System"
- **Code**: `ui/design-system/`, `apps/vs1-demo/ui/`
- **Rohwerte v1**: `GoogleDrive_Docs/Design System-* v1.md`
- **Architektur**: `.claude/skills/compass/references/token-architecture.md`

Compass hat gemischte Reife. Manche Bereiche haben Foundations, andere sind
leer. **Vor jeder Annahme inspizieren** — ein leerer Bereich ist keine Erlaubnis
fuer eine Einzelfalllösung, sondern ein Gap (siehe unten).

## Pflicht-Preload

Der Gauntlet startet **keinen** Design-Loop, bevor der `compass`-Skill geladen
ist. Ohne Design-System-Kontext hat der Critic nichts, wogegen er urteilen kann,
und faellt auf allgemeinen Geschmack zurueck. Das ist genau der Zustand, den
dieses Plugin abschaffen soll.

Bei Loops, die nach Figma schreiben, kommt `figma-use` dazu — ohne Ausnahme,
vor jedem `use_figma`-Aufruf.

## Die Token-Kaskade

```
PRIMITIVE  →  SEMANTIC  →  COMPONENT
```

Was der Critic daran prueft:

- Komponenten konsumieren **semantische** Tokens, nie Primitives direkt.
- Semantische Namen beschreiben die **Rolle**, nicht das Aussehen.
  `color.action.primary.background.hover` ist richtig, `color.darkGreen` ist es nicht.
- Kein `light` / `dark` im Token-Namen — das macht Theming ueber Modes.
- Component-Tokens nur, wenn ein Wert wirklich nirgends sonst gebraucht wird.

Die verbindlichen Ankerwerte (v1):

| Rolle | Token | Wert |
|---|---|---|
| Petrol (Brand, Aktion, Fokus) | `color.petrol.500` | `#097070` |
| Petrol hover / pressed | `.600` / `.700` | `#075C5C` / `#054848` |
| Gold (**nur** Verified-Partner) | `color.gold.500` | `#D3B454` |
| Border default | `color.border.default` | `#E2DADA` |
| Dark-Mode Primary | `color.petrol.dark` | `#3FA3A3` |

**Gold ist reserviert.** Accent-Gold-Tokens liegen unter `color.brand.*`,
niemals unter `color.action.*` oder `color.feedback.*`. Gold als generische
Akzentfarbe ist ein Critic-Finding, kein Geschmacksurteil — das ist Doktrin.

## Zwei Festlegungen aus `CLAUDE.md`, die der Critic kennt

**Der Gradient.** Sagt jemand "Gradient" oder "der Verlauf", ist immer genau
diese Kombination gemeint:

```css
linear-gradient(165deg, #EAF3F1 0%, #DDECE8 55%, #E9E4D3 100%)
```

Sie liegt unter den Showcase-Panels der Homepage und ist der Konsistenzanker
fuer alle getoenten Flaechen. Eine Variante davon ist ein Finding, keine
Interpretation.

**FAQ.** Es gibt genau **eine** FAQ-Komponente auf der Site — die geteilte
`FaqList` aus `components/home/HomeFaq.tsx`. Jede Flaeche, die eine FAQ bekommt,
nutzt sie. Eine Parallel-Implementierung ist ein Finding, unabhaengig davon, wie
gut sie aussieht.

## Bekannte Drift — vor dem ersten Loop lesen

`ui/design-system/tokens.json` ist heute **nicht** deckungsgleich mit der
Compass-Architektur:

| Token in `tokens.json` | Ist | Compass-Anker |
|---|---|---|
| `colors.bg.brand`, `colors.fg.brand` | `#004D40` | Petrol-500 `#097070` |
| `colors.action.primary` | `#D4AF37` | Gold-500 `#D3B454` — und Gold ist gar keine Aktionsfarbe |
| `colors.border.structural` | `#E5E7EB` | `#E2DADA` |

Der `token-drift`-Checker meldet das. Das ist korrekt und kein Fehlalarm: die
Code-Tokens sind aelter als die Compass-Spezifikation. Solange die Drift besteht,
**gilt Compass** — `tokens.json` wird nachgezogen, nicht umgekehrt.

Ein Loop, der auf diese Drift stoesst, schliesst sie nicht nebenbei. Er meldet
sie und macht weiter mit dem, was er sollte. Token-Angleichung ist ein eigener
Loop mit eigenem Ticket.

## Gap-Log — was Compass groesser macht

Was eine Runde braucht und Compass nicht hergibt, wird protokolliert statt
umgangen. Am Ende jedes Design-Loops in `ROUNDS.md`:

```markdown
## Compass-Gaps
- <was gebraucht wurde>: <warum Compass es nicht hergab> → <Vorschlag: Token | Komponente | Variante>
```

Das ist das Gegenstueck zum DS-Gap-Log, das `cc-uxe` fuer Polaris schon fuehrt.
Ohne diesen Schritt umgeht jeder Loop das Design-System still und macht es mit
der Zeit irrelevant.

Ein Gap ist **kein** Freibrief, den Wert hart zu setzen. Der Loop nimmt den
naechstliegenden vorhandenen Token, protokolliert den Gap und laeuft weiter.
