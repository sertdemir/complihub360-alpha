---
title: "Build Global PageFooter Component"
assignee: "UI-Master"
status: "done"
area: "UI / Layout"
---

# TKT-UI-18: Implement Global PageFooter with Newsletter Signup

## Objective

The application had no consistent footer. Some pages had minimal inline footers (basic copyright), others had nothing. The user requested a premium global footer with:
- Brand column with description and social icons
- 4 link columns: Platform, Company, Legal, Support
- Newsletter subscription box ("Compliance Digest")
- Bottom bar with copyright and privacy-first badge

## Acceptance Criteria

- [x] Single shared `PageFooter` component created at `components/layout/PageFooter.tsx`
- [x] 4 link columns: Platform, Company, Legal, Support
- [x] Newsletter signup with email input, subscribe button, and success state
- [x] Bottom bar: copyright year (dynamic) + privacy badge
- [x] Integrated into: LandingPage, ServicesPage, CountriesPage, AdvisoryPage
- [x] Old minimal inline footers removed from all pages
- [x] Verified in browser

## Technical Details

**New file:** `apps/vs1-demo/ui/src/components/layout/PageFooter.tsx`

**Key implementation:**
- `useState` for email + subscription success state
- `onSubmit` handler with success feedback (no backend yet — UI-only)
- Dynamic `new Date().getFullYear()` for copyright year
- Dark background `bg-[#070d12]` slightly deeper than page background

**Footer link sections:**
```
Platform:  Services, Countries, Advisory, Compliance Wizard
Company:   About, How it works, Pricing, Blog
Legal:     Privacy Policy, Terms, Cookie Policy, GDPR Compliance
Support:   Help Center, Contact Us, Status, Developer API
```

**Files modified:**
- `LandingPage.tsx` — PageFooter added
- `ServicesPage.tsx` — old `<footer>` replaced
- `CountriesPage.tsx` — old `<footer>` replaced
- `AdvisoryPage.tsx` — old minimal footer replaced

## Agent Result / Execution

UI-Master created `PageFooter.tsx` and integrated it into all 4 public pages. Newsletter subscribe form includes a success state ("You're subscribed — thank you!"). Browser verification confirmed the footer is visible and consistent on all routes.

## Agent Audit Log

- [2026-03-09T22:57:00+01:00] **Task-Master**: Created ticket, assigned to UI-Master. (Status: doing)
- [2026-03-09T23:05:00+01:00] **UI-Master**: Created `PageFooter.tsx` with newsletter, 4 link columns, bottom bar. (Status: done)
- [2026-03-09T23:05:00+01:00] **Repo-Master**: Replaced old inline footer code in all 4 pages. (Status: done)
- [2026-03-09T23:10:00+01:00] **QA-Master**: Footer verified on all 4 routes, newsletter success state confirmed. (Status: done)
