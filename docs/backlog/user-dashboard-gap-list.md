# User Dashboard · Gap List (reconciled after Drawers board + Library)

> **✅ BUILT IN FIGMA (2026-06-19)** — page "Dashboards" (`1199:404`), section `▣ USER` (`2647:3`): empty-home · 5 domain workbenches · Notifications (feed) · Saved Providers (cards) · Exports (table) · Settings (hub) · Alerts/Calendar (coming-soon) — each Desktop + Mobile. User drawers in section `▣ DRAWERS` (`2647:4`). See [[state_dashboard_gap_build]].


Screen-by-screen review (2026-06-19). Inventory: Figma `1199:404` · drawers `2071:44` · library `2277:3924`.

## ⚑ DESIGN DIRECTIVE (user, 2026-06-19)
**Every editable field, detail view, configure step or overlay = a right-side DRAWER / side-sheet — never a new page.** Pattern reference: board **`2071:44` "User · Drawers"** (dark ~420px drawer: eyebrow + title + ✕ · content · footer with Close/Cancel + primary action). Build each drawer for **Desktop AND Mobile**. Only genuine nav destinations stay full pages.

## Slim sidebar (revealed by Library frame `2277:3924`)
WORKSPACE: Dashboard · Sessions · Requests · **Notifications** · LIBRARY: **Library** ✅ · SAVED: **Saved Providers · Exports** · MONITORING (SOON): **Alerts · Calendar** · footer: user + ⚙ settings.

---

## ✅ Already designed as DRAWERS on board `2071:44`
- **Refine your Tax & VAT answers** (edit-answers) → resolves UD-2
- **Register Partita IVA / Schedule EPR / Set up OSS filing** (next-step detail) → resolves "Recommended next step → Open"
- **Your Tax & VAT compliance plan** (full roadmap) → resolves "See full plan"
- **Italy · VAT** country threshold detail → resolves threshold-monitoring "Detail"
- **Configure Tax & VAT alerts** → resolves UTX-4
- **Studio Bianchi SRL** provider profile + **Request quote** → resolves UTX-1 (and the provider side of UR-2)

## ✅ Already designed as FULL PAGES
- **Library / Knowledge hub** `2277:3924` (Desktop + Mobile) → resolves UTX-2

---

## Remaining gaps

### Full pages (nav destinations — must exist as frames)
| # | Missing page | Why | Status |
|---|---|---|---|
| UH-1 | **Notifications feed** | Sidebar "Notifications (2)" — user bell feed; no frame. | 🔴 |
| UP-1 | **Saved Providers** | Sidebar "Saved" → list of bookmarked providers; no frame. | 🔴 |
| UP-2 | **Exports** | Sidebar "Saved" → exports/downloads list; no frame. | 🔴 |
| UH-2 | **Settings / Account** | Bottom ⚙ + mobile "More"; profile/account/subscription/sign-out; no frame. | 🔴 |
| UDH-1 | **Domain workbenches ×5** | Product&Packaging · Data&Privacy · Marketing&SEO · Corporate&Structure · Full Support (only Tax&VAT `2051:60` exists). Templated off Tax&VAT. | 🔴 |
| MON-1 | **Alerts (MONITORING · SOON)** | Sidebar "Alerts" — coming-soon / primer state. | 🟡 |
| MON-2 | **Calendar (MONITORING · SOON)** | Sidebar "Calendar" — coming-soon / primer state. | 🟡 |

### Drawers still to design (per directive — Desktop + Mobile)
| # | Missing drawer | Why | Status |
|---|---|---|---|
| DR-1 | **Request thread / proposal (user-side)** | "Open / View thread" → see provider proposal, accept/negotiate. Mirror of Provider request-detail, as a drawer. (UR-1) | 🔴 |
| DR-2 | **Document upload / restore** | Workbench "Upload / Restore" doc actions. (UTX-3) | 🔴 |
| DR-3 | **Session "…" actions + delete-confirm** | Rename / Duplicate / Export / Delete. (US-1) | 🟡 |
| DR-4 | **Request "…" actions + re-route + send-reminder confirm** | (UR-3) | 🟡 |
| DR-5 | **Global search** | Topbar search → results drawer. | 🟡 |

### States (no new pages)
| # | Missing state | Why | Status |
|---|---|---|---|
| ST-1 | **Empty Home** | First-time user, no sessions/requests. (UH-3) | 🔴 |
| ST-2 | **Empty Sessions / Requests** | (US-2 / UR-4) | 🟡 |
| ST-3 | **Empty domain workbench** | CLEAR / no-sessions domain. (UDH-2) | 🟡 |
| ST-4 | **Session-detail tab panels** | Providers/Laws/Guides/Tutorials/Tools (inline tab content, Providers → provider drawer). (UD-1, UD-3) | 🟡 |
