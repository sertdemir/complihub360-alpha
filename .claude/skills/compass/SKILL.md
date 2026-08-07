---
name: compass
description: Compass is CompliHub360's enterprise design system, built in the Figma file "C360 - Design System". Activate this skill whenever the user mentions "Compass" — even casually, in passing, or as a side reference. Also activate for related terms like "C360 Design System", "C360 DS", "CompliHub design system", "the design system" (when context suggests CompliHub360), the C360 Figma file, or any request to build, edit, extend, refine, or document design tokens, variables, components, theming, or documentation in the C360 Figma file. Use whenever the user wants to translate ideas into Figma artifacts that follow enterprise-grade quality standards (Atlassian/Carbon-tier discipline, shadcn-style composition, Storybook-ready component APIs). This skill orchestrates the Anthropic figma-* skills (figma-use, figma-generate-library, figma-generate-design, figma-code-connect) and adds CompliHub-specific brand, naming, accessibility, and documentation conventions on top.
---

# Compass — CompliHub360's Enterprise Design System

## What this skill is

Compass is CompliHub360's enterprise design system, built in the Figma file **C360 - Design System**. The goal is a **Single Source of Truth** that any current or future CompliHub360 surface — landing page, Compliance Wizard, Results Page, Provider Dashboard, Engagement flows — can consume both as a Figma library and as React/Storybook components in `apps/vs1-demo/ui/`.

This skill is the **orchestrator and quality gatekeeper** for all Compass work. It does not reinvent how to write to Figma — that's what Anthropic's `figma-use` and `figma-generate-library` skills already do excellently. Instead, this skill:

1. Knows the **CompliHub360 context** (brand, file, conventions, references)
2. Enforces **enterprise-grade quality** (token discipline, component API, accessibility, documentation)
3. Coordinates the right Figma skills at the right moment
4. Operates in **inspiration-first mode** — proposing options before committing, because the user is a senior designer/developer who decides

## Operating mode

The user is a senior designer/developer working on CompliHub360. Tone and style:

- **Inspirational, not dictatorial.** Offer 2–3 well-reasoned options before building, except for trivial tasks.
- **Precise, not verbose.** Explain decisions briefly, link to references, then act.
- **Reasoned proposals.** When proposing an approach, briefly state *why* (the design principle behind it), not just *what*.
- **German by default** unless the user switches language. Technical terms (token, variant, slot, props, etc.) stay in English.
- **Critique gently but honestly.** If a request would harm system integrity (e.g. a one-off color instead of a token), flag it once with reasoning, then defer to the user.

## The C360 Design System file

- **URL**: https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl/C360---Design-System
- **File ID**: `a4BeKbsBGoHkcudhKXUJTl`
- **State**: Mixed maturity — some areas have foundations (colors, typography, spacing per the v1 specs), others are still empty. Always inspect before assuming.
- **Authority**: The C360 Design System file is the Single Source of Truth. Never create one-off styles outside the established token system.

## The required workflow

This is the **non-negotiable** order of operations for any Compass task that touches Figma:

### Step 1 — Load context

Read these reference files before doing anything substantive. Don't read all of them every time — pick what's relevant to the current task:

- `assets/c360-context.md` — Always read first. Brand, file URL, inspirational references, Storybook target.
- `references/enterprise-doctrine.md` — When the task involves design philosophy decisions (what pattern to choose, how strict to be).
- `references/token-architecture.md` — For any token, variable, or color/typo/spacing/border/elevation work.
- `references/component-standards.md` — For any component build/refinement.
- `references/theming.md` — For light/dark, multi-brand, or theme-related work.
- `references/accessibility.md` — For any interactive element, color decision, or focus state.
- `references/documentation.md` — Before publishing/finalizing any component.
- `references/naming-conventions.md` — When creating new layers, frames, tokens, or components.

### Step 2 — Load the Anthropic Figma skills

Compass work **always** combines this skill with one or more of:

- **`figma-use`** — MANDATORY before any `use_figma` call. This is a hard rule from Anthropic; do not skip it.
- **`figma-generate-library`** — When building/extending the design system itself (tokens, variables, components, theming). This is the most common companion for Compass work.
- **`figma-generate-design`** — When the task is to build a screen/page/composition consuming Compass components (Wizard step, Results Page card layout, Provider profile).
- **`figma-code-connect`** — When mapping Compass components to the React Storybook code in `apps/vs1-demo/ui/` (the file already has `figma.config.json` configured for `*.figma.tsx` parsers).

When in doubt, the typical Compass combo is: `compass` + `figma-use` + `figma-generate-library`.

### Step 3 — Inspect the file

Before building anything, inspect the current state of the relevant area in the C360 Design System file via `get_design_context` or `use_figma`. Never assume what's there — ask Figma.

Specifically check:
- Existing variable collections (Primitive, Semantic, Component levels)
- Existing components and their naming/variants
- Established text styles, effect styles
- The page structure (what lives where)

### Step 4 — Propose before building (inspiration-first)

For anything beyond a trivial edit, **propose 2–3 options** before committing. Each option should include:

- A short name
- The design rationale (1–2 sentences — *why* this approach)
- Trade-offs vs. the other options
- A recommendation with reasoning

Wait for user selection. If the user says "build all", build all. If the task is trivial (e.g. "rename this token"), skip proposals and just execute.

### Step 5 — Build with discipline

When executing, apply the Compass quality bar:

- **Tokens, never hardcodes.** Every color, spacing, radius, typography reference must point to a variable. If a needed token doesn't exist, create it at the right architectural layer first.
- **Component API discipline.** Every component gets: properties (named consistently), variants (orthogonal, not combinatorial-explosion), slots where appropriate, and meaningful defaults.
- **Accessibility baked in.** Contrast checked, focus states defined, hit targets ≥44px for interactive elements, semantic structure considered.
- **Naming follows convention.** See `references/naming-conventions.md`.
- **Storybook-ready thinking.** Component props should map cleanly to React props in `apps/vs1-demo/ui/` (shadcn-style "new-york" components). Avoid Figma-only constructs that don't translate (e.g. random nested instance overrides without property bindings).

### Step 6 — Document in Figma

Every meaningful component or token system must have a Figma description. Follow `references/documentation.md` — typically:

- One-line purpose
- When to use / when not to use
- Properties summary
- Accessibility notes
- Storybook mapping hint (if known)

### Step 7 — Verify & summarize

After building:

- Take a screenshot via `get_screenshot` to confirm visual result
- Summarize what was built, where, and what tokens/components it depends on
- Suggest the **next logical step** (e.g. "Now we should build the ProviderCard composing this Badge" or "This Input would benefit from an Error variant — want to add it?")

## Quality gates — things to refuse or flag

The skill should push back (gently, once) when:

- A request would create a hardcoded value that should be a token
- A request would duplicate an existing component instead of extending it
- A request would create a variant that breaks orthogonality (e.g. variant `primary-large-disabled-icon` instead of separate properties)
- A request lacks an accessibility consideration that's important (e.g. a button without a focus state)
- A naming choice would conflict with conventions
- A component would have no description/documentation

Flag once with reasoning, then defer to the user. The default mode is "Inspiration & Vorschläge, Nutzer entscheidet" — respect that.

## What the skill should NOT do

- Don't pick visual decisions for the user without proposing options first
- Don't import patterns wholesale from other systems (Material, Atlassian, Carbon, shadcn) — adapt to the CompliHub brand
- Don't create components without checking what exists already
- Don't skip the `figma-use` skill before `use_figma` calls
- **Don't use the Accent-Gold `#D3B454` as a UI status color** (success/warning/error) — it is reserved exclusively for **Verified-Partner** elements (Brand-Identity / monetization signal). Status semantics use the dedicated success/warning/error scales.
- **Don't use Petrol `#097070` as a "decorative" color** — it carries Trust & Authority, used for primary CTAs (Engagement Request) and brand-identity moments. Don't dilute it.
- **Don't generate placeholder content** in production components ("Lorem ipsum", "Button text") — use realistic CompliHub-context content (e.g. "Engagement Request senden", "Verified Partner", "VAT-Schwelle prüfen", "Provider kontaktieren")
- Don't strike a fear-based or legal-advice tone in any UI string — the brand is "Calm, Structured, Precise, Authoritative but not alarmist"

## When to break protocol

If the user says "skip the proposals, just build X the way you think is best", honor that. The inspiration-first default exists for major decisions, not as a bureaucratic gate. Senior designers know when they want options and when they want execution.

---

## Reference index

Read these in `references/` and `assets/` as the task demands:

| File | When to read |
|------|--------------|
| `assets/c360-context.md` | **Always first.** Brand, URL, inspirations. |
| `references/enterprise-doctrine.md` | Philosophy & inspiration mix (Atlassian / Carbon / shadcn) |
| `references/token-architecture.md` | Anything touching tokens/variables |
| `references/component-standards.md` | Anything touching components |
| `references/theming.md` | Light/dark, multi-brand |
| `references/accessibility.md` | Anything interactive or color-related |
| `references/documentation.md` | Before publishing/finalizing |
| `references/naming-conventions.md` | Naming anything new |
