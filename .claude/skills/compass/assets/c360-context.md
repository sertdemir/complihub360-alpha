# CompliHub360 Context for Compass

This file is the foundational context for the Compass design system. Read it first whenever the Compass skill activates.

## Company

**CompliHub360** is a **Compliance Orchestration Platform** — a structured decision engine that transforms regulatory uncertainty into trusted specialist engagement. It is **not** a directory, **not** a content blog, **not** a law firm — it defines a new category, the *Compliance Orchestration Layer* between businesses and regulatory complexity.

**Domain reality:**
- **B2B Marketplace, three-sided** — businesses (buyers), verified specialists (providers), platform (orchestrator/escrow of accountability)
- **Cross-border focus** — international e-commerce, SaaS expanding internationally, agencies managing regulated clients, manufacturers entering EU markets
- **Regulatory surface area**: VAT thresholds, EPR (Extended Producer Responsibility), GDPR, packaging laws, advertising restrictions, jurisdiction-specific data protection
- **Provider segment**: compliance consultancies, law firms, tax specialists, data protection officers, specialized agencies
- **Regulated-industry adjacency** — many customers are themselves serving GDPR-sensitive sectors

**What this means for Compass:**
- UIs will be **data-dense** — Results pages with sortable provider lists, multi-step Compliance Wizards, complex filters, structured comparison tables, jurisdictional metadata everywhere
- **Multi-language** is not optional — DE, EN at minimum; FR/ES/IT realistic in roadmap; RTL-readiness (MENA e-commerce) prudent
- **Long sessions** — Compliance Officers and finance leads spend hours navigating obligations, so clarity, low cognitive load, and accessibility matter more than novelty
- **Trust > delight** — the brand promise is "from uncertainty to structured compliance action", not "we're fun"
- **Two commercial layers visible in the UI**: information (laws, guides, structured intake) and engagement (verified-partner badges, monetized lead routing). Visual design must distinguish them honestly.

## Brand

**Festlegung 2026-11-28 — Aktion, Fokus, Auswahl tragen Tinte, nicht Petrol.** Petrol/Teal ist die Knopffarbe fast jeder KI- und SaaS-Seite; CompliHub soll unverwechselbar sein.
- **Hauptknopf (Primary)**: Tinte `#1B2A41` mit weißem Label (14,44:1), im Dark Mode Pergament `#E9E4D3` mit Tinten-Label (11,35:1). Unten eine 3px **Messing-Kante** (`#C5913B`, dunkel `#8C672A`) mit einem Lichtreflex („Glint“): zwei Durchläufe beim Erscheinen, danach nur bei Hover/Fokus, keine Dauerschleife, `prefers-reduced-motion` statisch, Disabled ohne Kante. Radius: App 10px, Marketing-CTA 14px (`radius/cta`).
- **Fokus-Ring**: Tinte / Pergament (`color/border/focus`), nicht Petrol.
- **Auswahlzustände** (Checkbox/Toggle/Radio an, gewählter Chip, aktiver/erledigter Schritt, aktive Tabs und Navigation, gewählte Option, Pagination, gewählter Kalendertag): `color/selected/default`, `…/on`, `…/subtle` — Tinte / Pergament.
- **Petrol bleibt** Markenfarbe: Logo, Flächen, Gradient, Icons, Headlines, Datengrafik, Fortschritt. Gold bleibt Akzent und Kante, nie Knopffläche (Festlegung 2026-09-20).
- Code: `bg-action`, `text-fg-on-action`, `.btn-action-edge`, `bg-selected`, `text-selected`, `ring-stroke-focus` in `apps/vs1-demo/ui`. Figma: `color/action/*`, `color/selected/*`, `ink/*`, `parchment/*`, `brass/*`.

**Identity colors (from the v1 Color Specification):**
- **Petrol — Trust & Authority**: `#004D40` (`primary-500`). The signature brand color. Brand identity and structural authority (logo, surfaces, headlines, data viz). **Not** the primary CTA, focus or selection color since 2026-11-28 — those are Ink (see above). **Do not dilute** by using it for decoration.
- **Accent Gold — Premium / Verified Partner**: `#D4AF37` (`accent-500`; brand gold `#C5913B` for the logo "360", gold text and the brass edge). Reserved **exclusively** for Verified-Partner badges and monetization-signal elements (Featured Partner cards may use the gold as border-color). **Never use as a UI status color.**
- **Neutrals** (as shipped, cool slate/gray): white / `#FAFAFA` (surfaces), `#F4F4F5` (`neutral-100`, subtle fills), `#E5E7EB` (borders), `#0F172A` (primary text), `#5F5B5B` (secondary text). Dark mode is slate `#1F2937`. The warm v1 neutrals (`#EFE8E8`, `#2B2B2B` …) were never shipped.
- **Tinted surfaces**: the "Gradient" `linear-gradient(165deg, #EAF3F1 0%, #DDECE8 55%, #E9E4D3 100%)` (CLAUDE.md) — the v1 Surface Muted `#BFD6D5` was never shipped.
- **Status semantics (separate from brand)**: success `#3C8C7A`, warning `#C59E38`, error `#B55353`. These have their own scales — they are **not** the accent gold.

**Typography character (from the v1 Typography Strategy):**
- **IBM Plex Serif** — brand/headlines: conveys authority, expertise, institutional trust. Used for Display, H1, H2, H3.
- **IBM Plex Sans** — UI/copy/data: ensures readability and technical precision. Used for body, UI, captions, table content.
- Modular scale **1.25** (suited to data-dense enterprise UIs)
- **Tabular numbers** mandatory for compliance data (VAT thresholds, fees, jurisdiction codes) — vertical alignment in tables is a usability requirement, not a stylistic one
- Generous line-height for German body copy (`relaxed` ≈ 1.6)

**Tone of voice:**
- **Calm, Structured, Precise, Authoritative but not alarmist**
- Confident, knowledgeable, partner-not-vendor — *"From uncertainty to structured compliance action."*
- **Avoids**: fear-based marketing, overpromising, legal-advice tone (CompliHub orchestrates; it does not opine on the law)
- **References sources** wherever it makes claims

**What Compass must preserve:**
- Petrol as the **Trust-Anchor** — concentrated on brand moments; actions, focus and selection speak **Ink + Brass edge**
- Accent-Gold strictly as **Premium / Verified-Partner marker** — distinct from semantic UI tokens
- Calm, restrained visual language with controlled accent usage — Compass is not a flashy consumer system
- Excellent multi-language support (German is verbose; layouts must breathe)
- Honesty in monetization signaling — paid placements should be clearly visible, not disguised

## The C360 Design System Figma file

- **URL**: https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl/C360---Design-System
- **File ID**: `a4BeKbsBGoHkcudhKXUJTl`
- **Name**: "C360 - Design System" (the file) builds → Compass (the system)
- **Maturity**: Mixed — Color, Typography, Spacing, Border, Elevation specs exist as v1 documents in `GoogleDrive_Docs/Design System-* v1.md`. Translation into Figma variables/components is partial. Always inspect before building.
- **Authority**: Single Source of Truth for any CompliHub360 surface. No off-system divergence.

## Naming clarification

**Compass** (the skill / the system): chosen as a navigation metaphor — Compass guides users through compliance complexity, mirroring CompliHub360's Brand Essence as a *structured decision engine*.

The naming separates concerns cleanly:
- **CompliHub360** = the platform / the company
- **C360 Design System** = the Figma file
- **Compass** = the design system itself (component namespace, tokens, doctrine)

If Compass ever becomes a public-facing design system, scope it as `Compass by CompliHub360`. Not a current concern.

## Inspirational references (not to be copied — to be learned from)

These are the three systems Compass draws lessons from. **Each contributes a different lesson.** Compass is its own system, not a clone.

### Atlassian Design System — for token discipline & component API
- **Why**: Atlassian runs Confluence, Jira, Bitbucket — multi-product, B2B, complex workflow tools. Adjacent to CompliHub's marketplace + workflow domain.
- **Lesson taken**: Token naming philosophy (semantic over literal), component API discipline (consistent properties across components), multi-product token-layer architecture.
- **Lesson NOT taken**: Their visual language (too Atlassian-blue).

### IBM Carbon — for data density & enterprise patterns
- **Why**: Carbon was built for IBM's enterprise software — data tables, complex forms, dashboards, regulated industries. CompliHub's Results Page and Provider Dashboard are precisely this territory.
- **Lesson taken**: Layer-token architecture (Layer 01/02/03 for elevation without shadows), data-table standards, form patterns, density modes — all directly applicable to Wizard panels, Filter sidebars, Provider lists.
- **Lesson NOT taken**: Carbon's specific visual aesthetic (their blacks are very black; we need the warm, restrained CompliHub neutrals).

### shadcn/ui — for component composition & Storybook-readiness
- **Why**: Compass components are implemented in `apps/vs1-demo/ui/` as React components using **shadcn/ui style "new-york"** (configured in `apps/vs1-demo/ui/components.json`). shadcn is not just an inspiration — it is the actual code substrate.
- **Lesson taken**: Composition patterns (Slot, asChild, sub-components like `Card.Header`/`Card.Body`), prop API design, code-first thinking. Direct Storybook mapping is achievable because the React layer is already shadcn-shaped.
- **Lesson NOT taken**: The visual style (very minimal black-and-white) — we are a CompliHub system with our own brand.

## Code target

Compass components are implemented in **Storybook 10 + React 18** in `apps/vs1-demo/ui/`. This influences how we design in Figma:

- **shadcn/ui base**: `components.json` declares style `"new-york"`, base color `neutral`, CSS-variable theming, component alias `@/components/ui`
- **Tailwind**: `tailwind.config.js` is the token bridge. CSS variables drive theming.
- **Code Connect**: `figma.config.json` already wires `*.figma.tsx` files via the React parser — Compass components should ship with Code Connect mappings
- **Storybook**: `@storybook/react-vite` with `addon-a11y`, `addon-vitest`, `addon-docs` — accessibility is enforced at the dev loop, not just at design time
- **Icons**: `lucide-react` (also declared in `components.json` as `iconLibrary`)
- **Component properties should map cleanly to React props** — variants → string union props, booleans → boolean props
- **Variants must be orthogonal** (each variant = one prop dimension), not combinatorial
- **Slots map to children/named slots** (`children`, `leftIcon`, `rightIcon`, etc.)
- Avoid Figma-only tricks that don't translate (random nested overrides without component properties)

When relevant, the `figma-code-connect` skill maps Figma components to existing code under `apps/vs1-demo/ui/src/**/*.figma.tsx`.

## What to remember at all times

1. CompliHub360 is **enterprise B2B marketplace + workflow**, not consumer.
2. **Petrol = Trust-Anchor (brand)**, **Ink = action, focus, selection**, **Accent-Gold = Verified-Partner only + brass edge on primary buttons, never a button fill**.
3. **German text is long** — layouts must breathe.
4. **Trust through restraint** — the brand whispers, doesn't shout. Never alarmist, never legal-advice tone.
5. Compass ships to Figma **and** to `apps/vs1-demo/ui/` Storybook (React + shadcn) — design with both in mind.
6. **Compliance data is high-stakes** — precision, source-referencing, and accessible disclosure beat visual flair every time.
