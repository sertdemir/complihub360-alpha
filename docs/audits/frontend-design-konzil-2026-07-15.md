# Frontend-Design-Konzil — Iteration 2 (2026-07-15)

**Scope:** Vollaudit des Frontends `apps/vs1-demo/ui` (Konsistenz, Farbnutzung, Accessibility, Dark Mode) auf Staging + im Code.
**Methode:** 8 statische Audit-Agenten (Rogue-Farben, WCAG-Kontrast-Berechnung, Dark-Coverage, A11y, Konsistenz, Komponenten-Drift) + 2 visuelle Auditoren (Marketing-Surfaces & App-Workspaces, Light + Dark). 198 Roh-Befunde; eine adversariale Verifikationsrunde bestätigte 78 als real+belegt, bevor der Lauf ins Session-Limit lief; die volle Menge wurde anschließend gegen die Compass-Referenzen re-adjudiziert.
**Maschinenlesbar:** `docs/audits/frontend-design-konzil-2026-07-15.findings.json` (alle 198 Befunde: `id · sev · cat · file · line · grep · issue · expected · evidence`).

> **Für die nächste Session:** Dieser Bericht ist wurzelursachen-orientiert. Arbeite die **Wurzelursachen (§4)** ab, nicht die 198 Einzelbefunde — ein einziger Fix im `.dark`-Block von `index.css` erledigt dutzende Befunde auf einmal. Die Befund-IDs in Klammern verweisen auf die JSON-Datei und den Katalog (§7).

---

## 1. Executive Summary

Das Frontend ist funktional weit, aber visuell **kein kohärentes System** — es sind faktisch **zwei Design-Sprachen** im selben Repo: die Compass-konformen Neubauten (`components/ui/*`, `pages/user/*`, `pages/provider/*`, `components/home/*`) und ein **Alt-/Parallelsystem** (`pages/dashboard/*`, `pages/partner-dashboard/*`, `layout/PageHeader|PageFooter|GlobalNav`, sowie `ServicesPage`/`CountriesPage`/`AdvisoryPage`/`PlatformPage`/`SolutionsPage`/`ResourcesPage`/`ComplianceAreasPage`/`AiGovernancePage`) mit **eigener blauer Markenfarbe `#137fec`**, Material-Symbols-Icons statt Lucide und **null Dark-Mode-Abdeckung**.

Die konkreten Nutzerbeschwerden bestätigen sich vollständig und haben **wenige gemeinsame Wurzeln**:

- **„Dark Mode zu dunkel"** → ein einzelnes Token: `--color-text-tertiary` dark = `#6b7a80` = **3.3:1** auf Slate, für ~379 Verwendungen bei 10–14px (#60, #162, #180). Aufhellen = Beschwerde weg.
- **„Elemente fehlen / farblich kaputt im Dark Mode"** → fehlende `.dark`-Overrides für `primary-600` (Eyebrows unsichtbar 1.01:1, #154/#158), `bg-brand` flippt auf Neon-Türkis und bricht weiße/goldene Texte (#155/#107/#56), Sektions-Headlines ohne Dark-Variante (#157), **weiß-auf-weiß** Panels (#156), sowie ganze Alt-Seiten ohne Dark-Styles (#97–#105).
- **„Farben inkonsistent / falsch"** → Gold als Status-/Primär-/Fokusfarbe an ~10 Stellen (harte Markenregel gebrochen: #3/#8/#16/#42/#166/#176/#177), Rogue-Rot als Risk (#4), Fremd-Blau `#137fec` (#1/#130), Status via rohe Tailwind-Töne statt Tokens (#7/#145).
- **„keine Konsistenz zwischen Elementen"** → 1176 arbitrary `text-[Npx]` statt Typo-Skala (#136), ~41 % Button-Adoption (#128), `tailwind.config` bildet Spacing/Radius **nicht-monoton** ab (#125/#131), 59 handgeschriebene Status-Farbmaps statt einer Badge-Komponente (#146).

**Befund-Verteilung:** P0 = 32 · P1 = 83 · P2 = 83 (Roh-Severity der Audits). Nach Wurzelursache gebündelt sind es **~12 systemische Eingriffe**, die den Großteil erschlagen.

---

## 2. Entschiedene Zielkonflikte (Konzil)

Drei gegensätzliche Rollen (Compass-Wächter · Accessibility-Anwalt · pragmatischer Engineer) haben die echten Konflikte ausdiskutiert. Ergebnis:

| # | Konflikt | Entscheidung | Begründung |
|---|---|---|---|
| K1 | **Dunkler Brand-Look vs. WCAG-Kontrast.** Der ruhige, tiefe Dark-Look kollidiert mit dem 4.5:1-Minimum (Tertiärtext, on-brand-Text, Eyebrows). | **Kontrast gewinnt — aber am Token, nicht per Komponente.** Dark-Werte in `index.css .dark` anheben (Tertiary ≥ #8a97a0, on-brand dunkle Ink, primary-600 hell mappen). | A11y ist nicht verhandelbar (AA), der Compass-Wächter hat recht mit dem *Mechanismus*: zentraler Token-Fix statt 379 Einzelstellen. Beide Ziele erreichbar — dunkel bleibt, nur lesbar. |
| K2 | **Risk-Farbe: Petrol vs. Rot/Amber/Grün.** Code + `RiskBadge` kodieren „Risk = Petrol, NIE rot" (#147); die App nutzt real rot/amber (SessionRow) und teal (Results) → invertierte Hierarchie (Critical = blasses Mint, milde Staleness = Alarm-Rot). | **Rot/Amber/Grün gewinnt** (deckt sich mit Memory-Entscheidung „Risk: red/amber/grey"); Petrol-Risk-Experiment retten. **Eine** `RiskBadge` erzwingt es, zweites System entfernen. | User-Erwartung + A11y-Zweikanal (Farbe + Icon/Text) + Memory-Beschluss. Der Petrol-Risk-Ansatz erzeugt genau die unleserlichen, hierarchie-invertierten Chips (#57/#58/#67/#170). **→ Braucht deine Bestätigung (§3).** |
| K3 | **Alt-Seiten: restaurieren vs. entsorgen.** Dutzende P0/P1-Dark-Brüche liegen in Alt-Routen (`ServicesPage` etc., `pages/dashboard/*`). | **Erst Routing auditieren, dann entscheiden.** Tote Routen **entfernen** (löst die Befunde ersatzlos), lebende **migrieren**. Kein Restyling toter Seiten. | Pragmatiker gewinnt: Iteration 2 darf keine Zeit in Seiten stecken, die evtl. gar nicht mehr verlinkt sind. De-scoped potenziell ~15 P0/P1. |
| K4 | **Gold.** Kein echter Konflikt — alle drei Rollen einig. | Gold **ausschließlich** Verified-Partner + Monetarisierung + Ein-Gold-Wort-Headline. Überall sonst raus. Dunkle Ink auf Gold (nie Weiß). | Harte Markenregel; zusätzlich ist das wichtigste Brand-Element (VERIFIED-Badge) mit Weiß-auf-Gold = 2.1:1 am schlechtesten lesbar (#161). |

---

## 3. Entscheidungen, die DU treffen musst (bevor Iteration 2 startet)

1. **K2 — Risk-Farbdoktrin:** Rot/Amber/Grün (Empfehlung) **oder** Petrol-Skala? Alles Weitere (RiskBadge, SessionRow, Results-Chips, Domain-Dots) hängt daran.
2. **K3 — Alt-Routen:** Sind `pages/dashboard/*`, `pages/partner-dashboard/*`, `ServicesPage/CountriesPage/AdvisoryPage/PlatformPage/SolutionsPage/ResourcesPage/ComplianceAreasPage/AiGovernancePage` noch **live verlinkt**? Falls nein → entfernen statt fixen.
3. **Drawer-Kanon (K/§7):** 540px solid Slate (Memory-Spec) **oder** 520px Glass (aktueller Ist-Zustand #48/#194)? Beide existieren parallel.

---

## 4. Wurzelursachen (hier ansetzen — nicht bei den 198 Einzelbefunden)

### R1 — Dark-Mode-Token-Lücken in `index.css` (der größte Hebel)
Der `.dark`-Block überschreibt mehrere Marken-/Text-Token **nicht**, sodass sie auf Light-Werten (dunkel-auf-dunkel) hängenbleiben. **Ein Fix je Zeile erledigt dutzende Befunde:**

| Token (`index.css`) | Ist (dark) | Problem | Soll | Befunde |
|---|---|---|---|---|
| `--color-text-tertiary` :234 | `#6b7a80` (3.3:1) | „zu dunkel"-Beschwerde, ~379 Stellen | ≥ `#8a97a0` (≥4.5:1 auf #1f2937) | #60 #162 #180 |
| `--color-text-on-brand` :85 | bleibt `#ffffff` | 2.96:1 auf dark `bg-brand` #14a89a | dunkle Ink `#04140f` | #56 #108 #160 |
| `primary-600` (kein Dark-Override) | `#002e26` | Eyebrows/Links unsichtbar 1.01:1 | helle Teal-Stufe | #154 #158 |
| `--color-border-brand` :94 | Petrol #004d40 | Konturen weg im Dark | `#14a89a` | #117 |
| `--color-interactive-primary/-hover/-active`, `--color-icon-brand`, `--primary` :106/:100/:188 | Light-Petrol | dunkel-auf-dunkel | `#14a89a`-Familie | #121 |
| `--color-risk-text-on-medium/high/critical` :251-254 | `#06201a`/`#052019`/`#04140f` | 1.47–2.21:1 (dunkle Ink auf dunklem Tint) | helle Ink (Muster on-low #cfe0db = 8.55:1) | #67 |
| `bg-brand` als **Fläche** flippt auf #14a89a | Neon-Türkis-Vollflächen | Sektionen kaputt (#155/#107/#122) | Flächen-`bg-brand` im Dark auf dunkles Petrol/Forest, nicht auf die Akzentfarbe | #155 #107 #122 #66 |

Zusätzlich Asset-Ebene: World-Map-PNG (#110), Logo-Mark/Wordmark (#111/#171/#175) sind im Dark unsichtbar → theme-aware Varianten.

### R2 — Zwei Design-Sprachen (Alt-System entfernen/migrieren)
`#137fec`-Blau (37 Vorkommen, #1/#130), Material Symbols (110 Spans, #52/#79), keine Dark-Styles (#97–#106, #113–#116, #118). **Erst §3.2 klären.** Dann: tote Routen weg, lebende auf Compass-Tokens + `ui/*` + Lucide migrieren. `SectionHeading` (#100) und `GlobalNav`/`PageHeader`/`PageFooter` (#106/#1/#116) sind geteilte Alt-Bausteine — sie zuerst.

### R3 — Gold-Disziplin (K4)
Ein einziges Gold-Primitive + Lint-Regel. Gold raus aus: Risk-Status (#3), Progress (#8), Resume-Karte (#16), Avatare (#42), Primär-CTA Login (#166/#176), Pending-Badge (#177), Fokus-Border (#17). `--color-text-on-accent` = dunkle Ink überall (VERIFIED-Badge #161, Timeline-Node #123).

### R4 — Token-/Komponenten-Bypass (Konsistenz-Wurzel)
- **Typo:** 1176 arbitrary `text-[Npx]` / 40 distinkte Werte (#136/#137); selbst DS-Primitives (#139). → eine Skala, `Typography`/Token-Klassen erzwingen.
- **`tailwind.config` Fundament:** Spacing nicht-monoton (p-8=40px > p-9=36px, #125), Radius um eine Stufe verschoben (#131). **Zuerst fixen** — sonst baut jede Migration auf schiefem Grund.
- **Buttons:** 41 % Adoption, zweites `BaseButton`-Primitive (#127/#128); Varianten-Set weicht von Compass-API ab (#148).
- **Status-Farben:** rohe emerald/sky/amber statt Tokens (#7/#145), 59 handgeschriebene Farbmaps statt Badge (#146). Ursache mitnotiert: „var-color opacity is broken in this project" (#65) → RGB-Triplet-Tokens einführen.
- **Form-Controls:** `ui/Select/Textarea/FormField/Modal` haben **0 Importer** (#35) — überall roh nachgebaut, inkl. uneinheitlicher Höhen (40/44/64px, #142/#126).

### R5 — Accessibility-Baseline
- **Fokus:** kein einheitlicher `focus-visible`-Standard; `NavItem`/`DomainTab`/`ProgressSidebar` haben **gar keine** Fokus-Styles (#75/#76), `Button` nutzt `focus:` statt `focus-visible:` (#88/#149). → globaler Compass-Fokusring (2px Petrol).
- **Keyboard:** klickbare `div`s ohne Rolle/Tab/Key — betrifft den **kompletten Wizard-Frage-Layer** (`OptionCard` #71), die Alt-Nav (#74), Invoice-Rows (#181).
- **Dialoge:** `RequestQuoteModal`/`EngagementModal` ohne `role=dialog`/Escape/Focus-Trap (#73); `ui/Drawer` hat aria-modal aber **keinen Focus-Trap** (#72).
- **Icons/SR:** 110 Material-Symbols-Spans ohne `aria-hidden` (SR liest „check_circle", #79); Icon-only-Buttons ohne `aria-label` (#83).
- **Zweikanal:** Risk nur als Farbe (Domain-Dots #80, Overdue-SLA teal #179). Farbe nie einziger Träger.

### R6 — Eine Status-/Risk-Doktrin (hängt an K2)
Aktuell zwei widersprüchliche Systeme (#147/#178) → invertierte Hierarchie (#170), Alarm-Fehlnutzung (mild = rot #188, kritisch = teal #179). Nach K2-Entscheidung: **eine** `RiskBadge`/`Badge`, zweites System löschen.

---

## 5. Verbindliche Design-Prinzipien für Iteration 2

1. **Token-First, kein Hex im Komponenten-Code.** Jede Farbe/Abstand/Radius = CSS-Var/Token-Klasse. Neue Rogue-Werte sind ein Merge-Blocker.
2. **Der `.dark`-Block ist die Wahrheit für Dark Mode.** Kein Element „selbst dunkel machen" — Semantik-Token flippen lassen. Fehlt ein Dark-Wert → Token ergänzen, nicht am Element patchen.
3. **Kontrast ≥ 4.5:1 Fließtext / ≥ 3:1 große Texte & UI-Grenzen — nicht verhandelbar.** Opacity-Floor für Text auf Slate: min. `/60`.
4. **Gold = nur Verified-Partner + Monetarisierung + ein Gold-Wort pro Headline. Nie Status, nie Primär-CTA, nie Fokus. Dunkle Ink auf Gold.**
5. **Petrol = Trust/Primär-CTA; Slate #1f2937 = Dark-Standard.** Genau zwei Dark-Surfaces (#1f2937/#0f172a) + tertiär #2a3340.
6. **Eine Komponente pro Rolle.** Button/Input/Select/Badge/Drawer/Modal aus `ui/*`; keine Ad-hoc-Nachbauten. Ad-hoc = Merge-Blocker.
7. **Farbe ist nie der einzige Signalträger** (Zweikanal: + Icon/Text/sr-only).
8. **Einheitlicher `focus-visible`-Ring** auf allem Interaktiven; Tastaturbedienung = Pflicht, nicht optional.

---

## 6. Priorisierte Arbeitspakete (systemisch vor Einzelfix)

> Reihenfolge so gewählt, dass frühe Pakete spätere billiger machen. Aufwand: S < 0.5 Tag · M ≈ 1 Tag · L > 1 Tag.

**P0 — Blocker (Dark unlesbar / A11y-Barriere / Fundament):**
- **AP1 · Dark-Token-Sanierung (M).** R1-Tabelle in `index.css .dark` umsetzen + RGB-Triplet-Tokens für Opacity-Fähigkeit (#65). Fixt: #56 #60 #67 #107 #108 #117 #121 #154 #158 #160 #162 #180 u.v.m.
- **AP2 · `tailwind.config`-Fundament (S).** Spacing monoton + Radius 1:1 zur Compass-Spec (#125/#131). *Muss vor allen Migrationen laufen.*
- **AP3 · Alt-Routen-Triage (S→L).** §3.2 klären → tote Routen entfernen, sonst R2-Migration. Fixt/entfernt: #1 #97–#106 #113–#116 #130.
- **AP4 · Keyboard/Dialog-Baseline (M).** `OptionCard` + Alt-Nav keyboard-fähig (#71/#74), Focus-Trap in Drawer/Modal (#72/#73), globaler Fokusring (#75/#76/#88). 
- **AP5 · Control-Höhen/Größen (S).** Form-Controls auf 32/40/48 vereinheitlichen (#126/#142); Banner-Farbmatrix tokenisieren (#5).

**P1 — Systemische Konsistenz:**
- **AP6 · Gold-Disziplin (M).** R3 — ein Gold-Primitive, Gold aus Status/CTA/Fokus/Avatar, on-accent dunkle Ink. Fixt: #3 #8 #16 #42 #123 #161 #166 #176 #177.
- **AP7 · Risk-/Status-Doktrin (M, nach K2).** Eine RiskBadge/Badge, zweites System löschen (#147/#178/#170/#179/#188), Status via Tokens (#7/#145/#146).
- **AP8 · Rogue-Farben & Near-Blacks (M).** `#0e6450`/`#137fec`/`#e36363`/`#97C5C4`/Near-Blacks auf Tokens (#4/#11/#12/#18/#187), Token-Source-Konflikt Info-Blau auflösen (#2).
- **AP9 · Form-Control-Adoption (L).** `ui/Input/Select/Textarea/FormField/Modal` überall einsetzen (#35/#36/#37/#40/#41), aria-describedby verdrahten (#85), Labels (#86).
- **AP10 · Marketing-Dark-Reste (M).** Sektions-Headlines/Footer/Newsletter Dark-fähig (#66/#100/#118/#159), Assets theme-aware (#110/#111/#171/#175).

**P2 — Politur (gebündelt abarbeiten):**
- **AP11 · Typo-/Spacing-/Radius-Skala erzwingen (L).** 1176 arbitrary Größen → Skala (#136/#137/#139/#141/#144); ≥11px-Floor für Chips (#138/#186).
- **AP12 · SR-Semantik & Zweikanal (M).** `aria-hidden` auf Icons (#79), aria-labels (#83/#94), aria-current (#91), aria-pressed (#90), Skip-Link (#93), Zweikanal-Risk (#80).
- **AP13 · Layout-/Content-Politur (M).** Domain-Bar-Overflow (#191), FAB-Overlap (#193), Provider-Name-Truncation (#192), tote `href="#"` (#197), Notification-Rohpayloads (#183), Login-Formular-Opacity-Bug (#164), Guest-Chrome für eingeloggte User (#182).
- **AP14 · Drawer-Kanon (S, nach §3.3).** 540 solid vs. 520 glass entscheiden, dann angleichen (#38/#48/#143/#152/#194).

**Bewusst NICHT anfassen:** Google-Markenfarben im Sign-in-SVG (#27, legitime Ausnahme). Der Screenshot-Pipeline-Hinweis (#174) ist kein Produkt-Bug. Legal-Fließtexte (separater Anwalts-Track).

---

## 7. Befund-Katalog

Der vollständige, maschinenlesbare Katalog aller 198 Befunde liegt in
**`docs/audits/frontend-design-konzil-2026-07-15.findings.json`**
(Felder: `id · sev · cat · area · file · line · page · mode · element · grep · issue · expected · evidence`).

**Adressierung pro Befund (drei Anker, weil jeder allein verrottet):**
1. `file:line` — direkter Sprung (kann nach ersten Fixes veralten).
2. `grep` — stabiler Suchanker (z.B. `rg -n '#137fec' PageHeader.tsx`), überlebt Zeilenverschiebung.
3. Bei visuellen Befunden `page` + `mode` + `element` — plus Reproschritt (Dark erzwingen → Sektion → Symptom).

Kategorie-Verteilung (Top): `wcag-contrast` 11 · `missing-dark-variant` 11 · `component-bypassed` 9 · `dark-mode-token` 8 · `adhoc-rebuild` 7 · `hardcoded-token-value` 6 · `spec-violation` 6 · `keyboard-access` 5 · `no-dark-styles` 5 · `duplication` 5.

---

## Anhang A — Konzil-Protokoll (komprimiert)

- **Compass-Wächter:** Kernthese — die 198 Befunde sind Symptome von ~6 Wurzeln; Einzelfixes ohne Token-/Komponenten-Eingriff zementieren die Drift. Priorität: `tailwind.config`-Fundament + `.dark`-Token + ein Gold-Primitive. Einwand gegen A11y: „nicht 379 Stellen patchen" — im Mechanismus bestätigt (Token-Fix).
- **Accessibility-Anwalt:** Kernthese — Lesbarkeit schlägt Ästhetik; die schwersten Befunde sind unsichtbarer/kontrastschwacher Text (Tertiary 3.3:1, on-brand 2.96:1, Eyebrows 1.01:1) und die keyboard-toten Layer (Wizard, Alt-Nav). Nicht verhandelbar: AA + Zweikanal + Fokusring. Gewinnt K1 im Ziel, verliert im Mechanismus (Token statt Komponente).
- **Pragmatiker:** Kernthese — Reihenfolge & Regressionsrisiko. Erst Routing-Triage (spart evtl. 15 Fixes), dann Fundament (`tailwind.config`), dann die Token-Sanierung mit dem höchsten Fix-pro-Aufwand. Warnt vor Big-Bang-Refactor; empfiehlt paketweise + Storybook-Dark-Verifikation (jetzt vorhanden). Gewinnt K3.
- **Konsens:** Wurzelursachen vor Einzelfixes; K2 (Risk-Doktrin) und K3 (Alt-Routen) brauchen eine User-Entscheidung, bevor die zugehörigen Pakete starten.

---

## Anhang B — Kontext für die nächste Session

- **Repo:** `~/CompliHub360/platform/complihub360-alpha`, Branch `security/backend-p0-remediation`. Frontend: `apps/vs1-demo/ui`.
- **Token-Quellen:** `apps/vs1-demo/ui/src/index.css` (`:root` Light + `.dark`-Block ~Z.221-274), `tailwind.config.js`, `tokens.json`. **Achtung:** diese drei driften auseinander (#2) — Single Source herstellen.
- **Compass-Messlatte:** `.claude/skills/compass/references/{token-architecture,accessibility,component-standards,theming,naming-conventions}.md` + `assets/c360-context.md`. Skill via `Skill(compass)` laden.
- **Dark-Mapping-Doku:** `docs/backlog/app-workspace-dark-tokens.md`.
- **Theme-Engine:** `src/lib/theme.ts` (localStorage-Key + `<meta theme-color>`, letzterer noch altes Petrol #001c16, #10). App-Workspaces sind **immer dark** (`forceDark`), Marketing-Seiten haben Light/Dark-Toggle.
- **Verifikation:** Storybook-Dark-Toggle existiert jetzt (Toolbar). Staging: `https://staging.complihub360.com` (Basic Auth: Credentials in `.env.staging` → `STAGING_BASIC_AUTH`, nicht im Repo — rotiert 2026-08-09). Deploy FE: `./scripts/deploy-staging.sh`. TSC: `cd apps/vs1-demo/ui && npx tsc -b --noEmit`.
- **Harte Markenregeln:** Gold `#d4af37` nur Verified/Monetarisierung + ein Gold-Wort; Petrol `#097070/#004d40/#0e6450` = Trust/Primär; Slate `#1f2937` = Dark-Standard; Status = red/amber/green/grey; Ton „authoritative but not alarmist".

### Startprompt-Vorschlag für die neue Session

> „Wir starten Frontend-Design-Iteration 2 für CompliHub360. Lies zuerst den Konzil-Bericht `docs/audits/frontend-design-konzil-2026-07-15.md` und die maschinenlesbare `…findings.json` im selben Ordner, lade die `compass`-Skill. Entscheide mit mir zuerst die drei offenen Punkte aus §3 (Risk-Farbdoktrin, Alt-Routen-Schicksal, Drawer-Kanon). Dann arbeiten wir die Arbeitspakete §6 in Reihenfolge ab — beginnend mit AP1 (Dark-Token-Sanierung in `index.css`) und AP2 (`tailwind.config`-Fundament), jeweils systemisch, mit Storybook-Dark- und Staging-Verifikation nach jedem Paket."
