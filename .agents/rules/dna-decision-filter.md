# Rule: DNA Decision Filter

**Activation Context:** Conditional — siehe Auslöser. Bewusst **nicht** Always On (Begründung: [ADR-0002](../../docs/decisions/ADR-0002-dna-as-binding-agent-rule.md)).

**Quelle:** [`KN-BRAND-001`](../../.knowledge/memory/nodes/KN-BRAND-001-complihub360-dna.md) — CompliHub360 DNA V1, `authority: source-of-truth`.

## Constraint

Änderungen, die das Nutzererleben berühren, MÜSSEN vor der Umsetzung gegen den Decision Filter der CompliHub360 DNA geprüft werden. Maßgeblich ist die Governing Question:

> **Does this decision make the user feel that CompliHub360 is still always on their side?**

## Auslöser — wann diese Rule greift

Die Prüfung ist verpflichtend, sobald eine Änderung eines der folgenden Dinge betrifft:

- **Copy und Microcopy** in Produkt, Website oder E-Mails — jeder Text, den ein User liest
- **Wizard**: Fragen, Reihenfolge, Pflichtfelder, Abbruchpunkte
- **Risk Map**: Darstellung, Priorisierung, Dringlichkeitssprache, Farb- und Badge-Semantik
- **Ranking und Matching**: Gewichtung, Match-Prozente, Fit-Indikatoren, Sichtbarkeit der Provider-Identität
- **AI-Verhalten**: System-Prompts, Antwortvorlagen, Eskalations- und Handoff-Logik
- **Monetarisierung**: Paywalls, Tiers, Upsells, CTA-Platzierung, Gating
- **Registrierung und Gating**: was hinter Anmeldung liegt und wie danach gefragt wird
- **Provider-Policies**: SLA-Folgen, Downgrades, Partner-Privilegien

Nicht ausgelöst durch: Refactorings ohne Verhaltensänderung, Build- und CI-Konfiguration, Tests, Dependency-Updates, reine Typ- oder Lint-Korrekturen.

> **Zweifelsregel:** Unklar, ob eine Änderung das Nutzererleben berührt → **prüfen.** Eine überflüssige Prüfung kostet Minuten, eine ausgelassene kostet Vertrauen.

## Enforcement

1. **Knoten lesen.** Vor der Umsetzung [`KN-BRAND-001`](../../.knowledge/memory/nodes/KN-BRAND-001-complihub360-dna.md) laden. Einstieg über [`.knowledge/memory/INDEX.md`](../../.knowledge/memory/INDEX.md).

2. **Nachweis im Ticket.** Betroffene Tickets tragen einen Abschnitt `## DNA-Check` mit den **zutreffenden** Filterpunkten und je einem Satz Begründung:

   ```markdown
   ## DNA-Check

   Betroffen: Monetarisierung (neue Upsell-Kachel auf der Results-Seite)

   - Würden wir das auch ohne Transaktion empfehlen? Ja — die Kachel erscheint nur,
     wenn die Risk Map den Bedarf unabhängig als "required" ausweist, nicht bei "optional".
   - Risiko ehrlich, ohne Angst? Text nennt die Frist sachlich, ohne Countdown und
     ohne Strafandrohung.
   - Fair zwischen Providern? Kachel verlinkt in die gefilterte Ergebnisliste,
     nicht auf einen einzelnen Partner.
   ```

   > **Alle neun Filterpunkte abzuhaken gilt als nicht erbracht.** Der Nachweis ist eine Begründung, keine Checkliste. Genannt wird, was tatsächlich zutrifft.

3. **Zuständigkeit.**
   - `design-policy-master` prüft Voice, Experience und Darstellung (§3–§4 des Knotens).
   - `policy-master` prüft Monetarisierung, Ranking-Fairness und AI-Verhalten (§5–§6) und **darf blockieren**.

4. **Konflikt eskaliert — immer.** Erkennt ein Agent einen Widerspruch zur DNA:
   - Arbeit stoppen,
   - den Widerspruch benennen (welcher Filterpunkt, welche Stelle),
   - an den Menschen eskalieren.

   > Ein Agent darf **nicht** selbst befinden, ein Verstoß sei „vertretbar", „temporär" oder „durch Geschäftsinteresse gedeckt". Diese Entscheidung liegt außerhalb der Agenten-Autonomie.

5. **Bei Widerspruch gewinnt die DNA.** Widerspricht ein Spec, ein Ticket oder eine bestehende Implementierung, wird der Widerspruch benannt und die andere Stelle korrigiert — nicht die DNA umgangen.

## Die harten Grenzen aus dem AI Voice & Behavior Standard

Diese sind **nicht** abwägbar. Ein Verstoß ist ein Blocker, keine Filterfrage:

- AI gibt sich nie als Anwältin, Steuerberaterin, Zollspezialistin oder andere menschliche Fachperson aus.
- **Angst wird nie zur Conversion eingesetzt.** Dringlichkeit ist keine Verkaufstaktik.
- Unsicherheit wird nie hinter selbstsicherer Sprache versteckt.
- Respekt und Tonalität variieren nie nach Unternehmensgröße oder kommerziellem Wert.
- Es wird nie Reibung erzeugt, um den Zugang zu einem Menschen zu verhindern.
- Es wird nie ein Service-Bedarf konstruiert: **We do not create needs. We identify them.**

## Der Decision Filter

- [ ] Stellt es die echten Bedürfnisse des Users an erste Stelle?
- [ ] Hilft es dem User zu **verstehen** — statt nur zu konvertieren?
- [ ] Wahrt es die Fairness zwischen Providern?
- [ ] Würden wir diese Empfehlung auch geben, wenn **keine Transaktion** stattfände?
- [ ] Kommunizieren wir Risiko ehrlich, **ohne unnötige Angst** zu erzeugen?
- [ ] Macht Technologie den Weg leichter und erhält den Zugang zum Menschen, wo er zählt?
- [ ] Bekäme ein kleines Unternehmen denselben Respekt wie ein Enterprise?
- [ ] Sind wir bereit, Verantwortung zu übernehmen und dranzubleiben, wenn etwas schiefgeht?
- [ ] **Stärkt es das Vertrauen der User — statt es auszugeben?**

## Keine Automatisierung

Diese Rule hat bewusst **kein CI-Gate**. Der Filter prüft Absicht und Wirkung, nicht Wortwahl — ein heuristischer Linter würde Scheinsicherheit erzeugen und die eigentliche Frage nicht berühren. Siehe [ADR-0002](../../docs/decisions/ADR-0002-dna-as-binding-agent-rule.md), Alternative B.
