---
title: "Anbieter-Lesezeichen — Tabelle, Endpunkte, Übernahme"
assignee: "Claude"
status: "review"
---

# TKT-UI-27: Anbieter-Lesezeichen (Backend)

Umsetzung der Bauliste aus der Entscheidung vom 2026-09-20 („Exporte entfällt,
Anbieter bekommen drei Zustände", Nutzer-Wahl 1b/1c/1d). Dort steht: Lesezeichen
an drei Flächen, eine Tabelle mit Zeilenschutz, zwei Endpunkte.

**Dieses Ticket liefert den Mechanismus, nicht die Fläche.** Der Merken-Knopf
und die gefüllte Seite sind neue UI und gehen nach der Konvention vom
2026-09-22 durch Canvas → Figma → lokal → Staging. `/dashboard/saved-providers`
bleibt bis dahin `ComingSoonPage`.

## Objective

1. Ein Gast kann einen Anbieter merken, ohne vorher ein Konto anzulegen.
2. Bei der Registrierung übernimmt das Konto die Gast-Lesezeichen.
3. Woher gemerkt wurde, bleibt an der Zeile — Voraussetzung für Zustand 1d.

## Acceptance Criteria

- [x] Tabelle `saved_providers`: Gast **oder** Konto (CHECK), Teil-Unique je
      Eigentümer, `source` auf die drei Flächen begrenzt, `session_id` mit
      `ON DELETE SET NULL`.
- [x] RLS an; genau eine Policy (eigene Konto-Zeilen lesen). Gast-Zeilen nur
      über die Service-Rolle — `anon` sieht null Zeilen.
- [x] `GET /api/v1/me/saved-providers`, `POST` dito, `DELETE …/{provider_key}`.
      Beide Schreibwege idempotent.
- [x] Ein verifizierter JWT schlägt den `guest_key` (wie bei `GET /sessions`).
- [x] `/auth/adopt` übernimmt Gast-Lesezeichen und überspringt, was das Konto
      schon gemerkt hat.
- [x] OpenAPI beschreibt die drei Wege.
- [ ] Merken-Knopf an `ProviderDetailPage`, `ProviderMatchCard`, `PartnerDrawer`
      — **offen, wartet auf den Canvas.**
- [ ] Seite (Zustand 1c/1d) — **offen, wartet auf Canvas und Figma.**

## Design / Tech Details

Zwei Ausweise, nach Rang. Der `guest_key` steht im localStorage EINES Browsers;
wer sich am Telefon anmeldet, hätte sonst eine leere Merkliste, obwohl die
Lesezeichen längst seinem Konto gehören. Dieselbe Begründung wie bei den
Gast-Sitzungen.

`source` wird beim zweiten Merken **nicht** überschrieben — „woher gemerkt"
meint das erste Mal.

Beim Übernehmen bleibt eine Gast-Zeile liegen, wenn das Konto denselben
Anbieter schon gemerkt hat: sonst verletzt die Übernahme den Teil-Index. Die
Konto-Zeile gewinnt, weil sie die ältere Absicht trägt.

## DNA-Check

Betroffen: **Registrierung und Gating** (wer darf merken, und ab wann).

- **Erzeugt es Reibung vor dem Zugang?** Nein — und das war die eigentliche
  Entscheidung. Ein Merken-Knopf, der zuerst ein Konto verlangt, stellt eine
  Hürde an eine Stelle, an der der Nutzer noch gar nichts von uns will. Gäste
  merken über `guest_key`; das Konto erbt die Liste, wenn es eines gibt. „Knowledge
  should come before sales."
- **Stärkt es Vertrauen, statt es auszugeben?** Die Herkunft bleibt an der
  Zeile. Eine Merkliste, die in drei Wochen nicht mehr sagen kann, warum ein
  Anbieter darin steht, ist eine Sammlung von Namen — und Namen allein sind
  genau das, was diese Plattform vor der Buchung nicht zeigt.
- **Wahrt es die Fairness zwischen Providern?** Ja. Das Lesezeichen ist eine
  Nutzerhandlung und geht nirgends ins Matching oder Ranking ein; die Tabelle
  wird von `matchable_provider_services` nicht gelesen. Ein oft gemerkter
  Anbieter wird dadurch nicht sichtbarer.
- **Bekäme ein kleines Unternehmen denselben Respekt?** Die Liste kennt keinen
  Plan und kein Kontingent — kein Limit, das mit der Kontogröße wächst.

Nicht betroffen: Ranking und Matching (keine Lesart der Tabelle im Scorer),
Monetarisierung (kein Gate, kein Upsell), AI-Verhalten.

## Agent Audit Log
- [2026-09-22] **Claude**: Backend umgesetzt. `db:test` 114 Zusicherungen grün
  (13 neue), `compliance-api` 165 Tests grün (15 neue). Gegengeprobt: drei
  Defekte eingebaut (Idempotenz, Rangfolge, Übernahme-Dedup) — drei Tests
  fallen. UI bleibt offen, siehe Acceptance Criteria.
