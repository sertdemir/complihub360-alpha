---
title: "Refactor Existing Wizard to Design System"
assignee: "UI-Builder"
status: "todo"
---

# TKT-UI-26: Refactor Existing UI

## Objective

Refactor the previously generated onboarding wizard layout and pages to exclusively utilize the defined design system (Tokens, Atoms, Molecules).

## Acceptance Criteria

- [ ] Wizard Sidebar navigation replaced by `ProgressSidebar`.
- [ ] Headings and body texts across Wizard replaced with `Typography`.
- [ ] Any generic selection interfaces replaced with `OptionCard`.
- [ ] Call-to-actions replace with standard `Button` component forms.
- [ ] Pro-tip sections replaced with `ProTipCard`.

## Design / Tech Details

No standard styling should leak. Everything must funnel through the unified semantic architecture so that applying theme changes globally instantly impacts these screens.

## Agent Audit Log
- [2026-03-13T14:50:00] **[Task-Master]**: Ticket created. (Status: todo)
