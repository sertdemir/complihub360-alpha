# Bar: engine — Compliance-Engine

> Zieht `_compass.md` **nicht**. Die Engine ist Backend- und Domaenenlogik; ein
> Design-System hat hier nichts zu suchen.

Der rein binaere Loop. Kein Critic, keine Referenz, kein blinder Vergleich —
die Checks entscheiden allein. Das ist die billigste und sicherste Loop-Form,
und sie war in `.agents/workflows/fix-loop.md` schon halb angelegt.

## Preload

- `.agents/rules/engine-safety.md` (Pflicht)
- `.agents/rules/privacy-no-raw-to-ai.md`
- `.agents/rules/privacy-redaction-deterministic.md`
- `.agents/rules/privacy-audit-required.md`

## CHECK — binaer, das ist die ganze Bar

```
npm run typecheck
npm run build
npm run test
cd services/redaction && npm run test
```

Entspricht `.agents/workflows/verify-ci.md` plus `verify-privacy.md`. Alle vier
exit 0 = gruen. Kein Teilerfolg, keine Auslegung.

## STOP

```
Erfolg:  alle vier Kommandos exit 0
Kein Fortschritt: 2 Runden ohne KEEP, ODER dieselbe Fehlermeldung 3x, ODER max_rounds
```

`max_rounds: 4`. Danach ist die Diagnose falsch, nicht die Ausfuehrung — dann
wird der Root Cause berichtet statt eine fuenfte Runde gefahren.

Kein geurteilter STOP-Teil. Es gibt bei der Engine nichts zu vergleichen; ein
Test ist gruen oder nicht.

## KEEP

Eine Aenderung bleibt nur, wenn sie **mindestens einen** vorher roten Check gruen
macht und **keinen** vorher gruenen rot. Alles andere wird zurueckgerollt, auch
wenn es "eigentlich richtig" ist. Aufraeumen gehoert in ein eigenes Ticket.

## GATES — nicht verhandelbar

Der Loop **haelt an und fragt**, sobald eine Runde eines davon beruehrt:

| Gate | Regel |
|---|---|
| `apps/vs1-demo` angefasst | VS1 ist unantastbare Baseline (`engine-safety.md` §1) |
| React/Styles/UI-Datei im Diff | Engine-Workflows fassen keine UI an (§2) |
| neues npm-Paket | Engine bleibt pures TypeScript (§3) |
| Redaction-Pfad beruehrt | deterministisch, kein LLM, kein probabilistisches Modell |
| `raw://` naeher an einen AI-Aufruf | harte Datenschutzgrenze |
| Audit-Event entfaellt oder aendert sich | jede Grenzueberschreitung braucht ihren Audit-Eintrag |

Diese Gates sind **kein** Critic-Urteil und keine Abwaegung. Sie halten den Loop
an, Punkt. Der Nutzer entscheidet, nicht der Loop — auch nicht "vorlaeufig, um
weiterzukommen".

## Verhaeltnis zu `.agents/workflows/fix-loop.md`

`fix-loop.md` bleibt, wie es ist, und beschreibt weiterhin die
Agenten-Choreographie (Task-Master → Repo-Master → QA-Master). Diese Bar
ersetzt nur dessen Abbruchlogik: statt "bis zu 2 Retries" gilt das STOP oben.
Ein Timeout ist eine Notbremse, kein Erfolgskriterium.

## PIECES

Ein Stueck pro rotem Check, nicht pro Datei. Fuenf Testfehler aus einer Ursache
sind ein Stueck; zwei Fehler aus zwei Ursachen sind zwei Stuecke, auch wenn sie
in derselben Datei liegen.
