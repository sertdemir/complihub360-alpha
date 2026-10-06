---
title: "Tarifwahl im Anbieterportal — Oberfläche zu #240"
assignee: "Claude"
status: "done"
---

# Tarifwahl im Anbieterportal

Das Backend steht seit **#240** (`TKT-PROV-07`): `GET`/`POST
/api/v1/provider/:key/subscription` und `POST /api/v1/admin/provider-subscriptions`.
Im Produkt gibt es die Fläche nicht — ein Anbieter kann keinen Tarif wählen und
ist damit **nie buchbar**, weil `billingReadiness` ein laufendes Abo verlangt.

Das war offener Punkt 1 aus `TKT-PROV-07`.

## Canvas-Wahl (Nutzer, 2026-10-04)

Sieben Flächen, je drei Varianten, in einem Canvas bei 1440 px mit den Werten
aus `index.css`. Der Nutzer hat die Empfehlung komplett übernommen:

| Fläche | Wahl | Was das heißt |
|---|---|---|
| A Seitenkopf | **A3** | „Welcher Tarif passt zu Ihrem Angebot?" plus Hinweis auf die freigegebenen Hauptkategorien des Anbieters. Macht aus „kaufen" ein „passen". |
| B Zahlweise | **B1** | Umschalter monatlich/jährlich über den Tarifen, die Regel („zwölf Monate zum Preis von zehn") steht **einmal** darunter. |
| C Die drei Tarife | **C1** | Drei Karten mit gleichem Gewicht. Kein „beliebtester Tarif" — die Zahl dafür haben wir nicht, ein erfundenes Siegel wäre Druck. |
| D Was ein Tarif nicht ändert | **D2** | Eigene Fläche, die vier Punkte aus Spec B **einzeln** benannt. |
| E Beim Wählen | **E2** | Bestätigungsschritt mit Preis, Beginn, erster Rechnung und Verlängerung — plus dem Satz, dass ein Tarif allein nicht buchbar macht. |
| F Tarif läuft schon | **F2** | Fläche mit dem laufenden Tarif und dem **echten Grund**, warum ein Wechsel hier nicht geht. |
| G Konto kann nicht | **G3** | Grund beim Namen, dazu was *nicht* betroffen ist und wann es weitergeht. |

Verworfen und warum — damit niemand es später „verbessert":

- **C3** (Empfehlung zuerst) ist Lenkung, auch begründet. Spec B: *„we do not
  create needs."*
- **D3** (Zusage in jeder Karte) klingt dreimal wiederholt wie eine
  Rechtfertigung statt wie eine Selbstverständlichkeit.
- **F3** (alle Tarife sichtbar, nicht benutzbar) weckt die Erwartung eines
  Wechsels, dessen Weg eine Mail ist — genau die Reibung, die die DNA
  ausschließt.
- **G1** („geht nicht, frag nach" ohne Grund) ist die Vagheit, die die DNA
  ausschließt.
- **E3** (Hinweis erst nach dem Abschluss) kollidiert mit *„show value before
  asking for commitment."*

## Die drei Tatsachen, die E2 tragen muss

1. Der Tarif beginnt **sofort**.
2. Die Rechnung kommt mit dem Periodenlauf (`POST /admin/billing/run`,
   `send_invoice`) und ist in **14 Tagen** fällig. Es gibt **kein Stripe-Abo** —
   wer hier eines einbaut, rechnet doppelt ab.
3. **Ein Tarif allein macht nicht buchbar.** Dafür braucht es zusätzlich ein
   hinterlegtes Zahlungsmittel (`billingReadiness`, eine von sieben
   Bedingungen). Ohne diesen Satz wartet jemand auf Buchungen, die nie kommen.

## Stand im UI-Workflow

- [x] **Stufe 1 Canvas** — abgenommen 2026-10-04 (Wahl oben).
- [x] **Stufe 2 Figma** — gebaut 2026-10-04, Seite `🧾 Provider · Tarifwahl`
      in `C360 - Design System` (`a4BeKbsBGoHkcudhKXUJTl`).
- [x] **Stufe 3 lokal** — gebaut 2026-10-04, `npm run dev:ui`, alle vier
      Zustaende als Screenshot aufgenommen. Review durch den Nutzer steht aus.
- [x] **Stufe 4 Staging** — mit dem Merge automatisch ausgerollt
      (Workflow `deploy-staging`, Lauf `37374139131`, alle fünf Jobs grün:
      `build-ui`, `build-api`, `deploy-api`, `deploy-ui`, `verify`).

## Abgeschlossen

Gemergt als **PR #251**, Squash `7d40787e` (2026-10-05). Die Fläche gibt es im
Produkt: ein Anbieter kann einen Tarif wählen, und damit ist die Bedingung
erfüllt, an der `billingReadiness` bisher ohne Weg scheiterte. Offener Punkt 1
aus `TKT-PROV-07` ist zu.

Geprüft vor dem Merge: `typecheck`, `build`, `tsc --noEmit` (UI), `i18n:check`,
`terminology:check`, `copy:check`, Tests der API und der UI (35 Dateien /
280 Tests, vorher 33/277), `quality-gates` grün.

### Was dieses Ticket NICHT erledigt

Das Ticket geht nach `done`, weil der Code auf `main` ist — nicht, weil alles
entschieden wäre. Drei Dinge bleiben offen und brauchen je einen eigenen Schritt:

1. **Der Blick auf Staging.** Ausgerollt ist die Fläche (siehe oben) — der
   Deploy hängt an `paths: apps/vs1-demo/ui/**`, und der Merge hat ihn
   ausgelöst. Angesehen hat sie dort noch niemand; Claude kann die
   Staging-Domain nicht abrufen (Proxy 403), das ist Sache des Nutzers.
2. ~~Die Copy ist nicht abgenommen.~~ **Abgenommen vom Nutzer am 2026-10-06**,
   einschließlich der Überschrift „Ihr Tarif" im laufenden Zustand. Die war
   neue Microcopy — das F2-Board im Canvas zeigte nur die Karte, keine
   Überschrift —, und sie bleibt wie sie ist. Das gilt für alle vier Sprachen.
3. **Kulanzfrist, Tarifwechsel und Kündigung** bleiben offen — Spec B hat die
   Regeln unter „Configurable items requiring final decision" reserviert, und
   eine still erfundene Regel wäre genau die Entscheidung, die nicht im Code
   fallen darf. Als Entscheidungsvorlage aufbereitet in
   [`ADR-0006`](../../docs/decisions/ADR-0006-abo-kulanz-wechsel-kuendigung.md)
   (Status `PROPOSED`): was heute faktisch gilt, je drei Optionen, und die drei
   Kopplungen zwischen ihnen. **Entschieden ist dort nichts.**

Dazu eine Nebenwirkung, die über diese Fläche hinausreicht: der Sidebar-Eintrag
`Tarif` sitzt in `AppShell / Sidebar — Provider v2` bzw. im `NAV` der
`ProviderShell` und erscheint damit auf **jeder** Anbieterfläche.

### Was Stufe 3 gebaut hat

**Oberflaeche**
- `apps/vs1-demo/ui/src/pages/provider/SubscriptionPage.tsx` — die Seite, vier
  Zustaende in einer Komponente: Wahl (A3 · B1 · C1 · D2), Bestaetigung (E2,
  als `Modal`), laufender Tarif (F2), Konto nicht berechtigt (G3).
- `apps/vs1-demo/ui/src/api/subscription.ts` — Client. Der interessante Teil
  ist die Fehlerzuordnung: beide Absagen der Route kommen als **409**, sind
  aber zwei voellig verschiedene Flaechen.
- Route `partner-dashboard/subscription`, Sidebar-Eintrag `Tarif` (Icon
  `Gauge`), Copy in **en, de, es, tr**.

**Backend** (drei Felder, die die Oberflaeche braucht und die GET nicht hatte)
- `renewal_date` — die Verlaengerung. Ohne sie koennte E2 den vierten Eckwert
  nicht zeigen, und `current_period_end` waere die falsche Zahl: der Zyklus ist
  immer monatlich, die Verlaengerung folgt der Zahlweise.
- `released_categories` — die freigegebenen Hauptkategorien. Gelesen aus
  `provider_services`, **nicht** aus `matchable_provider_services`: die View
  filtert zusaetzlich auf `lifecycle_status`, ein pausiertes Konto haette dort
  null Zeilen, und A3 wuerde einem Anbieter mit freigegebenen Leistungen
  „0 Hauptkategorien freigegeben" sagen. Sieben Tests halten das fest.
- `eligibility` — ob das Konto ueberhaupt beginnen kann, **mit Grund**. Ohne
  das erfuehre der Anbieter die Grenze erst nach dem Klick (409) — genau das
  Muster, das bei E3 verworfen wurde. `suspended` und `terminated` bekommen
  zwei verschiedene Saetze; ein Sammelsatz liesse das eine wie das andere
  klingen.

### Befund aus Stufe 3

**`SiteHeader` doppelt die Routentabelle.** Die neue Seite lief, sah aber
falsch aus: ueber der ProviderShell lag der **Marketing-Header**. Grund ist
die Liste `PROVIDER_WORKSPACE` in `SiteHeader.tsx`, die jede Workspace-Seite
einzeln aufzaehlt und `subscription` nicht kannte. Weder Typecheck noch Build
noch ein Test schlugen an — aufgefallen ist es erst im Screenshot.

Eintrag ergaenzt und mit `SiteHeader.workspace.guard.test.ts` abgesichert: der
Test liest beide Dateien und vergleicht sie. Gegengeprobt — nimmt man den
Eintrag wieder heraus, faellt er.


### Was in Figma liegt

Vier Screens à 1440 px, alle auf derselben Seite, dazu oben eine Lesehilfe:

| Zustand | Node | Inhalt |
|---|---|---|
| Auswahl (A3 · B1 · C1 · D2) | `2194:3` | der Normalfall, ohne laufendes Abo |
| Bestätigung (E2) | `2203:206` | Dialog über dem Auswahl-Screen |
| Tarif läuft (F2) | `2205:344` | laufendes Abo plus echter Grund |
| Konto pausiert (G3) | `2206:443` | `409 PROVIDER_NOT_ELIGIBLE` |
| Lesehilfe | `2210:539` | Wahl, Komponenten, Befunde, Offenes |

Verwendete Compass-Komponenten: `Card / Plan` (neu, siehe Befunde) ·
`AppShell / Sidebar — Provider v2` ·
`AppShell / Topbar — Provider` · `Partner Status Badge` · `Availability Pill` ·
`Desktop Tabbar` (Boxed, als Umschalter) · `Button` (Primary, Secondary) ·
`Chip` (Brand, Success) · `Divider` · `Alert` (Warning, Light).
Farben, Radien und Strichstärken sind an Variablen gebunden, Text an die
Textstile — keine losen Hex-Werte.

## Befunde aus Stufe 2 — und was daraus wurde

Drei davon sind erledigt, einer bleibt offen.

1. **Compass hatte keine Tarifkarte — `Card / Plan` gebaut.** `Card Base` trägt
   nur Titel und Fließtext. Die neue Komponente liegt auf der Cards-Seite und
   hat 20 Eigenschaften: Tarifname, Betrag, Einheit, abschaltbare
   Jahresalternative und fünf einzeln abschaltbare Leistungszeilen; der CTA ist
   eine freigelegte Button-Instanz. Die drei Karten auf den Screens sind jetzt
   Instanzen davon, nicht mehr handgesetzt. Bewusst **ohne**
   Hervorhebungs-Zustand und ohne Siegel — ein „beliebtester Tarif" wäre
   Lenkung ohne Beleg.

2. **Die Opacity-Variablen binden nicht mehr auf ein Hundertstel.** Gemessen an
   Wegwerf-Variablen: Figma liest das Opacity-Feld als Prozent — `50` ergibt
   `0.5`, `0.5` ergibt `0.005`. Die zehn Variablen stehen jetzt auf **0–100**,
   tragen den Hinweis in ihrer Beschreibung und sind auf den Scope `OPACITY`
   begrenzt. Gegenprobe: der Scrim im Bestätigungs-Screen ist gebunden und
   liegt bei 0,5.

   Im Code bleibt derselbe Token **CSS-Opacity 0–1**. `tokens.json` ist laut
   eigenem `$meta` ein Spiegel von `index.css`, und `check-token-export.mjs`
   vergleicht ihn gegen die CSS, nicht gegen Figma — die Skalen dürfen und
   sollen sich unterscheiden. Damit das niemand „korrigiert", steht es in
   `docs/design-system/compass-reference.md` §10.

3. **Die Provider-Sidebar hat einen Eintrag `Tarif`** — unter BUSINESS, hinter
   Billing, Icon `gauge`. Nicht `star`: ein Stern läse sich wie ein Gütesiegel,
   und das schließt die DNA aus. Auf allen vier Screens ist er der aktive
   Eintrag. Die Änderung sitzt in `AppShell / Sidebar — Provider v2` und wirkt
   damit auf jede Fläche, die diese Sidebar benutzt.

4. **Offen: die Überschrift „Ihr Tarif" in F2 ist neue Microcopy.** Sie war
   nicht Teil der Canvas-Abnahme, weil das F2-Board nur die Karte zeigte —
   abnahmepflichtig wie die übrige Copy.

## Was unabhängig von der Wahl entsteht

1. Seite unter `/partner-dashboard/subscription`, im `ProviderShell` wie
   `/billing`, mit `useApiData` gegen `GET /provider/:key/subscription`.
2. Copy in vier Sprachen (en, de, es, tr). **Noch nicht abgenommen** — die
   Abnahme ist ein eigener Schritt.
3. Vier Zustände: ohne Abo · mit laufendem Abo · nicht berechtigt
   (`409 PROVIDER_NOT_ELIGIBLE`) · Stripe nicht konfiguriert.
4. Tests samt Gegenproben und Mock-Daten für den lokalen Lauf.

## DNA-Check

Auslöser: **Monetarisierung**, **Copy/Microcopy**, **Registrierung/Gating**.
`KN-BRAND-001` vor dem Canvas gelesen.

- **„We do not create needs. We identify them."** — A3 fragt nach Passung statt
  nach Kaufabsicht, und die Zahl dafür kommt aus den freigegebenen Bereichen des
  Anbieters. C3 wurde genau deshalb verworfen.
- **Angst wird nie zur Conversion eingesetzt.** — Keine Frist, kein Countdown,
  kein „beliebtester Tarif", kein Prozent-Rabatt-Siegel. Der Jahresvorteil steht
  in **Monaten**, wie Spec B ihn nennt.
- **Kein bezahltes Ranking.** — D2 benennt die vier Punkte aus Spec B einzeln.
  Technisch ist es ohnehin gesichert (pgTAP-Wächter hält jede Preis-Tabelle aus
  `matchable_provider_services`), aber gesagt hat es dem Anbieter bisher niemand.
- **Show value before asking for commitment.** — Ein Anbieter kann sein Dossier
  füllen, einreichen und aktiviert werden, ohne zu zahlen (TKT-PROV-05). Der
  Tarif steht am Ende des Weges, nicht als Tor davor.
- **Unsicherheit nicht hinter selbstsicherer Sprache verstecken.** — F2 nennt
  den echten Grund: die Regeln für anteilige Abrechnung und Kündigungsfristen
  sind in Spec B reserviert, bis dahin macht es ein Mensch.
- **Nie Reibung, um den Zugang zu einem Menschen zu verhindern.** — F2 und G3
  nennen die Adresse, ohne Formular davor.
- **Respekt unabhängig von der Größe.** — Preise aus `plan_catalog`, für alle
  dieselben; keine Staffel, kein Sonderpfad.
- **Never make the user feel small.** — G3 sagt „ein Hinweis wird geprüft",
  nicht „Ihr Konto ist gesperrt", und nennt, was *nicht* betroffen ist.

Nicht berührt: Risk Map, Wizard, Ranking, AI-Verhalten.

## Offen, nicht Teil dieser Fläche

1. **Die Kulanzfrist** bei offener Rechnung — steht faktisch auf null
   (`overdueInvoices > 0`), Spec A §21.1 sieht eine „configured cure period"
   vor. Entscheidung des Nutzers, ausdrücklich geparkt.
2. **Tarifwechsel und Kündigung** durch den Anbieter selbst — erst nach den
   Regeln, die Spec B unter „Configurable items requiring final decision"
   reserviert.
3. **`provider_subscriptions` hat weiterhin keinen Weg aus der Oberfläche** —
   genau das baut dieses Ticket.
