# Documentation Standards for Compass

A component without documentation is a riddle. Compass components are documented **in Figma** so that consumers (designers, devs, PMs) understand the component without having to read the source.

## What gets documented

Every published component, every published variable collection, every meaningful pattern. Documentation lives in the Figma component description (and supporting documentation pages where helpful).

## The component description template

Use this structure in every component's Figma description:

```
{Component Name}

{One-line purpose: what this component is and why it exists.}

When to use
- {Use case 1}
- {Use case 2}
- {Use case 3}

When not to use
- {Anti-pattern or wrong context 1}
- {Anti-pattern or wrong context 2}

Properties
- {property name}: {what it controls, what values}
- {property name}: {...}

Composition (if applicable)
- {Sub-component}: {role}
- {Sub-component}: {role}

Accessibility
- {Keyboard interactions}
- {Screen reader behavior / ARIA notes}
- {Focus order considerations}

Storybook mapping
- React component: {ComponentName}
- Path: apps/vs1-demo/ui/src/components/ui/{name}.tsx
- Code Connect: apps/vs1-demo/ui/src/components/ui/{name}.figma.tsx
- Notable prop differences: {if any}

Last updated: {YYYY-MM-DD}
```

Not every section is required for every component. Foundation components (Spacer, Divider) don't need much. Complex components (DataTable, ProviderCard, Wizard) need everything.

## Worked example — Button

```
Button

Trigger an action. The most common interactive element in any CompliHub360 surface.

When to use
- To execute an action ("Engagement Request senden", "VAT-Schwelle prüfen", "Compliance-Bereich auswählen")
- To navigate to a new view when navigation is the primary goal
- For form submissions in the Compliance Wizard

When not to use
- For navigation that is part of an information hierarchy (use Link instead)
- For toggle-like behavior (use Switch or Toggle)
- For destructive actions on critical data without confirmation (wrap in a confirmation Modal — e.g. canceling an in-flight Engagement Request)

Properties
- style: primary | secondary | tertiary | danger | ghost — visual emphasis
- size: sm | md | lg — physical size and target area
- isDisabled: prevents interaction; communicates "not currently available"
- isLoading: shows spinner; prevents interaction; preserves button width
- leftIcon: optional icon before label (lucide-react)
- rightIcon: optional icon after label
- label: button text (always required, except in IconButton)

Accessibility
- Hit target ≥44×44px in all sizes
- Visible focus ring (border.medium 2px Petrol + shadow.focus halo per v1 Border + Elevation specs)
- Disabled state: cursor not-allowed; in code, aria-disabled rather than disabled attribute when label communicates state
- Loading state: in code, aria-busy="true"; label remains readable; spinner replaces left icon position

Storybook mapping
- React component: Button
- Path: apps/vs1-demo/ui/src/components/ui/button.tsx
- Code Connect: apps/vs1-demo/ui/src/components/ui/button.figma.tsx
- Notes: leftIcon and rightIcon are React nodes; label maps to children

Last updated: 2026-05-02
```

## Worked example — VerifiedPartnerBadge (doctrine-critical)

```
VerifiedPartnerBadge

Mark a provider as a Verified Partner — visually anchors CompliHub's monetization and accountability promise. The Accent-Gold token (color.brand.partnerBadge) is reserved for this and related Featured-Partner contexts only; never use it for status semantics.

When to use
- On ProviderCard, in the header slot, when the provider has active accountability commitments
- On the Provider Profile page, next to the provider name
- In Featured Partner cards (where the parent ProviderCard also uses the Gold border per Border Spec)

When not to use
- For status feedback (success/warning/error) — use Alert / status tokens instead
- As a decorative accent — Verified Partner is a regulatory accountability claim, not a visual flair
- Inline within body copy — the badge is a structural marker, not running-text decoration

Properties
- size: sm | md | lg
- withIcon: boolean (default true)

Accessibility
- aria-label: "Verified Partner — accountability commitments active" (or localized equivalent)
- Color is not the only signal: text label "Verified" + icon are required
- Contrast: foreground text against Gold-500 background must meet 4.5:1 — verified for neutral.900 text

Storybook mapping
- React component: VerifiedPartnerBadge
- Path: apps/vs1-demo/ui/src/components/ui/verified-partner-badge.tsx
- Code Connect: apps/vs1-demo/ui/src/components/ui/verified-partner-badge.figma.tsx

Last updated: 2026-05-02
```

## Documentation for variable collections

Each variable collection should have a documentation page in Figma explaining:

- What this collection contains
- What naming convention applies
- Examples of correct usage
- Examples of incorrect usage (anti-patterns)
- Theme mode coverage

Place at the top of the collection's page in the C360 Design System file.

For Compass specifically, surface the doctrine constraints in the documentation:
- The Accent-Gold collection must explicitly state "Reserved for Verified-Partner / Featured-Partner contexts. Not a status color."
- The Petrol collection must state "Primary brand identity color. Used for primary CTAs and brand authority moments. Don't dilute by using as decorative accent."

## Documentation pages — when to add them

Most components are documented in their description. But when a topic spans multiple components, add a dedicated documentation page in the C360 Design System file:

- **Token Architecture** — explains the three-layer system in context
- **Theming Guide** — how to use modes (Light / Dark / High Contrast)
- **Composition Patterns** — Card composition, FormField composition, ProviderCard composition
- **Density Guide** — comfortable vs. compact (Wizard vs. Provider list)
- **Iconography** — lucide-react icon library, sizing, semantic icon meanings
- **Motion** — easing curves, duration tokens, when animation is appropriate
- **Monetization Signals** — how Verified-Partner / Featured-Partner / Engagement-Request are styled and why

Documentation pages live under a dedicated `🧭 Documentation` page section in the file.

## Tone of voice in documentation

- **Clear, direct, brief.** Designers and devs are skimming.
- **Show, don't just tell.** Where possible, include a small visual example or anti-example.
- **No marketing speak.** "Powerful, beautiful, easy-to-use Button" — no. "Trigger an action" — yes.
- **English by default** for technical documentation. The system itself can render German UI; the system's documentation is in English to stay consistent across global teams (DACH, Iberia, Latin America, MENA).
- **Reference the source spec** when a value is anchored on a v1 spec — e.g. "padding 24px (per Spacing Spec v1, ResultCard rule)". This keeps documentation traceable.

## Versioning notes

When a component changes meaningfully:

- Update `Last updated:` date
- Add a brief note at the top of the description if breaking: "v2 (2026-05-02): renamed `intent` property to `style` for consistency. Code consumers must update."
- Don't keep deep changelogs in component descriptions; that's what version control is for. Just flag the most recent breaking change.

## What documentation must NOT do

- Don't document implementation details that are unstable. ("Uses inner padding of 8px" — this changes with density modes.)
- Don't document things the user can see at a glance. The properties panel already shows variants; describe their *purpose*, not their *existence*.
- Don't paste long usage code. Link to Storybook (`http://localhost:6006/?path=/docs/...` once Storybook is published) instead.
- Don't add documentation to placeholder/draft components. Only finished components get full descriptions.

## Documentation review checklist

Before considering a component "documented":

- [ ] Single-line purpose at the top
- [ ] "When to use" with at least 2 cases
- [ ] "When not to use" with at least 1 case
- [ ] All public properties listed with what they do
- [ ] Sub-components listed if compositional
- [ ] Accessibility notes present
- [ ] Storybook mapping noted with `apps/vs1-demo/ui/...` path (or marked "TBD" if not yet implemented)
- [ ] Code Connect path noted
- [ ] `Last updated` date set
- [ ] If the component touches Petrol or Accent-Gold tokens: doctrine note ("Petrol / Verified-Partner Gold reserved for…") is included
