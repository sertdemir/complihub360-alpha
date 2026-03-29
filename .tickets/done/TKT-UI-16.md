---
title: "Fix LandingPage white background"
assignee: "Repo-Master"
status: "done"
area: "UI"
---

# TKT-UI-16: Fix LandingPage White Background

## Objective

The LandingPage was rendering with a white/light background because the Tailwind class `bg-[#f6f7f8]` was used as the default (light-mode) background, and the `dark:bg-[#0b1117]` modifier only activates when a `.dark` class is present on the `<html>` element — which was not set. The result was a visually broken, fully white page for users.

## Acceptance Criteria

- [x] LandingPage background is consistently dark (`#0b1117`) regardless of system color scheme
- [x] No regression to layout or text contrast
- [x] Verified in browser at `http://localhost:5173/`

## Technical Details

**File changed:** `apps/vs1-demo/ui/src/pages/LandingPage.tsx`

**Change made:**
```diff
- <div className="bg-[#f6f7f8] dark:bg-[#0b1117] font-['Inter'] text-slate-900 dark:text-slate-100 ...">
+ <div className="bg-[#0b1117] font-['Inter'] text-slate-100 ...">
```

**Root Cause:** No global dark-mode toggle (`.dark` class injection) was implemented. Since the design is intentionally dark-only, the `dark:` modifier was removed and the dark colour hardcoded.

## Agent Result / Execution

Repo-Master fixed the background class directly in `LandingPage.tsx`. Vite HMR applied the change immediately. Verified via browser screenshot — dark background confirmed.

## Agent Audit Log

- [2026-03-09T22:52:00+01:00] **Task-Master**: Created ticket, assigned to Repo-Master. (Status: doing)
- [2026-03-09T22:53:00+01:00] **Repo-Master**: Fixed `bg-[#f6f7f8]` → `bg-[#0b1117]` in LandingPage.tsx. (Status: done)
- [2026-03-09T22:53:00+01:00] **QA-Master**: Visual verification via browser screenshot — green. (Status: done)
