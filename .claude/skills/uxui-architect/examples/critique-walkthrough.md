# Example: Critique-Walkthrough

**User-Anfrage:** "Critique meine ComplianceAreasPage."

## Schritt 1: Pre-Flight

```
- Read apps/vs1-demo/ui/src/pages/ComplianceAreasPage.tsx
- Read apps/vs1-demo/ui/src/components/compliance-areas/ (alle Files)
- mcp__figma-desktop__get_variable_defs        → DS-Tokens
- Read apps/vs1-demo/ui/tokens.json            → Code-DS
- Read GoogleDrive_Docs/Dashboard Component System.md
- Read this skill's heuristics.md
- Glob apps/vs1-demo/ui/public/locales/**/*.json (für i18n-Check)
```

## Schritt 2: Heuristik-Pass

Beispiel-Output (anpassen an tatsächlichen Code):

### 🔴 Blocker

1. **Hex-Farbe in Header-Background**
   `ComplianceAreasPage.tsx:34` — `bg-[#1a1a1a]`. Tokens sagen `bg-surface` → `#18181b`.
   Fix: `<div className="bg-surface ...">`

2. **Fehlender Empty-State**
   Wenn `areas.length === 0`, rendert die Page nur einen Spinner und dann eine leere Liste.
   User sieht "nichts" und weiß nicht warum.
   Fix: `<ComplianceAreasEmpty onCreate={...} />` einbauen (siehe build-walkthrough).

3. **Kein i18n für Card-Title**
   `:67` — `<h2>Active Areas</h2>` hardcoded.
   Fix: `<h2>{t('complianceAreas.list.title')}</h2>` + Strings in beiden Locales ergänzen.

### 🟡 Should-fix

4. **Custom Button statt `Button`-Komponente**
   `:89` — `<button className="bg-primary px-4 py-2 ...">`. DS hat `Button` mit Variants.
   Fix: `<Button variant="primary">{t('...')}</Button>`.

5. **Loading-Spinner statt Skeleton**
   Bei `isLoading` rendert ein zentrierter Spinner. Bei längeren Loads (> 300ms) wirkt das
   wie Stillstand. List-Skeleton zeigt Struktur und gefühlte Geschwindigkeit ist besser.
   Fix: 3-4 Skeleton-Cards mit `animate-pulse`.

6. **Mobile: kein Responsive-Breakpoint**
   Grid ist hart `grid-cols-3`. Auf < 768px werden Cards zu schmal.
   Fix: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`.

### 🟢 Nice-to-have

7. **Mikrocopy-Schwäche**: "Areas Management" ist generisch. Brand Guide will aktivere Sprache.
   Vorschlag: "Compliance-Bereiche" / "Compliance Areas".

8. **Motion**: Card-Hover hat keine subtle Transition — `transition-colors` reicht für
   konsistentes Feel.

## Schritt 3: Top-3-Hebel

> Wenn du nur 3 Sachen heute machst:
> 1. Empty-State einbauen (Blocker — schlechte UX bei Erstnutzung).
> 2. Hex-Farben gegen Tokens tauschen (zieht sich durch ganze Datei, jetzt fixen ist billiger).
> 3. i18n-Lücken schließen (Release-Blocker für DE-Markt).

## Schritt 4: Drift-Check

> DS-Figma-Variables vs. tokens.json:
> - `--color-surface` Figma: `#18181b` ✅ matcht.
> - `--color-fg-muted` Figma hat sich auf `#a1a1aa` geupdatet, tokens.json hat `#71717a`. Drift.
> - Action: tokens.json nachziehen.
