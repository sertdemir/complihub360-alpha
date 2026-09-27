---
title: "Annahmen in zwei Stufen — Abrechnungsermächtigung raus aus dem Einreich-Gate"
assignee: "Claude"
status: "review"
---

# Annahmen in zwei Stufen (Canvas 4C)

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
fließt Geld, und Spec A §21.1 verlangt `billing_ready` auch für `limited`.
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

## Offen — beim Nutzer, nicht bei mir

**Spec A §23 führt alle drei Annahmen gemeinsam.** Das Spec-Dokument
(*Provider Verification and Dashboard Implementation Specification* v1.0)
liegt nicht im Repository; ich kann §23 nicht im Wortlaut lesen. Code und
OpenAPI sind auf die Trennung korrigiert und benennen den Widerspruch — der
Spec selbst nicht, weil er hier nicht liegt.

Zu klären, bevor das auf Staging geht: **hat §23 einen rechtlichen Grund?**
Wenn die Partnervereinbarung ihrerseits verlangt, dass die Ermächtigung bei
Antragstellung vorliegt, ist die Trennung nicht nur eine UX-Entscheidung. Das
kann ich von hier nicht beurteilen und entscheide es nicht selbst.
