# **CompliHub360 — Results Component System**

Version: 1.0

Audience: UX, UI, Frontend, Design Systems

---

# **1\. Purpose**

This document defines a **single reusable component system** that can render:

• all categories (VAT, EPR, Data & Privacy, Marketing & SEO, Corporate, Product & Packaging, Full Support)

• all result types (Providers, Laws, Guides, Tutorials, Tools)

Goal:

• consistent UI

• faster iteration

• fewer unique screens

• Stitch generation that stays “one system, many instances”

---

# **2\. Top-Level Layout Components**

## **2.1 ResultsShell**

Wraps the entire results page.

Slots:

• HeaderSlot

• LeftRailSlot

• MainSlot

• RightRailSlot

States:

• Loading

• Empty

• Error

---

## **2.2 ResultsHeader**

Purpose:

Persistent context \+ navigation.

Elements:

• Logo

• Country badge

• Category badge

• Optional quick search field

• Account entry (Sign in / Dashboard)

---

## **2.3 LeftRail**

Purpose:

Refine and navigate results.

Contains:

• SessionSummaryCard

• FilterStack

• TabJumpNav

---

## **2.4 MainTabs**

Purpose:

Switch between content types.

Tabs:

• Overview

• Providers

• Laws

• Guides

• Tutorials

• Tools

---

## **2.5 RightRail (ProviderRail)**

Purpose:

Monetization rail.

Contains:

• FeaturedProviderSlot (1–2)

• LeadLimitGateCard (optional)

• UpgradeCard (optional)

---

# **3\. Core Data Rendering Model**

Everything in the results tabs is rendered using two foundational components:

1. ResultList  
2. ResultCard (via type variants)

---

# **4\. ResultList**

## **Purpose**

A generic list renderer.

Props (conceptual):

• items\[\]

• cardVariant

• sort

• filters

• emptyState

Behavior:

• supports pagination (later)

• supports skeleton loading

---

# **5\. ResultCard (Base)**

## **Purpose**

One visual language for all result types.

Base slots:

• Title

• Subtitle

• MetaRow

• Snippet

• Tags

• Actions

Supported states:

• Normal

• Featured

• Disabled

---

# **6\. ResultCard Variants**

## **6.1 ProviderCard**

Use when: showing a service provider.

Fields:

• Provider name

• Coverage (country/region)

• Specialization tags

• Short summary

• Trust signals (badge)

Actions:

• Secondary CTA (Website) — always

• Primary CTA (Request) — partner only

Optional:

• “Fast response” indicator (text-only)

---

## **6.2 SourceCard**

Use when: laws / regulations / official sources.

Fields:

• Source title

• Jurisdiction tag

• Authority tag

• Snippet

• Link

Actions:

• Open link (external)

---

## **6.3 GuideCard**

Use when: blogs, guides, checklists.

Fields:

• Guide title

• Publisher

• Reading time (optional)

• Snippet

Actions:

• Read guide

---

## **6.4 TutorialCard**

Use when: YouTube or video content.

Fields:

• Title

• Channel

• Duration

• Snippet

Actions:

• Watch

---

## **6.5 ToolCard**

Use when: calculators, templates, checkers.

Fields:

• Tool name

• Purpose

• Input requirements

Actions:

• Open tool

---

# **7\. Overview Tab Components**

The Overview tab is a composition of fixed blocks.

## **7.1 RiskSummaryCard**

Purpose:

Provide high level classification.

Elements:

• Risk level (text)

• Why (3 bullets)

• What to do next (2 bullets)

---

## **7.2 KeyObligationsList**

Purpose:

Highlight obligations.

Format:

• 3–7 items

• each item: obligation \+ short reason

---

## **7.3 RecommendedActionsPanel**

Purpose:

Present next steps.

Contains:

• Primary recommendation (provider request)

• Secondary actions (read guide, view laws)

---

## **7.4 ReferenceLinksStrip**

Purpose:

Show grounded sources.

Rules:

• max 3 links

• must be real URLs

---

# **8\. LeftRail Components**

## **8.1 SessionSummaryCard**

Purpose:

Give the user confidence and context.

Shows:

• Country

• Category

• Answer pills (max 5\)

Actions:

• Export PDF (available to all)

• Edit Answers (registered only)

---

## **8.2 FilterStack**

Purpose:

Refine results.

Structure:

• FilterGroup

• FilterControl

Filter types:

• Toggle

• Multi-select chips

• Range

Suggested filter groups:

Provider filters:

• Partner only

• Language

• Region

• Response speed

Content filters:

• Source type

• Freshness

• Language

---

## **8.3 TabJumpNav**

Purpose:

Quick jump between tabs.

Displays:

• tab label

• count badge (optional)

---

# **9\. RightRail Components**

## **9.1 FeaturedProviderSlot**

Purpose:

Always visible partner focus.

Uses:

• ProviderCard (Featured state)

---

## **9.2 LeadLimitGateCard**

Purpose:

When the user reached free primary requests.

Shows:

• explanation

• upgrade CTA

---

## **9.3 UpgradeCard**

Purpose:

Upsell plan.

Shows:

• plan benefits

• price placeholder

---

# **10\. Modal Components (Primary Engagement)**

## **10.1 EngagementModal**

Steps:

1. Message  
2. Optional details  
3. Confirmation state

Rules:

• Works without registration

• If unregistered: email required

• Provider receives magic link

---

# **11\. Design Constraints (Neutral Mode)**

Until the Design Agent defines a branded system:

• grayscale only

• avoid color risk semantics

• no gradient

• no new dependencies

---

# **12\. Stitch Mapping Guidance**

Stitch should generate screens using these components.

Rule:

Never generate a new bespoke card type if an existing variant can be used.

Mapping:

• Providers tab → ResultList \+ ProviderCard

• Laws tab → ResultList \+ SourceCard

• Guides tab → ResultList \+ GuideCard

• Tutorials tab → ResultList \+ TutorialCard

• Tools tab → ResultList \+ ToolCard

Overview tab →

• RiskSummaryCard

• KeyObligationsList

• RecommendedActionsPanel

• ReferenceLinksStrip

---

# **13\. Acceptance Criteria**

Component system is complete if:

• all existing category results can be rendered without new components

• partner vs non-partner CTA logic is supported

• left/right rails work across all tabs

• overview tab supports grounded links

---

(End of Results Component System Document)