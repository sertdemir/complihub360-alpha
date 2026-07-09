# Enterprise Doctrine for Compass

This is the design philosophy behind Compass. Read this when making strategic decisions: what pattern to choose, how strict to be, how much novelty to allow.

## The Compass stance

**Compass is an enterprise compliance design system that prioritizes clarity, scalability, and trust over novelty.** Compliance Officers, finance leads, and provider-side specialists spend hours per day in CompliHub360 doing high-stakes work. Every UX decision is judged by: *does this reduce the user's cognitive load on hour six of an audit-preparation day?*

This is the opposite stance from a consumer system that wants to delight in 10-second interactions. Both are valid; Compass is the former.

A second axis: **honest monetization design**. CompliHub360 is a marketplace with a "Search-to-Unlock" model. The UI must clearly distinguish information (laws, guides, structured intake) from commercial engagement (Verified-Partner badges, Featured Partner cards, Engagement Requests). Compass treats this distinction as a first-class system concern, not as a marketing concern.

## The three-system mix

Compass draws from three reference systems, each contributing a distinct lesson. **No single system is "the answer".** When making a decision, consult the relevant lesson:

### When deciding HOW to name & layer tokens → think Atlassian

Atlassian Design System has the most disciplined token semantic naming in the industry. Their key principle: **tokens are named for purpose, not appearance**. So instead of `color-petrol-500` (in components) you have `color.action.primary.background.default`. Why this matters: when CompliHub introduces a sub-brand (e.g. a co-branded compliance partner), or reskins for a regional market, the token name still describes its job correctly.

Apply this to Compass:
- Semantic tokens are named by **role**, not by **value**
- `color.surface.subtle` not `color.neutral.50`
- `color.text.primary` not `color.neutral.900`
- `color.brand.partnerBadge` not `color.gold.500`
- Primitive tokens still describe values (`color.petrol.500`, `color.gold.500`) — they're the source layer

### When deciding HOW to handle data density & elevation → think Carbon

Carbon Design System solved a problem most consumer systems don't face: **how do you indicate hierarchy in a UI that's mostly flat tables and panels, where you can't lean on shadows because they're too playful for enterprise?** Their answer: **Layer tokens** (Layer 01, Layer 02, Layer 03) — surfaces at progressive elevation expressed through subtle background changes, not shadows.

This maps directly to CompliHub:
- **Results Page** = page surface + Provider cards + sidebar filters → Layer 01/02
- **Compliance Wizard** = page surface + wizard shell + step panel → Layer 01/02/03
- **Engagement Modal** = the only place a real shadow (`shadow-lg`) is appropriate

Apply this to Compass:
- Define `color.surface.layer.01`, `02`, `03` for nested surfaces (page → card → modal-on-card)
- Use shadows sparingly and only for true overlays (Engagement Modals, Popovers, Dropdowns)
- Tables, panels, and Wizard shells get hierarchy through layer tokens + 1px borders, not heavy shadows
- In Dark Mode, replace shadows with **Elevation Borders** entirely (per the Elevation Spec v1.0)

### When deciding HOW to compose components → think shadcn

shadcn/ui represents the current state-of-the-art in component composition — and it is the actual code substrate Compass ships into (`components.json` declares style `"new-york"`). Two big ideas:

**1. Sub-components over monolithic props.** Instead of `<Card title="..." subtitle="..." actions={...} content={...} />`, you have `<Card><CardHeader><CardTitle>...</CardTitle></CardHeader><CardContent>...</CardContent></Card>`. The component is a structure, not a configuration object.

**2. Composition primitives (Slot pattern).** A button can wrap any element via `asChild`, letting it be a Link, a Form submit, anything — without adding new props. CompliHub's Engagement Request CTA is a textbook use case: same Button styling, sometimes a `<button>`, sometimes a `<Link>`.

Apply this to Compass in Figma:
- Components should expose meaningful sub-component slots where appropriate (`Card.Header`, `Card.Body`, `Card.Footer` as nested instances)
- Avoid prop-explosion. If a component has more than ~6 properties, it's probably trying to do too much — split it.
- Map cleanly to `apps/vs1-demo/ui/src/components/ui/` — every Compass component should have a clear React equivalent path

## When to break the doctrine

Doctrine is a default, not a prison. Break it when:

- **The CompliHub brand demands it.** The Accent-Gold is a brand identity / monetization color, not a semantic role. Treat it differently than the doctrine might suggest.
- **The user explicitly overrides.** Senior designers know their context.
- **The pattern is genuinely novel and the doctrine doesn't cover it.** Then propose, reason, decide together.

## Anti-patterns the doctrine forbids

These are flagged on sight (gentle warning, then defer to user):

1. **Hex codes inside components.** Always tokens.
2. **Variants like `primary-large-disabled-icon`.** That's four orthogonal axes; they should be four properties.
3. **Drop-shadow as the only hierarchy signal in dense UI.** Layer tokens come first, shadows are reserved for true overlays.
4. **Component descriptions that are just the component name.** Description must explain *when to use*.
5. **Naming components after appearance** (`PetrolButton`) instead of role (`PrimaryButton`).
6. **One-off spacing values.** Always from the 8px-base scale (with 4px micro-unit).
7. **Fonts not bound to text styles.** Always typography variables/styles.
8. **The Accent-Gold used as a status color.** It is a Verified-Partner / monetization signal, period.
9. **Fear-based or legal-advice copy in default content.** "WARNING: VAT non-compliance!" → use calm, structured language.

## Density decisions

CompliHub surfaces split cleanly into two density profiles:

- **Comfortable** (default): generous spacing, big hit targets — landing page, marketing surfaces, Compliance Wizard (high-intent input deserves breathing room)
- **Compact**: tighter spacing — **Results Page provider lists**, **Provider Dashboard tables**, jurisdiction-by-jurisdiction comparison views. These are power-user surfaces where vertical density is a feature, not a bug.

When designing components, consider whether they need density variants from the start. Tables, lists, form rows, and Result cards almost always do. Buttons, modals, and Wizard step panels usually don't.

## The Storybook bridge mindset

Every component built in Compass will be implemented in Storybook (React) under `apps/vs1-demo/ui/`. Design with that in mind:

- **Properties = props**: Boolean properties → boolean props. Variant properties → string union props.
- **Slots = children**: Sub-components map to React children or named slots.
- **States = state**: Hover, focus, active, disabled — these are not Figma variants in the traditional sense, but interactive states the code will handle. We design them in Figma so devs know what they look like, but they're not API surface.
- **Code Connect**: Compass components should ship with `*.figma.tsx` mappings (see `figma.config.json`). The mapping is part of the component's definition of done.

Rule of thumb: **if a Figma property would be confusing as a React prop, redesign the property.**

## Honest monetization in the design layer

CompliHub is paid by providers via Verified-Partner placements and Engagement Request fees. Compass enforces honest signaling:

- **Verified-Partner badges** are visually distinct (Accent-Gold, never confused with status semantics)
- **Featured Partner** cards may use Gold border-color (`accent-500`) per the Border Spec, but must remain identifiable as paid placements
- **Engagement Requests** (the primary monetized action) use the Petrol primary CTA — clearly the most prominent action on a Provider profile, no ambiguity
- **Information vs commercial** layers must remain visually distinguishable — the user should never confuse a regulatory excerpt with a paid recommendation

This is doctrine because regulatory transparency is non-negotiable in a compliance product. Misleading design here is reputational risk.
