# Bar: screen — CompliHub360-Screens

> Zieht `_compass.md`. Ohne geladenen `compass`-Skill startet dieser Loop nicht.

Die subjektivste Bar — und deshalb die, bei der der getrennte Critic am meisten
bringt. Heute bewertet die Instanz, die den Screen gebaut hat, ihn auch. Genau
das hoert hier auf.

## Preload

- `compass` (Pflicht) — Design-System-Autoritaet
- `360-design` (Pflicht) — Persona, Produktkontext, IA-Konventionen
- `GoogleDrive_Docs/` — Produkt- und Nutzeranforderungen.
  **Domaeneninhalte werden von dort gelesen, nie erfunden.** Ein Screen mit
  ausgedachten Compliance-Inhalten ist durchgefallen, egal wie gut er aussieht.

## Referenz fuer den blinden A/B

In dieser Reihenfolge, die erste verfuegbare gewinnt:

1. **Ein bestehender C360-Screen**, der als gelungen gilt (Homepage-Showcase,
   EntryDoorDemo, RiskMapShowcase). Interner Vergleich ist der ehrlichste:
   er misst Konsistenz, nicht fremde Aesthetik.
2. **Ein benanntes Fremdprodukt** — Linear, Atlassian, Carbon. Nur wenn es
   intern nichts Vergleichbares gibt, und der Name gehoert dann in `LOOP.md`.
   "Enterprise-grade" ist keine Referenz.

## Bewertungsachsen des Critics

Vier Achsen, der Critic nennt die groesste Luecke — eine.

1. **Informationshierarchie.** Was der Nutzer zuerst sehen muss, sieht er zuerst.
   Der haeufigste Verlustgrund: alles gleich gewichtet, nichts fuehrt.
2. **Token-Disziplin.** Jeder Wert kommt aus Compass. Ein Einzelfallwert ist
   auch dann ein Finding, wenn er besser aussieht als der Token.
3. **Zustaende.** Leer, ladend, Fehler, zu-viel-Inhalt. Ein Screen, der nur den
   Idealfall zeigt, ist ein Bild, kein Screen.
4. **Rhythmus.** Abstaende aus der Spacing-Skala, konsistente optische Dichte
   ueber die Sektionen.

## CHECK — binaer

```
node ${CLAUDE_PLUGIN_ROOT}/checkers/token-drift.mjs <pfade...>
node ${CLAUDE_PLUGIN_ROOT}/checkers/contrast.mjs
npm run typecheck
```

Bei implementierten Screens zusaetzlich `npm run build`. Bei reinen
Figma-Screens entfaellt `typecheck`; dann traegt `token-drift` den binaeren Teil
allein, gemessen an den verwendeten Variablen statt am Code.

## STOP

```
Erfolg:  token-drift exit 0 UND contrast exit 0 UND typecheck exit 0
         UND der blinde Critic waehlt den Output in 2 aufeinanderfolgenden Runden
Kein Fortschritt: 2 Runden ohne KEEP, ODER dieselbe Luecke 3x, ODER max_rounds
```

`max_rounds: 6`.

## PIECES

Nach **Sektion**, nicht nach Komponente. Eine Sektion ist unabhaengig bewertbar,
eine einzelne Card ist es nicht.

Typisch: Header/Hero · Hauptinhalt · Seitenleiste/Filter · Footer/CTA · und ein
abschliessendes Stueck **"Ganzer Screen"**, das zuletzt laeuft und nur eine Frage
stellt:

> Liest der Screen als **ein** Entwurf, oder als vier gute Sektionen
> nebeneinander?

## GATES

- **Neuer Token oder neue Komponente noetig** → nicht selbst anlegen. Gap
  protokollieren (siehe `_compass.md`), naechstliegenden vorhandenen Token
  nehmen, weiterlaufen.
- **Ticket-Gate.** Beruehrt der Loop Code, gilt die Ticket-Pflicht aus
  `.agents/rules/agent-governance.md` unveraendert. Der Loop ersetzt sie nicht.
- **Personenbezogene Beispieldaten** → anhalten. Keine echten oder
  echt-aussehenden Compliance-Daten in Screens.
