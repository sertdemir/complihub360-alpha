---
title: "Beta-Vereinbarung: ein Blatt statt AGB, Zustimmung nach dem ersten Login, Nachweis im Konto"
assignee: "Claude"
status: "doing"
---

# Beta-Vereinbarung (Canvas-Wahl 1A · 2A · 3A+3C · 4C, 22.10.2026)

## Objective

In der geschlossenen Beta ersetzt ein Blatt in neun Sätzen die zwölf leeren AGB-Abschnitte. Tester bestätigen es in einem eigenen Schritt nach dem ersten Login, finden es unter `/terms` wieder und sehen im Konto, welche Fassung sie wann angenommen haben. Anbieter bleiben in der Beta intern (kein Blatt), bis der erste echte Pilot-Anbieter eingeladen wird.

## Acceptance Criteria

- [x] Migration `20261022000000_user_agreements.sql`: `user_agreements` (öffentlich, versioniert, vier Sprachen, Fassung `beta-2026-10`) und `user_agreement_acceptance` (append-only); pgTAP 22.
- [x] API: `GET /agreements/:agreement`, `GET /me/agreements`, `POST /me/agreements/:agreement` (409 bei veralteter Fassung, 200 replay bei Wiederholung), Ereignis `agreement_accepted`; Tests.
- [x] Typen in `@complihub360/types`, OpenAPI.
- [x] Figma-Review durch den Nutzer (Seite `3855:7584`), 22.10.: „Figma passt".
- [x] UI lokal: `/terms` zeigt das Blatt (Footer „Beta-Vereinbarung"), Gate im AuthGuard bei `required` → `/beta-agreement`, Konto-Seite `/dashboard/account` mit Nachweis; Locales en/de/es/tr; Mock-Routen (`POST /api/v1/mock/agreements/reset` macht den Demo-Nutzer zum Neuling); Unit- und E2E-Tests; Screenshots. Abweichung zu Figma: der Ausstieg heißt „Abmelden" statt „Konto schließen", weil es im Produkt keine Kontolöschung gibt und das Blatt nichts verspricht, was nicht existiert.
- [x] Staging-Migration (22.10., in Häppchen) und Prüfung des Schritts mit einem Testkonto (23.10.: Gate → Schritt → Haken → Konto; Annahme `beta-2026-10`, de, in `user_agreement_acceptance`, Ereignis `agreement_accepted`). Review-Befunde Layout behoben in #371.
- [ ] Nutzer-Festlegung 23.10.: der Link „Das ganze Blatt lesen" im Schritt entfällt, das ganze Blatt steht im Frame selbst.

## Design / Tech Details

Canvas (Artifact) 22.10.2026 · Figma `0tJtkBs5hsgswwBi9m1slJ`, Seite `3855:7584` (Blatt `3855:7585`, Schritt `3855:7624`, Konto Light `3855:7711`, Dark `3855:8129`). Muster: `booking_acknowledgements` (Text in der DB) und `provider_agreement_acceptance` (append-only). Der Text ist **ohne anwaltliche Prüfung** erstellt und sagt das selbst (Punkt 09).

## DNA-Check

- **Hilft es dem User zu verstehen, statt nur zu konvertieren?** Der Text steht lesbar vor dem Haken, als neun Sätze mit Pointe zuerst; die Kurzfassung im Schritt verlinkt den Volltext. Eine veraltete Fassung wird nie still untergeschoben (409).
- **Stellt es die echten Bedürfnisse an erste Stelle?** Der Ausstieg („Konto schließen") steht gleichwertig neben „Weiter"; keine Reibung, keine Drohkulisse.
- **Kommunizieren wir Risiko ehrlich, ohne Angst?** „Es kann schiefgehen" und „keine Rechtsberatung" stehen offen, ohne Juristendeutsch; die fehlende anwaltliche Prüfung wird benannt statt versteckt.
- **Verantwortung, wenn etwas schiefgeht?** Punkt 03 verspricht, dass wir es sagen, ohne dass der Tester fragen muss; Löschung nach der Beta mit Frist und Rückfrage.
- **Stärkt es das Vertrauen, statt es auszugeben?** Der Nachweis im Konto gehört dem Tester, nicht nur der Datenbank („Remember the relationship").
