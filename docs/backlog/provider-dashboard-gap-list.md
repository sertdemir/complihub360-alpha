# Provider Dashboard · Gap List (missing / forgotten screens)

> **✅ BUILT IN FIGMA (2026-06-19)** — all gaps below produced as frames on page "Dashboards" (`1199:404`). Drawers (16, Desktop 540 + Mobile 390) in section `▣ DRAWERS` (`2647:4`). Provider states/pages in section `▣ PROVIDER` (`2647:2`): billing-normal · workspace-locked · post-downgrade · empty-performance · public-profile. See [[state_dashboard_gap_build]].


Running list built during the screen-by-screen review (2026-06-19). Captures
screens/states that exist in the product logic but have **no Figma frame yet**.
Source inventory: Figma node `1199:404` · IA: `dashboard-ia.md`.

Status legend: 🔴 missing (needs design) · 🟡 to confirm · ✅ resolved/exists

## ⚑ DESIGN DIRECTIVE (user, 2026-06-19)
**Every editable field, detail view, configure step or overlay = a right-side DRAWER / side-sheet — never a new page** (pattern: board `2071:44` "User · Drawers"; build Desktop AND Mobile). States (empty / error / locked) stay inline on their page. Only genuine nav destinations + the client-facing public profile stay full pages.

Classification of the gaps below:
- **Drawers:** R-1 search · R-2 help · D-1 reply/proposal · P-3 why-this-matters · C-1 add-market · C-3 ranking-impact · B-3 invoice-detail · N-2 bell-popover · S-1 destructive-confirm · S-2 change-email · S-3 recovery/2FA
- **Inline states (no new frame-as-page, but a state):** D-2 responded/closed · P-1 post-downgrade · P-2 empty-perf · B-1 normal-billing · B-2 workspace-locked · N-1 empty · C-2 languages/SLA sections · S-4 mobile availability · R-3 out-of-office
- **Full page (exception):** C-4 public profile preview (client-facing)

---

## Surface: `/requests` (list · default landing)
Existing frames: Desktop `1908:16` · Mobile `2207:7350`
Existing states: First-Request empty `1916:300`/`2207:6619` · Pending-Verification `1916:152`/`2217:10459`

| # | Missing screen / state | Why it's needed | Status |
|---|---|---|---|
| R-1 | **Search overlay / results** | Search icon present in topbar; IA §3 calls for "search across requester, country, category" — no frame exists. | 🔴 |
| R-2 | **Help & support** | Sidebar item present ("Help & support") but no destination screen. Decide: full page, panel, or external/mailto. | 🔴 |
| R-3 | **Out-of-office (active) state** | "Out of office" toggle exists; the active state (banner, SLA-pause note to user, list treatment) has no frame. | 🔴 |

---

## Surface: `/requests/[id]` Request Detail
Existing frames: Desktop `1908:242` · Mobile `2217:10343` — **only the `awaiting_confirmation` state** (Confirm + Decline + Quick Facts).

| # | Missing screen / state | Why it's needed | Status |
|---|---|---|---|
| D-1 | **Reply / Proposal state** (after confirm) | Proposal form — price · timeline · deliverables + attachment upload. Core PJ-3 surface ("proposal trail stays on-platform"); no frame exists. | 🔴 |
| D-2 | **Responded / Closed state** | Read-only detail after proposal sent — `responded` / `closed` / `expired` lifecycle end. | 🔴 |

_Not taken (optional): Decline-reason sheet (mobile) + post-decline confirmation; attachment-redaction-in-progress micro-state (IA N6)._

## Surface: `/performance`
Existing frames: Desktop `1911:183` · Mobile `1927:39` · Pre-downgrade-**warning** state `1916:13`/`1927:113` ✅

| # | Missing screen / state | Why it's needed | Status |
|---|---|---|---|
| P-1 | **Post-downgrade / rank-dropped state** | The *pre*-downgrade warning exists; PJ-6 needs the state **after** a downgrade/rank drop — "exactly why it happened". | 🔴 |
| P-2 | **Empty / no-data state** | Brand-new partner without enough history — KPIs/ranking show "not enough data yet". | 🔴 |
| P-3 | **"Why this matters" ranking explainer** | Panel/modal explaining the ranking logic (linked from Ranking transparency). | 🟡 |

## Surface: `/coverage`
Existing frames: Desktop `1911:12` · Mobile `1927:185` — Public identity · Markets · Domains · gold opportunity strip.

| # | Missing screen / state | Why it's needed | Status |
|---|---|---|---|
| C-1 | **Add-market flow / re-verification confirm** | "+ Add market" + the 2-business-day re-verification trigger need a picker + confirm dialog. | 🔴 |
| C-2 | **Languages + SLA-target sections** | IA §3 lists "Markets · Domains · Languages · SLA-target"; frames show only Markets + Domains. Below-fold or missing — confirm. | 🟡 |
| C-3 | **"View ranking impact" panel** | Header button exists; the impact-preview panel/modal has no frame. | 🟡 |
| C-4 | **Public-profile preview (client-facing)** | "Preview public profile" opens the public partner profile — likely a separate, not-yet-designed screen. | 🔴 |

## Surface: `/billing`
Existing frames: Desktop `1911:370` · Mobile `1927:281` — **only the payment-failure state** (red banner + failed invoice row).

| # | Missing screen / state | Why it's needed | Status |
|---|---|---|---|
| B-1 | **Normal / healthy billing state** | The default — no banner, all invoices "paid". Only the failure variant exists today. | 🔴 |
| B-2 | **Workspace-locked (day-8) state** | IA §3/§4 Q7: after day 8 the workspace locks, requests stop routing, only Billing tab accessible. Distinct screen. | 🔴 |
| B-3 | **Invoice detail / line-items** | "click any row for PDF + line items" → invoice detail / PDF preview. | 🔴 |

_Not taken: Update-payment-method flow (Stripe-hosted / external)._

## Surface: `/notifications`
Existing frames: Desktop `1914:152` · Mobile `1927:371` — full event feed with type filters + grouped days.

| # | Missing screen / state | Why it's needed | Status |
|---|---|---|---|
| N-1 | **Empty state** | "All caught up" / no notifications yet. | 🔴 |
| N-2 | **Bell popover / quick-peek** | Topbar quick-dropdown (IA "in-app bell") vs the full page only. | 🟡 |

## Surface: `/settings/*`
Existing frames (all complete): Profile `1914:2` · Security `1918:18` · Notifications `1918:164` · Integrations `1918:400` · Team/WK3 `1920:22` · Workspace `1920:154` · Mobile sub-pages `2043:138`/`2043:194`/`2043:258`/`2044:44`/`2044:98`/`2044:159` · Mobile list (= "More" tab) `2277:4146`.
The 6 sub-pages themselves are complete — gaps are the referenced **interaction modals/flows**, not full pages.

| # | Missing screen / state | Why it's needed | Status |
|---|---|---|---|
| S-1 | **Destructive-confirm modals** | "Delete workspace + account · MODAL" and "Pause workspace" have buttons but no confirm modals. | 🔴 |
| S-2 | **Change-email + verify flow** | Subcopy: "sensitive changes trigger email confirmation" — the verify step has no frame. | 🔴 |
| S-3 | **Recovery-codes view / regenerate + 2FA re-setup (QR)** | Security "View · Regenerate" and 2FA "Change" open modals with no frame. | 🟡 |
| S-4 | **Mobile availability / out-of-office toggle** | Present only in desktop topbar; not reachable anywhere on mobile (overlaps R-3). | 🟡 |

---

# Summary — Provider Dashboard gaps (review complete · 2026-06-19)

**21 gaps captured** across 7 surfaces. 🔴 = must-design · 🟡 = confirm/optional.

| Surface | Gaps | Must-design (🔴) |
|---|---|---|
| `/requests` | R-1 search · R-2 help · R-3 out-of-office | all 3 |
| `/requests/[id]` | D-1 reply/proposal · D-2 responded/closed | both |
| `/performance` | P-1 post-downgrade · P-2 empty/no-data · P-3 why-this-matters | P-1, P-2 |
| `/coverage` | C-1 add-market/re-verify · C-2 languages+SLA-target · C-3 ranking-impact panel · C-4 public profile preview | C-1, C-4 |
| `/billing` | B-1 normal state · B-2 workspace-locked · B-3 invoice detail | all 3 |
| `/notifications` | N-1 empty · N-2 bell popover | N-1 |
| `/settings` | S-1 destructive modals · S-2 change-email verify · S-3 recovery/2FA · S-4 mobile availability | S-1, S-2 |

**Next:** User Dashboard review → then build every gap as a Figma frame (Desktop + Mobile) so no screen is missing for live-system comparison.
