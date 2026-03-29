# **CompliHub360 — Results Page Architecture**

Version: 1.0

Audience: UX, Product, Engineering, Growth

---

# **1\. Purpose**

The Results Page is the core conversion surface of CompliHub360.

It must achieve four goals:

1. Deliver high quality answers (grounded sources)  
2. Provide clear next steps (actions)  
3. Enable monetization without destroying trust  
4. Work consistently across all categories and countries

---

# **2\. Page Type Decision**

Decision: **Dedicated Results Page** (Step 4 of Wizard)

Reason:

• more complex content combinations

• needs navigation \+ persistence

• supports share/export

• supports dashboard “edit” gating

---

# **3\. Layout System**

The Results Page uses a 3-column layout.

## **Left Sidebar (Refine & Navigate)**

• Result navigation

• Filters

• Wizard summary \+ refinement entry points

## **Main Content (Tabs)**

• Content results by type

• Structured and scannable blocks

## **Right Sidebar (Providers)**

• Provider monetization area

• Featured partner providers

• Primary CTA

---

# **4\. Global Header**

Always visible.

Header elements:

• Logo

• Country selector (locked during results, editable in dashboard)

• Search input (optional quick search)

• Account entry (sign in / dashboard)

---

# **5\. Left Sidebar Architecture**

The left sidebar is split into two layers:

## **Layer A — Session Summary**

A compact summary of the user’s wizard state.

Contents:

• Selected country

• Selected category

• Key answers (3–5 compact pills)

Action:

• “Refine” button (gated)

Unregistered:

• Refine opens registration prompt

Registered:

• Refine opens wizard edit mode (dashboard)

---

## **Layer B — Filters**

Filters change results inside the current session.

Filters depend on result type.

### **Provider Filters**

• Partner only (toggle)

• Region / coverage

• Languages

• Response SLA (fast responders)

• Specialization tags

### **Content Filters**

• Source type (official / blog / video)

• Freshness (last 30/90/365 days)

• Language

---

## **Layer C — Navigation**

A short nav list to jump between tabs.

Example:

• Providers

• Laws & Regulations

• Guides

• Tutorials

• Tools

---

# **6\. Main Content Architecture (Tabs)**

Tabs are always visible.

## **Tab 1 — Overview (Default)**

Purpose:

Provide a structured summary and recommended next step.

Blocks:

1. Risk Summary Card  
2. Key Obligations List  
3. Recommended Actions (CTA block)  
4. Top 3 reference links

---

## **Tab 2 — Providers**

Purpose:

Enable discovery and selection of providers.

Content:

• provider grid (non-partners included)

• each card shows minimal details

CTA rules:

• Secondary CTA always available

• Primary CTA only available for partners

---

## **Tab 3 — Laws & Regulations**

Purpose:

Grounded authoritative sources.

Content:

• official gov sources

• EU regulations

• authorities

Each entry:

• title

• snippet

• link

• jurisdiction tag

---

## **Tab 4 — Guides**

Purpose:

Educational content for self-help.

Content:

• structured guides

• checklists

• platform guides

---

## **Tab 5 — Tutorials**

Purpose:

Video learning.

Content:

• YouTube or other platforms

• compliance tutorials

---

## **Tab 6 — Tools**

Purpose:

Fast actionable helpers.

Content:

• calculators

• templates

• checkers

---

# **7\. Right Sidebar Architecture (Providers)**

The right sidebar is a persistent monetization panel.

## **Slot 1 — Featured Provider (Partner)**

• Partner badge

• specialization

• Primary CTA

## **Slot 2 — Alternative Partner**

Same structure.

## **Slot 3 — Upgrade CTA (If user clicks primary limit)**

If user exceeds primary CTA allowance:

• show “upgrade plan”

• show pricing

---

# **8\. Provider Card Component Standard**

Provider card must support both partners and non-partners.

Fields:

• Provider name

• Country coverage

• Specialization tags

• Summary line

• Trust signals (badge/ratings)

Buttons:

• Secondary (Website) — always

• Primary (Request) — partner only

---

# **9\. Engagement Modal (Primary CTA)**

Triggered from:

• Right Sidebar

• Provider Cards

Steps:

1. Minimal message  
2. Optional expansions  
3. Confirmation state

Provider confirmation:

• via magic link

• recorded in user account

---

# **10\. Monetization Rules**

## **Secondary**

• always enabled

• affiliate tracking

## **Primary**

• monetized per lead fee

• only available for partner providers

## **Leakage Prevention**

• hide direct email/phone

• discourage bypass

• confirm request only within platform

---

# **11\. Export Rules**

Unregistered:

• allow PDF export

• encourage registration for edit/save

Registered:

• save session

• edit wizard answers

---

# **12\. Event Tracking**

Key events:

• results\_viewed

• tab\_switched

• filter\_applied

• provider\_card\_viewed

• primary\_clicked

• secondary\_clicked

• engagement\_submitted

• provider\_confirmed

---

# **13\. Acceptance Criteria**

The Results Page is complete if:

• all categories map into the same component system

• tabs work and display content types

• provider monetization logic enforced

• unregistered vs registered gates work

---

(End of Results Page Architecture Document)