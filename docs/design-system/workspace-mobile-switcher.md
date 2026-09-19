# Arbeitsbereich Mobil — Titel-Umschalter (FINAL · kanonisch seit 2026-09-19)

Gilt für alle drei App-Workspace-Shells: `UserShell`, `ProviderShell`, `AdminShell`.
Implementiert einmal, in `apps/vs1-demo/ui/src/components/ui/WorkspaceMobileBar.tsx`.

## Was war

Die drei Shells hatten **kein einziges Responsive-Handling**. `Sidebar` (AppShell) ist
ein hartes `w-60 shrink-0`:

- Bei 390 px nahm die Leiste 240 und ließ 150 für die Inhaltsspalte — 86 px, sobald
  `px-8` bezahlt war.
- Konto-Block und Abmelden sitzen am Fuß dieser Leiste, waren also ebenfalls weg.
- `SiteHeader` gibt auf diesen Routen `null` zurück, es sprang also nichts ein.
- `h-screen` statt `h-dvh`: die iOS-Leiste schnitt unten ab.

## Das Muster

Drei Varianten bei 390 × 844 in einem Canvas (Off-Canvas-Drawer · Tab-Leiste ·
**Titel-Umschalter**). Der Titel-Umschalter gewann: ein Arbeitsbereich wird bewohnt,
nicht besucht, und der Titel trägt die Ortsangabe umsonst — kein dauerhaftes
Navigations-Chrome, was Tabellen und Dashboards auf 390 px brauchen.

**Zwei Festlegungen des Nutzers über den Canvas hinaus:**

1. **Nur der Titel.** Kein Gruppen-Eyebrow darüber — das sagte dasselbe zweimal.
2. **Die Kopfzeile bewegt sich nicht.** Beim Öffnen bleibt die Leiste exakt stehen;
   nur ihr Wort wechselt auf „Wechseln zu", und ausgetauscht wird, was **darunter**
   liegt. Ein Vollbildsprung wäre wieder der Drawer, nur mit anderem Hut.

## Aufbau

| | |
|---|---|
| **Leiste** | 60 px, `lg:hidden`. Bildmarke · Titel-Knopf mit Chevron · ein bis zwei Regler (Suche, Glocke). |
| **Panel** | Fällt unter der Leiste auf, `top: 60`, bis zum unteren Rand. Die komplette Navigation in ihren Gruppen, scrollend. |
| **Fuß** | Unter der Navigation fixiert: Konto-Block, Abmelden, und die Regler, die nicht in 390 px neben einen Titel passen. |

Schnitt bei `lg` (1024). Darüber bleibt alles wie es war: Sidebar sichtbar,
bestehende Utility-Leiste sichtbar, `px-8 py-6`.

## Es ist eine Disclosure, kein Dialog

`aria-expanded` + `aria-controls` am Titel-Knopf, `id` am Panel. **Kein**
`role="dialog"`, **kein** `aria-modal`, **kein** Focus-Trap.

Das ist Absicht und der Unterschied zu `MobileNav` (Marketing-Header), die ein echtes
Modal ist: dort deckt das Panel alles ab. Hier bleibt die Kopfzeile bedienbar — Suche
und Glocke funktionieren, während das Panel offen ist —, und Modalität zu behaupten
würde einem Screenreader genau darüber etwas Falsches erzählen.

Escape schließt und gibt den Fokus an den Titel zurück. Ein Routenwechsel schließt
ebenfalls: Ankommen ist das Ende des Auswählens.

## Portal

Das Panel geht per `createPortal` an `document.body`. Die Shells tragen heute kein
`backdrop-filter` — aber ein `fixed`-Kind einer Kopfzeile ist genau ein
`backdrop-blur` davon entfernt, sich gegen eine 60-px-Box statt gegen den Viewport
aufzulösen. Das hat bei `MobileNav` einen Abend gekostet, siehe
`mobile-nav-drilldown.md`. **Nicht zurück in eine Kopfzeile verschieben.**

## Keine Drift

Jede Shell leitet die mobilen Gruppen aus **denselben Konstanten** ab, die ihre
Sidebar rendert, mit demselben Aktiv-Test:

- `UserShell` → `SIDEBAR` + `DOMAINS`, Bereiche an derselben Stelle eingefügt wie im
  Rail (direkt nach „Arbeitsbereich").
- `ProviderShell` → `NAV`. „Hilfe & Support" bleibt in beiden ein Knopf, weil es eine
  Schublade öffnet und kein Ziel ist.
- `AdminShell` → `NAV`.

Der Titel der Leiste ist der `title` des aktiven Eintrags; greift keiner, der
`fallbackTitle`.

**Eine bewusste Auslassung:** die Sitzungs-Unterebene des `UserShell` kommt nicht mit.
Sie wächst mit jeder Sitzung, und `/dashboard/sessions` ist die Seite, die genau diese
auflistet.

## Was mitgeritten ist

- Inhalt `px-4 py-5 lg:px-8 lg:py-6` (32 px Rand bei 390 sind zu viel).
- `h-screen` → `h-dvh` in allen drei Shells.
- Tippziele 44 px.
- Neuer Schlüssel `shell.switchTo` in `userws` und `providerws`, alle vier Sprachen.
  CI fährt ein Key-Parity-Gate — daran denken.

## Nebenbei behoben

`ProviderShell` wickelte „Hilfe & Support" in ein `<button>`, obwohl `NavItem` selbst
eines rendert: `<button>` in `<button>`, was React anmerkt und kein Browser so
parst, wie es sich liest. `NavItem` nimmt bereits `onClick` — der Wrapper ist weg.

## Offen

- **`/de/admin` (Overview) stürzt ab**, unabhängig von dieser Arbeit: `Cannot read
  properties of undefined (reading 'filter')`. Auf dem Stand vor diesem Branch
  identisch reproduziert. Die anderen Admin-Routen laufen.
- `AvailabilityPill` zeigt „Available" auf Englisch, während der Rest deutsch ist —
  die deutsche Fassung existiert nur für den Abwesend-Fall. Älter als dieser Branch,
  betrifft auch die Desktop-Leiste. Produkt-Copy.
- Zwischen 768 und 1024 trägt der Bildschirm den Rail eigentlich (240 + ~528). Dort
  ein Icon-Rail statt des Panels wäre eine mögliche spätere Verfeinerung; bewusst
  nicht vorweggenommen.
