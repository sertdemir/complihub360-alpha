# Accessibility for Compass

Compass targets **WCAG 2.2 AA compliance** as a baseline. CompliHub360 customers operate in regulated environments — GDPR-sensitive sectors, EU public-sector procurement, finance, regulated e-commerce — and several have legal accessibility requirements (EU EN 301 549, BITV 2.0 in DACH). Building accessibility in from the start is cheaper and better than retrofitting.

## The non-negotiable baseline

Every Compass component must pass these checks before being considered production-ready:

### Color contrast (WCAG 2.2)

| Element type | Minimum ratio | Compass standard |
|--------------|---------------|------------------|
| Body text on background | 4.5 : 1 | Aim 7:1 where possible |
| Large text (≥18pt or 14pt bold) on background | 3 : 1 | Aim 4.5:1 |
| UI components (icons, borders, focus rings) | 3 : 1 | Aim 4.5:1 |
| Disabled element contrast | exempt — but still readable | Use opacity/muted tokens consistently |

When defining semantic color tokens, **verify contrast in every theme** (Light, Dark, High Contrast). A dark-mode token that passes in one combination may fail in another. Petrol-on-light passes; Petrol-on-dark must use the lighter petrol `#3FA3A3` per v1 Dark Mode Spec.

### Focus visibility

Every interactive element must show a clearly visible focus state when reached via keyboard. Compass focus standard (matches the v1 Border + Elevation Specs):

- **`border.medium` (2px outline)** + **`color.border.focus` (Petrol-500)** at the element edge
- **`shadow.focus`** (a 3px Petrol halo at 0.2 opacity) extending the visual focus ring beyond the border
- **Offset 2px from the element edge** so it's not absorbed by the element's own border
- **High-contrast against any expected background** — at least 3:1 against the focused element AND 3:1 against the surrounding surface
- **Never** removed in favor of hover-only feedback

Focus and hover are not the same thing. A component with hover styles but no focus styles is broken for keyboard users.

### Hit targets

WCAG 2.2 (Level AA) requires interactive targets to be at least **24×24px**. Compass standard goes higher: **44×44px for primary interactive elements** (buttons, nav items, form controls, Wizard step indicators).

Exceptions: inline links inside text, table-cell-internal controls (e.g. row-action icons in dense Provider lists). But default to generous.

For smaller-looking elements (e.g. icon buttons in toolbars), use padding to meet the hit target even when the visible icon is smaller. The v1 Typography Spec already mandates **16px button text** for tap targets — Compass enforces 44px hit area on top.

### Motion & animation

- Respect `prefers-reduced-motion` in code; in Figma, design with subtle motion as default
- No essential information conveyed only through motion
- Avoid auto-playing animations on Compliance Wizard or Results Page surfaces — these are high-cognitive-load environments

## Token-level accessibility

Build accessibility into the token layer, not into individual components.

### Semantic tokens for accessibility

Define and use these:

- `color.focus.ring` — the focus outline color (Petrol-500 in light; lighter petrol `#3FA3A3` in dark)
- `color.text.disabled` — muted but still meeting 3:1 against its background
- `color.feedback.error.foreground` — red `#B55353` (and a darker variant for AA-compliant text)
- `color.feedback.warning.foreground` — amber `#C59E38` that does **NOT** rely on color alone (always paired with icon)
- `color.feedback.success.foreground` — green `#3C8C7A`

### Color is never the only signal

Semantic feedback (error, success, warning) must be conveyed through **at least two channels**:

- Color + icon
- Color + text label
- Color + position/structure

Red borders on form fields: combine with an icon in the field and an error message below. Don't rely on color alone — it fails for color-blind users and users with low contrast.

This is doctrine because compliance UIs cannot afford ambiguity — a user who misreads a "VAT obligation triggered" warning because of color-blindness has a real-world tax problem.

## Component-level accessibility considerations

### Buttons
- Hit target ≥44×44px
- Focus state distinct from hover
- Disabled state: cursor `not-allowed`, no hover/focus response, but still readable
- Loading state: announce to screen readers in code (`aria-busy`); in Figma show spinner clearly

### Form inputs (Compliance Wizard, Engagement Request)
- Always have an associated label (visible — placeholders are not labels)
- Error messages linked to the field (`aria-describedby` in code)
- Required fields marked with both visual indicator (`*`) AND text/icon
- Helper text persists; error text replaces helper text inline
- Jurisdiction pickers and date inputs: ensure keyboard traversal of the dropdown/picker is fully supported

### Wizard navigation
- Step indicator must convey position to screen readers (`aria-current="step"` in code)
- Completed/incomplete/error states distinguishable beyond color (icon + text)
- Forward/back navigation reachable by keyboard
- Long forms broken into steps: focus moves to the first interactive element of the new step on transition

### Modals & dialogs (Engagement Modal)
- Focus moves to the modal on open; first focusable element or close button
- Focus trapped within modal while open
- ESC closes (consider in design — should there be a visible close hint?)
- Background dimmed but content remains identifiable (don't black it out completely)

### Navigation
- Skip-link to main content (mostly a code concern, but design space for it in headers)
- Current page/section indicated by more than color (icon, text weight, structural emphasis)
- Keyboard shortcuts where useful for power users (Provider Dashboard); documented somewhere

### Tables (Results Page, Provider Dashboard, Jurisdiction comparison)
- Header row visually distinct AND semantically marked (`<th scope="col">` in code)
- Sortable columns indicated with both icon and text
- Pagination controls accessible by keyboard, with clear labels (not just chevron icons)
- Row selection: checkbox column with clear label
- **Tabular numbers** (per v1 Typography Spec) ensure visual alignment but do not replace semantic structure

### Tooltips
- **Tooltips are not a substitute for labels.** Information that must be conveyed must be visible.
- Tooltips show on hover AND focus
- Tooltips remain dismissable (escape, click-away)
- Tooltips never contain only essential information

### VerifiedPartnerBadge & monetization signals
- The badge must be readable to screen readers (e.g. `aria-label="Verified Partner — accountability commitments active"`)
- Featured Partner cards (Gold border) must be distinguishable beyond color — include a "Featured" text marker so users on grayscale or with color-blindness still understand the placement is paid

## Multi-language considerations

CompliHub is multi-language. Accessibility includes:

- **Layouts breathe for German**: German words are 30%+ longer than English on average. Buttons, labels, table headers, Wizard step titles must accommodate without truncation. The v1 Typography Spec's `line.height.relaxed` (1.6) supports this.
- **EU coverage**: French, Spanish, Italian add their own length and accent variations. Plan for them in component max-widths.
- **Don't bake text into images.** Icons are fine; text-as-image is not.
- **RTL readiness**: even if CompliHub doesn't ship Arabic/Hebrew today, MENA e-commerce expansion is plausible. Build component auto-layouts so they could mirror later. Use Figma's "horizontal padding > start/end" semantics in code-mind.
- **Locale-formatted compliance data**: VAT amounts, dates, jurisdiction codes — all rendered with locale-aware formatters (numerus, percent, currency) and the `font.feature.tabular` token for alignment.

## Storybook a11y enforcement

`apps/vs1-demo/ui/package.json` includes `@storybook/addon-a11y` and `@storybook/addon-vitest`. This means:

- A11y rules are checked at the Storybook story level, not just at design time
- Components shipped without a passing a11y story are in violation of Compass standards
- Compass should reference a11y addon outputs as part of the component review checklist

## Documentation in components

Every component's Figma description should include an **Accessibility notes** section. See `references/documentation.md` for the template.

Typical content:
- Required ARIA attributes (when implemented in code)
- Keyboard interactions
- Screen reader behavior
- Focus order

## Verification checklist before shipping a component

- [ ] All text-on-background combinations meet 4.5:1 (or 3:1 for large text)
- [ ] Focus state is visible, distinct from hover, meets 3:1, uses `color.border.focus` + `shadow.focus`
- [ ] Hit targets ≥44×44px (or documented exception)
- [ ] No information conveyed by color alone (status, Verified-Partner, error)
- [ ] Disabled state still readable (3:1 minimum)
- [ ] All interactive states defined for keyboard, not just pointer
- [ ] Error states pair color with icon and text
- [ ] German-length content fits without truncation
- [ ] Documented accessibility notes in Figma description
- [ ] Storybook a11y addon passes for the corresponding `apps/vs1-demo/ui/...` component story

## When accessibility conflicts with brand

It rarely does, but when it does: **accessibility wins**. The Petrol may need a darker variant for use as text color on light backgrounds; the Petrol on dark mode must shift to `#3FA3A3` for contrast (already encoded in v1 Dark Mode Spec). The Accent-Gold may need a higher-contrast partner color for AAA contexts. These adaptations are how a brand survives contact with reality. Document them.

The CompliHub brand promise is *trust*. Accessibility is part of trust — a beautifully branded CTA that excludes a Compliance Officer with low vision violates the brand more than a less-elegant accessible alternative.
