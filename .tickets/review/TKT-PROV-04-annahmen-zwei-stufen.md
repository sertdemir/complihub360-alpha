---
title: "Annahmen in zwei Stufen — Abrechnungsermächtigung raus aus dem Einreich-Gate"
assignee: "Claude"
status: "review"
---

# Annahmen in zwei Stufen (Canvas 4C)

> Hiess bis zum Merge von #219 TKT-PROV-03. Die Nummer ging an das
> anonyme Matching, das sie zuerst auf `main` hatte; dieses Ticket ist
> nachgerueckt.

Nachtrag zu Phase 2 (#207). Die Bewerbungsstrecke verlangte drei Annahmen,
bevor ein Antrag überhaupt eingereicht werden konnte — darunter die
**Abrechnungsermächtigung**. Ein Anbieter musste also ein Zahlungsmandat
erteilen, bevor er wusste, ob er angenommen wird.

Der Nutzer hat am 2026-09-27 Canvas-Variante **4C** gewählt: Pflicht und
Späteres getrennt. #207 war mit 4A gebaut („Annahme je Dokument mit
Version") — die Versionierung bleibt, die Bündelung fällt.

## Was sich ändert

| | vorher | jetzt |
|---|---|---|
| Einreichen | `provider_agreement`, `privacy_notice`, `billing_authorization` | `provider_agreement`, `privacy_notice` |
| Aktivieren | dieselben drei | dieselben drei — unverändert |

Das Aktivierungs-Gate ist bewusst **nicht** angefasst: ab der Aktivierung
fließt Geld, und das bestehende Gate verlangt `billing_ready` auch für `limited`
(siehe die Korrektur unten: das ist eine Auslegung des Phase-2-Codes, nicht der
Wortlaut von §21.1).
Die Ermächtigung wird also nicht abgeschafft, sondern an die Stelle
verschoben, an der sie gebraucht wird.

`commercial_terms` steht in keiner der beiden Listen, obwohl die Canvas-Skizze
vier Dokumente zeigte. Grund: die kommerziellen Bedingungen hängen am Tarif.
Wer sie in der Bewerbung abzeichnen lässt, lässt Bedingungen annehmen, die
noch nicht feststehen — das wäre schlechter als die Bündelung, die wir gerade
auflösen. Die Oberfläche sagt stattdessen, wo sie kommen.

## Acceptance Criteria

- [x] `verificationRules.ts`: `REQUIRED_AGREEMENTS` ersetzt durch
  `SUBMIT_AGREEMENTS` (zwei) und `ACTIVATION_AGREEMENTS` (drei);
  `submitValidation` prüft die erste, `activationGate` die zweite Liste.
- [x] `providerReview.ts`: `required_agreements` im Dossier ist die
  Aktivierungs-Liste — der Reviewer entscheidet über die Aktivierung.
- [x] `ApplicationPage.tsx`: Kapitel 5 zeigt zwei Gruppen mit eigener
  Überschrift, Marke („Erforderlich" / „Später möglich") und Hinweis. Die
  Zeilen der zweiten Stufe bekommen **keinen Warnrahmen** — eine fehlende
  Annahme, die nicht fehlen muss, ist kein Mangel. Zähler und
  Einreich-Zusammenfassung zählen nur die erste Stufe.
- [x] Sieben neue Copy-Schlüssel in en/de/es/tr, `i18n:check` grün.
- [x] `docs/api/openapi.yaml`: `/submit` beschreibt zwei Annahmen und sagt,
  warum die dritte nicht dazugehört; `/agreements` auf 4C umgestellt.
- [x] Tests: 5 neue (2 Regel-Gegenproben Einreichen, 1 Gate, 2 an der echten
  Strecke inkl. Kapitelstatus), 4 bestehende angepasst. Gegenprobe gefahren:
  Defekt zurückgesetzt → 7 Tests fallen; Gate-Stufe reduziert → 2 fallen.
- [x] `npm run build`, `typecheck`, `npx tsc --noEmit` (UI), `i18n:check`,
  `terminology:check` grün. 223 API-Tests, 237 UI-Unit-Tests.

Keine Migration: `provider_agreement_acceptance` trägt alle vier Typen seit
`20260920000000_provider_data_model.sql`, und append-only bleibt append-only.

## DNA-Check

Betroffen: Registrierung/Gating (Einreichen), Copy und Microcopy (Kapitel 5),
Monetarisierung (das Zahlungsmandat als Zugangsbedingung).

- **Optionale kommerzielle Chancen werden nie als Pflicht dargestellt:** Das
  ist der eigentliche Befund. Die Abrechnungsermächtigung stand mit
  Warnrahmen zwischen Partnervereinbarung und Datenschutzhinweis — dieselbe
  Darstellung, dasselbe Gewicht. Eine kommerzielle Bedingung sah damit aus
  wie eine rechtliche Voraussetzung. Jetzt steht sie sichtbar in einer
  anderen Stufe, mit einem Satz, der sagt, wofür sie gebraucht wird.
- **Echte Bedürfnisse des Users zuerst:** Das Bedürfnis beim Einreichen ist,
  geprüft zu werden. Das Bedürfnis der Plattform beim Aktivieren ist,
  abrechnen zu können. Die Reihenfolge folgt jetzt dem ersten, nicht dem
  zweiten.
- **Verstehen statt konvertieren:** Die zweite Stufe erklärt in einem Satz,
  wann die Ermächtigung greift („nötig, bevor Ihr Konto aktiviert wird —
  nicht, um einzureichen"). Der Anbieter kann sie trotzdem sofort erteilen;
  wir nehmen ihm die Wahl nicht ab, wir geben sie ihm zurück.
- **Würden wir es auch ohne Transaktion so bauen:** Ja — und genau das ist
  der Test, den die alte Reihenfolge nicht bestand. Ohne Transaktionsinteresse
  hätte niemand ein Zahlungsmandat vor die Prüfung gestellt.
- **Derselbe Respekt unabhängig von der Größe:** Die Hürde traf kleine
  Anbieter am härtesten — wer keine Rechtsabteilung hat, zögert bei einem
  Mandat für eine Plattform, die ihn noch nicht angenommen hat. Der Wegfall
  senkt die Schwelle dort, wo sie am höchsten war, ohne jemanden zu
  bevorzugen: beide Stufen gelten für alle gleich.
- **Stärkt es Vertrauen, statt es auszugeben:** Wir verlangen später, was
  später gebraucht wird. Das ist die kleinste mögliche Form von „auf deiner
  Seite" — und sie kostet uns nichts, weil das Gate unverändert steht.

Nicht betroffen und deshalb nicht abgehakt: Dringlichkeitssprache (hier ist
keine), Zugang zum Menschen, Ranking und Matching, AI-Verhalten.

## Spec-Abgleich (2026-09-27, beide Specs gelesen)

Die Frage war, ob die Bündelung einen rechtlichen Grund hat. **Sie hat keinen.**

**Spec A §30, erster Satz:** „This is an implementation specification, **not final
contractual language**." §31 behält dem späteren Onboarding-Dossier ausdrücklich
vor: „Declarations, signatures and formal attestations", „Final Provider Agreement
and Privacy Notice text", „**Approved payment-authorization forms**". Die
Formulare, an denen eine Zeitpunkt-Pflicht hängen könnte, existieren also noch
nicht. Spec B sagt dasselbe für seinen Teil („rules that must later appear in the
Partner Agreement …") und regelt Abonnement, Leads, Buchung, Blog und API — nichts
zum Zeitpunkt der Annahmen.

**§23 war die falsche Fundstelle.** Der Code-Kommentar begründete die drei
Pflicht-Annahmen mit §23. §23 („Agreement acceptance and audit trail") ist eine
Liste dessen, was **festgehalten** werden muss — Fassung, Sprache, Datum,
Vertretungsberechtigung, Zeitstempel, Reacceptance bei wesentlicher Änderung. Zum
Zeitpunkt steht dort kein Wort. Unsere Umsetzung erfüllt §23 unverändert.

**Die echte Abweichung ist §4.** Spec A §4 listet die Bewerbungsstrecke als
Reihenfolge, und darin steht „Acceptance of the Provider Agreement, Provider
Privacy Notice and billing authorization" **vor** „CompliHub360 review,
independent checks and resolution of discrepancies". Der Spec will die drei
Annahmen also vor der Prüfung. Davon weicht 4C bewusst ab — Nutzer-Entscheidung
vom 2026-09-27, und nach CLAUDE.md gewinnt die DNA gegen einen Spec. Die
Abweichung ist hiermit benannt, nicht still umgangen.

Dabei hilft, dass §4 den Zeitpunkt nicht erzwingt: die einzige harte Sperre im
ganzen Dokument ist der Satz „The system **must block activation** until all
mandatory requirements … are satisfied." „must block" kommt genau einmal vor, und
zwar für die Aktivierung. Ein „must block submission" gibt es nirgends. §4 ist
eine Aufzählung der Strecke, kein Gate.

## Korrektur meiner eigenen Begründung

Commit, PR-Text und dieses Ticket behaupteten in der ersten Fassung: „Spec A §21.1
verlangt `billing_ready` auch für `limited`". **Das steht nicht in §21.1.** Alle
sechs Zeilen von §21.1 lauten „Block **chargeable booking eligibility** when: …" —
sie sperren die Gebührenpflicht einer Buchung, nicht die Aktivierung. Ich hatte
den Kommentar aus dem Phase-2-Code übernommen und als Spec-Aussage weitergegeben,
ohne die Stelle gelesen zu haben. Die Trennung in zwei Stufen bleibt richtig; ihre
Begründung war an dieser Stelle falsch belegt.

## Neuer Befund — nicht in diesem PR

Daraus folgt eine Frage an das bestehende Aktivierungs-Gate, das ich hier
absichtlich nicht angefasst habe: es verlangt `billing_ready`, um überhaupt zu
aktivieren. Nach §21.1 sperren fehlende Zahlungsmethode, unvollständige
Abrechnungsdaten und zurückgezogene Ermächtigung die **gebührenpflichtige
Buchbarkeit** — nicht den Status. Ein Anbieter mit geprüften Nachweisen und
freigegebenen Zellen, aber ohne Zahlungsmethode, könnte nach Spec `limited` oder
`active` sein und nur nicht gebührenpflichtig gebucht werden; heute bleibt er
gesperrt.

Das ist derselbe Befund in anderer Form — eine kommerzielle Bedingung steht
früher als der Spec sie setzt. Es gehört aber nicht in diesen PR: es ändert das
Gate, und das ist eine eigene Entscheidung. Hier nur benannt.
