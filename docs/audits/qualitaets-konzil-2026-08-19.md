# Qualitäts-Konzil — Marketing-Fläche, 19.08.2026

Vier spezialisierte Prüfer über die laufende Anwendung **und** den Code:
Barrierefreiheit · Compass-Treue (Design-System) · Performance · SEO.

**Stand des Codes:** `main`, Branch `chore/drop-orphaned-services-ns`.
**Gemessen gegen:** Dev-Server `localhost:5173` und Staging `staging.complihub360.com`.

> **Zahlen-Vorbehalt.** Rohe-Klassen-Zählungen unterscheiden sich je nach Zählweise
> (Ring-/Gradient-/Divide-Utilities mitgezählt oder nicht): 114/88/30/37 gegen
> 135/125/53/61 in zwei unabhängigen Läufen. **Identisch in allen Zählungen und
> allein entscheidend: `dark:` = 0 auf allen vier Alt-Seiten.**

---

## 0 · Was die Nachprüfung korrigiert hat

Drei gemeldete Befunde haben der Nachmessung nicht standgehalten:

| Gemeldet | Tatsächlich |
|---|---|
| „`robots.txt` mit `Disallow: /` fehlkonfiguriert" | **Absichtlich.** `scripts/deploy-staging.sh:23` schreibt sie bei jedem Deploy, nginx setzt zusätzlich `X-Robots-Tag: noindex`. Korrekte Staging-Hygiene. Echter Punkt: für **Produktion** existiert keine robots/sitemap-Strategie — und der Prod-Deploy darf die Staging-Sperre nicht erben. |
| „10 tote `href=\"#\"` im Footer" | **Der Prüfer hatte recht — meine Gegenprobe war falsch.** Ich suchte nur nach dem JSX-Literal `href=\"#\"` und übersah die datengetriebenen `href: '#'` in der `COLUMNS`-Struktur von `SiteFooter.tsx`. Live nachgezählt: **exakt 10** (Beispielergebnis, Compliance-News, Wissensbibliothek, Tutorials, Glossar, Über uns, Vertrauen & Sicherheit, Kontakt, Karriere, Unterauftragsverarbeiter). Korrigiert am 20.08.2026. |
| Pfad `components/layout/SiteFooter.tsx` | Existiert nicht; die Datei liegt unter `components/home/`. |

Der Barrierefreiheits-Prüfer hat vier eigene Fehlmessungen selbst verworfen
(Fokusring-Kontrast, Avatar-Stapel auf Verlauf, Farb-Emoji, mobiles Menü als
vermeintliches Overlay) — dokumentiert in seinem Bericht.

**Zwei Fehler fand erst die Nachprüfung — kein Prüfer hatte sie gemeldet:**

1. **Der Magic-Link schickt jeden Nutzer nach `/en/results`.**
   `components/home/MarketsDrawer.tsx:327` liest `document.documentElement.lang`,
   das nirgends gesetzt wird. Live auf `/de` gemessen: `lang="en"`.
   Ein deutscher Nutzer landet nach der Registrierung auf der englischen Ergebnisseite.
   **Funktionsfehler im Kern-Funnel.**
2. **Die Einwilligung bei der Registrierung verlinkt ins Leere.**
   `pages/auth/RegisterPage.tsx:253-254` — AGB und Datenschutz sind `href="#"`.
   Bei einem Compliance-Produkt in der EU eine Zustimmung zu nicht abrufbaren Dokumenten.
   (Ebenso `pages/auth/LoginPage.tsx:71-73`.)

---

## 1 · Blockiert die Testphase

Was Tester unmittelbar als kaputt erleben.

| # | Befund | Messung | Ort | Aufwand |
|---|---|---|---|---|
| 1 | **Vier Seiten haben keinen Dark-Mode.** H1 unlesbar. | h1 **1.22:1**, Eyebrow **1.49:1**, Fließtext **2.19:1** | `PlatformPage`, `SolutionsPage`, `AiGovernancePage`, `ComplianceAreasPage` — je `dark:` = **0** | M (Musterarbeit) |
| 2 | **Primäre CTAs dunkel unlesbar.** `--color-text-on-brand` hat keinen Dark-Wert, `--color-bg-brand` kippt aber auf `#14a89a`. | **2.96:1** (AA verlangt 4.5) an **15** Aufrufstellen | `index.css:106` (kein Gegenstück im `.dark`-Block) | **S — eine Zeile** |
| 3 | **`lang="en"` auf allen deutschen Seiten.** | live gemessen; kein Schreiber im Code | `index.html:2` + i18n-Layer | **S** |
| 4 | **Magic-Link ignoriert die Sprache** (s. o.) | Redirect immer `/en/results` | `MarketsDrawer.tsx:327` | S |
| 5 | **Rechts-Links in der Einwilligung tot** (s. o.) | `href="#"` | `RegisterPage.tsx:253-254`, `LoginPage.tsx:71-73` | S |
| 6 | **Kein Fokus-Management in Dialogen.** Fokus bleibt beim Öffnen draußen, wandert bei offenem Dialog in die Seite dahinter, kein Rücksprung nach Escape. | `FocusTrap|inert|trapFocus` = **0** Treffer; `aria-modal` nur 2× | `components/ui/Drawer.tsx`, `MarketsDrawer.tsx` | M — **einziger Punkt, der neuen Baustein braucht** |
| 7 | Hero-Suchfeld ohne sichtbaren Fokus | `focus:outline-none` ohne Ersatz; einziger von 87 Tabstopps auf `/de` | `HomeHero.tsx:205` | S |
| 8 | Wizard-Kacheln melden ihren Zustand nicht | `role="button"` + Tastatur korrekt, aber `aria-pressed` = null | `AnimatedWizard.tsx:454-470` | S |
| 9 | Kein `<main>` auf 5 von 15 Seiten, **kein Skip-Link auf keiner** | `skip-link` = 0 Treffer | global | S |

---

## 2 · Blockiert den Start, nicht die Tests

Solange Staging auf `noindex` steht, kostet das nichts. Vor dem Livegang ist es der größte Posten.

| Befund | Messung |
|---|---|
| **Kein SSR/Prerender — jede URL liefert dieselbe leere Hülle** | identischer MD5 für `/de`, `/de/pricing`, `/tr/markets`; **2.043 Byte**, `#root` leer, **0** `<noscript>` — auf Staging *und* lokal |
| Kein Canonical, kein hreflang, keine Description, kein OG | 0 Treffer auf allen Seiten |
| **`/es` und `/tr` haben keinen crawlbaren Pfad** | Sprachumschalter ist ein `<button>` (`SiteFooter.tsx:109`) |
| 9 von 15 Seiten ohne eigenen Titel | 6 Seiten setzen `document.title`, der Rest nicht |
| **Keine Dokumentgliederung** | `/de/platform`: **11 `<h1>`, 0 `<h2>`** — „0", „100%", „<2 min" sind H1. Ursache: `variant="display"` → `h1` in `Typography.tsx:30` |
| Alte URLs antworten 200 statt 301 | `/de/countries`, `/de/services` |
| Keine robots/sitemap-Strategie für Produktion | s. Abschnitt 0 |

---

## 3 · Optimierung

| Befund | Messung | Hebel |
|---|---|---|
| **Ein einziger 2-MB-Chunk, kein Route-Splitting** | `React.lazy` = **0** Treffer im gesamten `src/`. `/de/imprint` (2.291 Zeichen Text) überträgt **741 kB** | L |
| jspdf + recharts + Supabase im Marketing-Bundle | 112 + 106 + 60 kB gzip = **278 kB von 574 kB** | **S–M, drei präzise Schnitte** |
| Bilder | 3 PNGs = 593 kB; JPEG q82 → **160 kB (−72 %)**. `loading="lazy"` = **0** Treffer. LCP-Element ist ein `aria-hidden`-Dekorbild | S |
| 1,88 MB nie referenzierte Bilder im Deploy | 3 Hero-PNGs in `public/assets/`, 32 % von `dist/` | S |
| Schriften | Inter **doppelt** deklariert; CLS **0,057** (Hero springt 57 px) | S |
| `translation.json` existiert nicht | 2 Fehl-Requests **pro Seite**, liefern `index.html` als JSON → Dauerfehler in der Konsole | S |
| `prefers-reduced-motion` ignoriert | 26× `whileInView`, `useReducedMotion` nur in 2 von 40 Dateien | M |
| `server.js` ohne Kompression und Cache-Header | `/de` würde 2.934 statt 1.462 kB übertragen. nginx-Pfad ist korrekt — zwei Auslieferungspfade unterschiedlicher Güte | S |

**Sauber:** Scroll-Reveals kosten nichts messbar (0 Frames > 33 ms bei 4× CPU-Drosselung).
lucide-react sauber getreeshakt. Nicht alle vier Sprachen werden geladen, nur die
angeforderte plus `en`. Tastaturbedienung im Kern in Ordnung. Zweikanaligkeit
(Farbe + Text) durchgehend eingehalten.

---

## 4 · Compass-Doktrin

| Befund | Messung |
|---|---|
| **Gold als dekoratives Vollflächenfeld** — größtes Einzelfarbfeld der Startseite | `EntryDoor.tsx:54`, 1440 × 1071 px = **6,7 % der Landingpage**. Der Abschnitt ist der *kostenlose* Einstieg — weder Verified-Partner noch Monetarisierung |
| **Gold als Status-/Fortschrittsfarbe** | `HomeHero.tsx:70` (aktiver Wizard-Schritt), `BrandCodePreview.tsx:69` (Badge). SKILL.md verbietet das wörtlich |
| **Risiko in Rot** | `ComplianceAreasPage.tsx:131-186` nutzt `bg-error-*` — obwohl die Petrol-Risikoskala `--color-risk-*` in `index.css:135-146` **fertig existiert** und `RiskBadge.tsx` sie implementiert. Zwei Risikosprachen im selben Produkt |
| **Petrol trägt den primären CTA nicht** | `Button.tsx:77` hartcodiert `bg-[#14a89a] text-[#04140f]`. Auf `/de` stehen zwei verschiedene Primärfarben für dieselbe Handlung |
| Fremdpaletten | `AiGovernancePage.tsx:90,97` nutzt rohe `amber-*`/`rose-*` außerhalb jeder Compass-Skala |
| Komponenten-Adoption | `<button>` 51× vs. `<Button>` 11× (18 %) · Card 13 % · `<Badge>` **0×** bei 8 handgebauten Pills · Container 25 % |
| Typo-Skala umgangen | **262** `text-[Npx]`-Einzelwerte in 25 Dateien; 23 verschiedene Schriftgrößen auf `/de` |
| Containerbreiten | 5 kanonische definiert, **mindestens 17** im Einsatz |

**Regelkonform und ausdrücklich kein Befund:** Gold auf Schritt 4 in
`MatchmakingDifference.tsx` (Engagement = Monetarisierungsmoment). `MarketsDrawer`
und `HomeFaq` als begründete Eigenbauten. `GoldWord` ist tokenisiert und
kontrastgeprüft — formal eine Ausweitung der Gold-Regel, aber bewusst und
konsistent; **zur Entscheidung vorgelegt, nicht als Fehler gemeldet.**

---

## 5 · Die drei Wurzeln

**1 · Eine fehlende Token-Zeile erklärt einen ganzen Befundblock.**
`--color-text-on-brand` hat keinen Dark-Wert → 2.96:1 an 15 Stellen → **deshalb**
hat `Button.tsx` sich mit einem Hex an der Token-Ebene vorbeigebaut → **deshalb**
steht Petrol nicht auf dem primären CTA. Eine Zeile repariert drei Symptome und
entfernt den Anreiz, das System zu umgehen.

**2 · Es ist keine verteilte Schwäche, sondern eine unvollendete Migration.**
Die vier neuen Navigationsseiten (`/how-it-works`, `/markets`, `/pricing`,
`/resources`) sind token-nativ: **null** AA-Verstöße im Dark-Mode, gemeinsame
Hero-Metrik. `/platform`, `/solutions`, `/ai-governance`, `/compliance` stammen aus
der Vor-Token-Zeit und tragen fast alle rohen Klassen, **alle** Dark-Ausfälle,
**alle** Risiko-in-Rot-Stellen. **Vier Dateien konvertieren schlägt ~370 Einzelbefunde.**
Das ist zugleich der Beweis, dass die Token-Architektur trägt, wo sie benutzt wird.

**3 · Der Weg an der Komponente vorbei ist billiger als der durch sie.**
Wo `Button`/`Card`/`Badge`/`Container` umgangen werden, entstehen *gleichzeitig*
die arbiträre Typo, die 17 Containerbreiten und der Kontrastausfall — der Nachbau
erbt die Defaults nicht. Ohne Gegendruck (Marketing-Varianten der Komponenten,
ESLint-Regel gegen rohe `text-[Npx]` und rohe Paletten-Klassen in `pages/` und
`components/home/`) reproduziert jede neue Sektion dieselben drei Befundklassen.

---

## 6 · Empfohlene Reihenfolge

1. **`--color-text-on-brand` im Dark-Block setzen** — eine Zeile, drei Symptome.
2. **`lang` aus dem Locale setzen** — eine Zeile, alle 15 Seiten, behebt zugleich den Magic-Link-Bug.
3. **Tote Rechts-Links** in Registrierung und Login auf die echten Seiten zeigen lassen.
4. **Fokus-Management in `Drawer.tsx`** — der einzige Punkt, der neue Arbeit statt einer Korrektur braucht.
5. **Die vier Alt-Seiten auf Token ziehen** — größter Posten, aber bekannte Musterarbeit.
6. Vor dem Livegang: Prerender/SSR, Canonical + hreflang, crawlbarer Sprachumschalter, Titel pro Seite, H1-Gliederung, robots + sitemap für Produktion.
7. Danach: Bundle-Schnitte, Bilder, Schriften.

---

## Nachtrag 20.08.2026 — die Risiko-Doktrin hat sich geändert

Abschnitt 4 dieses Reports führt „Risiko in Rot" als harten Doktrinbruch, und
PR #53 hat `/compliance` deshalb auf die Petrol-Skala gezogen. **Am 20.08. hat
PR #55 diese Skala durch eine Ampel ersetzt** (grün/gelb/orange/rot), mit
CVD-Analyse, dE2000-Messungen und gespiegeltem Figma. Begründung dort: „The
dashboard spec had meanwhile settled on red/amber."

Damit steht der Befund in Abschnitt 4 **nicht mehr gegen den Code, sondern
gegen eine bewusste Gegenentscheidung.** Die `--color-risk-*`-Tokens sind
weiterhin die einzige Risikoquelle — die Tokenisierung aus #53 trägt also —,
aber sie lösen jetzt zu Ampelfarben auf.

**Entschieden am 20.08.2026: die Ampel gilt überall.** Damit ist der Befund
„Risiko in Rot" in Abschnitt 4 **erledigt, nicht offen** — er beschreibt eine
Regel, die es nicht mehr gibt. Das DNA-Addendum V2 verlangt unter P0 #3
„prioritize without panic"; dem ist über die **Sprache** entsprochen, nicht über
die Farbe: die Stufen heißen seit #54 Sofort/Hoch/Mittel/Niedrig statt Kritisch,
und Bußgelder führen seit #56 keine Pflichtzeile mehr an.

Nachgezogen wurden am 20.08. alle Stellen, die noch das Gegenteil behaupteten:
`docs/design-system/compass-reference.md` (sechs Regelsätze plus datierter
Hinweis im Kopf) und die Startseite selbst — `brandCode` versprach dem Besucher
wörtlich „Kein Rot. Nie." über einem roten Badge. Die Karte heißt jetzt
„Priorität statt Panik" und sagt, was das Produkt tatsächlich tut.
