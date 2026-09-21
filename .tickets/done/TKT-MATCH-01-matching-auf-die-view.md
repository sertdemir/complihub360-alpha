---
title: "Matching auf matchable_provider_services umstellen"
assignee: "Claude"
status: "done"
---

# Matching auf `matchable_provider_services` umstellen

## Objective

Schritt 1 aus dem Ausblick der Migration `20260920000000_provider_data_model.sql`:
Sichtbarkeit im Matching entscheidet ab jetzt die UND-Kette der View
(freigegebene Leistung × freigegebener Markt × gültiger Kontostatus, §3 × §4 ×
§19) statt `partner_status` + `countries_supported`.

## Acceptance Criteria

- [x] `POST /api/v1/search` liest die Anbietermenge aus `matchable_provider_services`.
- [x] Relevanz zählt freigegebene Bereiche, nicht die Selbstauskunft in `providers.categories`.
- [x] `DOMAIN_TO_DB` entfällt ersatzlos — die Zuordnung lebt nur noch in `service_categories`.
- [x] `bookable_chargeable` ist kein Filter (§14), abgesichert durch einen Test, der bei einem Filter rot wird.
- [x] Die Abweichung zum Altbestands-Filter ist gemessen, nicht vermutet.

## Design / Tech Details

### Gemessene Abweichung, nicht vermutete

Gegen eine frisch gebaute Testdatenbank (32 Migrationen, danach der Backfill)
mit sechs Anbietern in Altbestands-Form:

| Anbieter | Altbestands-Filter | View |
|---|---|---|
| aktiv, `categories=['vat']`, `['DE','FR']` | sichtbar | sichtbar |
| downgraded, `categories=['gdpr']`, `['DE']` | sichtbar | sichtbar |
| aktiv, **ohne** `categories` | sichtbar | **weg** |
| aktiv, `categories=['blockchain']` (nicht in der Abbildung) | sichtbar | **weg** |
| aktiv, ohne `countries_supported` | weg | weg |
| inaktiv | weg | weg |
| aktiv, **nach** der Migration angelegt | sichtbar | **weg** |

Drei Klassen fallen heraus, alle in dieselbe Richtung. Die dritte ist gewollt
(§19: eine neue Leistung ist bis zur Freigabe nicht matchbar). Die ersten
beiden wären eine stille Verhaltensänderung gewesen — ein Anbieter verschwindet
aus dem Matching, weil ein Backfill seinen Kategorie-Schlüssel nicht kannte.

Gegen Staging geprüft: 4 Anbieter (2 aktiv, 2 downgraded), **keiner** ohne
Kategorie oder ohne Land, **kein** Schlüssel außerhalb der Abbildung. Auf den
heutigen Daten ist der Umbau also deckungsgleich. Er ist es aber aus Zufall,
nicht aus Konstruktion — deshalb steht die Tabelle hier und nicht nur im Kopf.

### `area_code` in der View statt einer zweiten Abbildung in der API

Der Wizard sendet Bereichs-Slugs, `provider_services.service_code` darf nach
§11 auch eine Unterkategorie sein. Ohne den Bereich müsste die API die
Taxonomie nachbauen — genau so ist `DOMAIN_TO_DB` entstanden. Die neue Spalte
`area_code` rollt über `service_categories.parent_code` hoch; die API trägt
danach gar keine Abbildung mehr.

### Was bewusst NICHT mitgeht

- `partner_status` bleibt als **Anzeige**- und **Ranking**-Merkmal (Verified-Badge,
  Watchdog-Abzug ×0.4). Entfernen ist Schritt 3 des Ausblicks.
- Die Gewichtung (0.6 Relevanz + 0.3 Qualität + 0.1 Priorität) ist unverändert.
- `GET /api/v1/providers/:key` (der bezahlte Detail-Open) zeigt weiter
  `providers.categories`. Gehört zur Anonymisierung gegen
  `provider_field_visibility` — Schritt 2, eigener PR.

## DNA-Check

Betroffen: **Ranking und Matching** (Sichtbarkeit, Match-Prozente, Fit-Indikatoren).

- **Stellt es die echten Bedürfnisse des Users an erste Stelle?** Der User sieht
  ab jetzt nur Anbieter, deren Leistung für seinen Markt tatsächlich freigegeben
  ist — statt solcher, die sich selbst eine Kategorie eingetragen haben.
- **Hilft es dem User zu verstehen — statt nur zu konvertieren?** `match_basis`
  und `specializations` tragen jetzt geprüfte Leistungsnamen; die Prozentzahl
  ist damit über etwas belegbar, das jemand freigegeben hat.
- **Wahrt es die Fairness zwischen Providern?** Die Grenze ist für alle dieselbe
  Konjunktion, ohne Ausnahme und ohne Rangfolge zwischen den Statusachsen.
  Der gemessene Abgleich oben stellt sicher, dass niemand unbemerkt herausfällt.
- **Würden wir diese Empfehlung auch geben, wenn keine Transaktion stattfände?**
  `bookable_chargeable` bleibt aus der Auswahl heraus — Zahlungsbereitschaft
  entscheidet nicht über Sichtbarkeit (§14), abgesichert durch zwei Tests.
- **Stärkt es das Vertrauen der User — statt es auszugeben?** Eine abgelaufene
  Freigabe wirkt sofort, weil die View rechnet statt ein Flag zu lesen; es gibt
  keinen Zustand "war mal geprüft, steht aber noch drin".

## Agent Audit Log

- [2026-09-21] **Claude**: Abweichung gegen Testdatenbank und Staging gemessen, `area_code` ergänzt, Matching umgestellt, vier Sabotagen gefahren. (Status: done)
