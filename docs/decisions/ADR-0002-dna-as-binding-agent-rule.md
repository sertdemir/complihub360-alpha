# ADR-0002: CompliHub360 DNA als bindende Agent-Rule

**Status:** ACCEPTED
**Date:** 2026-08-20
**Bezug:** [`KN-BRAND-001`](../../.knowledge/memory/nodes/KN-BRAND-001-complihub360-dna.md) · [`.agents/rules/dna-decision-filter.md`](../../.agents/rules/dna-decision-filter.md) · ADR-0001

## Context

Mit der Ablage der CompliHub360 DNA V1 als Wissensknoten (`KN-BRAND-001`) existiert erstmals eine repo-seitige, agentenlesbare Fassung der Brand-, Experience- und Voice-Prinzipien. Der Knoten trägt `authority: source-of-truth`, aber **kein Agent war verpflichtet, ihn zu lesen.** Damit galten die Prinzipien faktisch nur, wenn jemand sie zufällig mitbrachte.

Das ist genau die Lücke, die die DNA selbst adressiert: Ein Ranking-Modell, eine Wizard-Frage, ein Upsell-Hinweis oder eine AI-Antwort kann technisch einwandfrei, getestet und CI-grün sein — und trotzdem gegen „Always on your side" verstoßen. Die bestehenden Gates fangen das nicht ab: `qa-master` prüft Typecheck, Build und Tests; `policy-master` prüft Governance, Security und Dependencies; die `privacy-*`-Rules prüfen Datenflüsse. Keines davon prüft, ob eine Änderung den User instrumentalisiert.

Die zu entscheidende Frage war nicht *ob* die DNA bindend wird, sondern **in welcher Form** — denn sie unterscheidet sich strukturell von jeder bestehenden Rule.

### Warum die DNA nicht wie eine Privacy-Rule funktioniert

| | `privacy-no-raw-to-ai` | DNA / Decision Filter |
|---|---|---|
| Prüfbarkeit | binär, maschinell (`raw://` ja/nein) | wertend, nur im Urteil |
| Verletzung erkennbar | im Diff | erst im Zusammenspiel mit Kontext und Wirkung |
| Fehlerrichtung | Datenleck | Vertrauensverlust, oft erst später sichtbar |
| Automatisierbar | ja, CI-Gate | nein |

Eine Rule, die Urteilsfragen als Checkliste behandelt, erzeugt **Alarm-Müdigkeit**: Wenn jeder Refactor neun Filterfragen abhaken muss, wird der Block mechanisch mit „ja" gefüllt und verliert seine Bedeutung genau dort, wo er zählen würde. Das wäre schlechter als keine Rule, weil es Prüfung *vortäuscht*.

## Decision

1. **Die DNA wird bindend, aber konditional.** Neue Rule [`.agents/rules/dna-decision-filter.md`](../../.agents/rules/dna-decision-filter.md) — bewusst **nicht** `trigger: always_on`, sondern gebunden an einen definierten Auslöserkatalog (nutzererlebende Änderungen: Copy, Wizard, Risk Map, Ranking und Matching, AI-Prompts und -Antworten, Monetarisierung, Provider-Policies, Registrierungs- und Gating-Logik).

2. **Der Nachweis ist eine Begründung, keine Checkliste.** Betroffene Tickets tragen einen Abschnitt `## DNA-Check` mit den **zutreffenden** Filterpunkten und je einem Satz Begründung. Alle neun Punkte abhaken gilt ausdrücklich als nicht erbracht.

3. **Kein Agent darf einen DNA-Konflikt selbst auflösen.** Erkennt ein Agent einen Widerspruch zur DNA, wird die Arbeit gestoppt und an den Menschen eskaliert. Ein Agent darf nicht befinden, ein Verstoß sei „vertretbar", „temporär" oder „durch Geschäftsinteresse gedeckt" — das ist die eine Entscheidung, die außerhalb der Agenten-Autonomie liegt.

4. **`design-policy-master` ist federführend, `policy-master` bleibt Blocker.** Ersterer prüft Voice, Experience und Darstellung (§3–§4 des Knotens); Letzterer prüft Monetarisierung, Ranking-Fairness und AI-Verhalten (§5–§6) und darf blockieren.

5. **Bei Widerspruch gewinnt die DNA.** Widerspricht ein Spec, ein Ticket oder eine bestehende Implementierung, wird der Widerspruch benannt und die andere Stelle korrigiert — nicht die DNA umgangen.

6. **Kein CI-Gate.** Es wird bewusst keine automatisierte Prüfung gebaut. Ein Linter auf Marketing-Superlative oder ähnliche Heuristiken würde Scheinsicherheit erzeugen und die eigentliche Frage — dient das dem User? — nicht berühren.

## Consequences

**Positiv**
- Die DNA wirkt dort, wo sie zählt, ohne Routinearbeit zu belasten. Ein Refactor an der Redaction-Pipeline löst keinen DNA-Check aus, eine neue Upsell-Kachel schon.
- Der Begründungszwang macht Konflikte sichtbar, statt sie in einem Haken verschwinden zu lassen. Tickets werden zum Nachweis, welche Abwägung getroffen wurde.
- Die Eskalationspflicht schützt vor dem realistischsten Fehlermodus: ein Agent, der eine Conversion-Optimierung plausibel begründet und dabei die Vertrauensfrage wegargumentiert.

**Negativ**
- **Nicht erzwingbar.** Die Wirkung hängt an der Disziplin der Agenten und der Reviewer. Ein Agent, der den Auslöserkatalog ignoriert, wird von keinem Gate gestoppt. Das ist der bewusst akzeptierte Preis dafür, kein Scheingate zu bauen.
- **Auslegungsspielraum beim Auslöserkatalog.** „Berührt das Nutzererleben" ist selbst eine Urteilsfrage. Die Rule löst das über eine Zweifelsregel (im Zweifel prüfen), was tendenziell zu mehr Prüfungen führt als nötig.
- Zusätzlicher Aufwand pro betroffenem Ticket, bei ehrlicher Ausführung schätzungsweise wenige Minuten.

**Neutral**
- ADR-0001 bleibt unberührt; die Rollenverteilung wird um eine Zuständigkeit ergänzt, nicht verändert.

## Alternatives Considered

**A — `trigger: always_on` wie `agent-governance`.**
Verworfen. Erzeugt Alarm-Müdigkeit (siehe Context) und entwertet den Filter genau bei den Änderungen, bei denen er greifen müsste.

**B — CI-Gate mit heuristischem Linter** (verbotene Superlative aus §4.7, Angst-Vokabular in Risk-Map-Strings).
Verworfen als *primäres* Instrument: prüft Wortwahl, nicht Absicht. Ein manipulatives Feature besteht den Linter mühelos, eine harmlose Formulierung fällt womöglich durch. Als späterer additiver Hinweis denkbar, nie als Ersatz für das Urteil.

**C — DNA nur als Referenz ohne Rule** (Status quo vor diesem ADR).
Verworfen. Ein `source-of-truth`-Knoten, den niemand lesen muss, ist Dekoration. Genau dieser Zustand hat die DNA bisher wirkungslos gemacht.

**D — Menschliche Freigabe für jede nutzererlebende Änderung.**
Verworfen als zu grob. Macht Agenten-Autonomie für den größten Teil der Produktarbeit zunichte, obwohl die meisten Änderungen unstrittig sind. Die Eskalation greift gezielt im Konfliktfall (Decision 3).

## Offen

- Nach etwa zwanzig Tickets mit `## DNA-Check` prüfen, ob die Begründungen substanziell sind oder zu Floskeln erodieren. Erodieren sie, ist der Mechanismus gescheitert und muss ersetzt werden, nicht verschärft.
- Der Auslöserkatalog ist eine erste Fassung und wird anhand der Fälle nachgeschärft, die er fälschlich ein- oder ausschließt.
