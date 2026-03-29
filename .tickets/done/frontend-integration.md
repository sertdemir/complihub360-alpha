---
title: Frontend Integration (Hero & Wizard)
assignee: frontend-specialist
status: done
---

# Ticket: Frontend Integration (Hero & Wizard)
Implement the "Search-to-Unlock" orchestrator frontend tasks.

**Tasks:**
1. **HeroSection.tsx (`apps/vs1-demo/ui/src/components/layout/HeroSection.tsx`)**
   - Implement Auth Gate check in `onClick` for primary CTA. If logged in -> `/wizard`, else -> `/register` with intent redirect.
2. **ResultsOverview.tsx (`apps/vs1-demo/ui/src/pages/ResultsOverview.tsx`)**
   - Call Supabase Edge Function `POST /search`.
   - Add "Request consultation" button to Provider cards.
3. **EngagementModal.tsx (`apps/vs1-demo/ui/src/components/...`)**
   - Build 2-step Engagement Modal.
   - Submit calls `POST /engagement` Edge Function.

## Agent Result / Execution
Implemented dynamic routing for "Request expert match instantly" in HeroSection based on mock `localStorage` auth token. Updated `RegisterPage` and `LoginPage` to resolve `redirect` query parameters using `useLocation`. Rewrote `EngagementModal` to feature a multi-step experience including optional timeline, budget, and company size data collection.

## Agent Audit Log
- [2024-03-23T22:05:00Z] **Antigravity**: Completed frontend routing, modal updates, and mock auth state. (Status: DONE)
- [$(date)] **Task-Master**: Created ticket (Status: waiting)
