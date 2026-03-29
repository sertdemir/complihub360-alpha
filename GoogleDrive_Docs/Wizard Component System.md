# **CompliHub360 — Wizard Component System**

Version: 1.0

Audience: UX, UI, Frontend, Product

---

# **1\. Zweck**

Der Wizard ist die **Search-Refinement Engine**.

Er ersetzt komplexe Filter-UI durch 4–5 gezielte Abfragen (Booking/Skyscanner Prinzip) und erzeugt ein strukturiertes SearchProfile.

Wichtig:

• Provider Grid bleibt parallel sichtbar (User muss Wizard nicht nutzen)

• Wizard ist optional, aber stark empfohlen (bessere Treffer)

---

# **2\. Wizard High-Level Flow**

1. Country Gate (vor der Suche)  
2. Category Selection (Tonic Cards)  
3. Wizard Steps (4–5 Fragen)  
4. Review (Summary)  
5. Results Page (Tabs)

---

# **3\. Wizard Layout Components**

## **3.1 WizardShell**

Slots:

• Header

• Stepper

• Body

• Footer

States:

• Loading

• Error

• Paused

---

## **3.2 WizardHeader**

Elements:

• Country badge

• Category badge

• “Exit to results” link (keine Daten verlieren)

---

## **3.3 WizardStepper**

• Step count

• Current step label

---

## **3.4 WizardFooter**

Buttons:

• Back

• Next

• Skip (optional per step)

Rules:

• Next disabled until valid input

• Skip only for non-critical questions

---

# **4\. Core Question Components (Building Blocks)**

## **4.1 SingleSelectCardGroup**

Use when:

• user must pick one option

Example:

• Business type: “E-commerce”, “Brand”, “Agency”

---

## **4.2 MultiSelectChips**

Use when:

• user can pick multiple

Example:

• marketplaces: Amazon, Shopify, eBay

---

## **4.3 CountryMultiSelect**

Use when:

• multi-market targeting

Rules:

• primary country locked as base

• additional markets optional

---

## **4.4 RangeSelector**

Use when:

• revenue / volume estimation

---

## **4.5 YesNoToggle**

Use when:

• fast branching

---

## **4.6 FreeText (Guarded)**

Use when:

• message input or special notes

Rules:

• keep optional

• never required early

---

# **5\. Review & Summary Components**

## **5.1 WizardReviewPanel**

Shows:

• all answers grouped

Actions:

• Edit step (dashboard only)

Public mode:

• “Register to edit answers” CTA

---

# **6\. Category Variants (Question Sets)**

Each category maps to a WizardVariant.

Canonical object:

• VariantId

• Steps\[\]

• Required signals

• Optional signals

---

## **6.1 Variant: Tax & VAT**

Goal:

Determine VAT registration relevance \+ find specialists.

Steps (max 5):

1. Selling model  
   • Marketplace / own shop / both  
2. Business country (already known)  
   • confirm legal seat (Yes/No)  
3. Target markets  
   • select additional countries  
4. Revenue band  
   • under threshold / near / above  
5. Goods type  
   • physical / digital services

Outputs:

• vat\_likelihood (low/medium/high)

• target\_markets\[\]

• channel

Edge cases:

• user selects many markets → recommend “Full Support” cross-sell

• digital-only → different VAT rules hint

---

## **6.2 Variant: Product & Packaging (EPR)**

Goal:

Determine EPR obligation signals.

Steps:

1. Selling physical goods? (Yes/No)  
2. Packaging used? (Yes/No)  
3. Categories  
   • electronics, apparel, supplements, cosmetics, etc.  
4. Target markets  
5. Importer role  
   • manufacturer / reseller / dropship

Outputs:

• epr\_required\_likelihood

• epr\_categories\[\]

Edge cases:

• dropship unknown packaging → show “assume yes” logic

---

## **6.3 Variant: Data & Privacy**

Goal:

Assess GDPR/privacy exposure.

Steps:

1. EU customers? (Yes/No)  
2. Personal data collected? (Yes/No)  
3. Tracking tools used?  
   • GA4, Meta, TikTok, etc.  
4. Data processing location  
   • EU / US / mixed  
5. Consent management present? (Yes/No)

Outputs:

• privacy\_risk\_level

• tracking\_stack\[\]

Edge cases:

• user says “no personal data” but uses trackers → flag mismatch and ask confirm

---

## **6.4 Variant: Marketing & SEO**

Goal:

Assess advertising/SEO compliance risk.

Steps:

1. Industry sensitivity  
   • health/supplements, finance, generic ecom  
2. Claim types used?  
   • “\#1”, “guaranteed”, medical claims  
3. Channels  
   • SEO / Google Ads / Meta / TikTok  
4. Target markets  
5. Tracking & cookies

Outputs:

• marketing\_risk\_level

• claim\_flags\[\]

Edge cases:

• high-sensitivity industry \+ medical claims → immediate “High” and strong provider CTA

---

## **6.5 Variant: Corporate & Structure**

Goal:

Identify legal entity / registration needs.

Steps:

1. Selling as individual or company?  
2. Current entity country  
3. Want to register abroad? (Yes/No)  
4. Markets  
5. Team size / complexity

Outputs:

• entity\_need\_level

Edge cases:

• user unsure about current entity status → show “educational guide” path

---

## **6.6 Variant: Full Support**

Goal:

Route to full-service providers.

Steps:

1. Business size  
2. Markets count  
3. Priority goal  
   • speed / cost / risk reduction  
4. Current compliance maturity  
   • none / some / advanced

Outputs:

• service\_tier

Edge cases:

• user selects “speed” \+ many markets → prioritize partners with SLA

---

# **7\. Universal Wizard Rules**

## **7.1 Mandatory vs Optional**

• Keep mandatory questions to 2–3

• Use optional questions to refine ranking

---

## **7.2 Exit & Resume**

• user can exit wizard without losing context

• in dashboard, wizard answers are editable

---

## **7.3 Localization**

• all labels via i18n keys

• no hardcoded country-specific text

---

# **8\. Edge Cases & Failure Modes**

## **8.1 Missing country**

• block wizard

• enforce country selection first

## **8.2 Conflicting answers**

• show confirmation micro-step

## **8.3 No results**

• show fallback providers

• show guides

• suggest adjacent category

## **8.4 Too broad markets**

• suggest narrowing

• or route to Full Support

## **8.5 User refuses wizard**

• provider grid remains

• results from raw search still available

---

# **9\. Acceptance Criteria**

Wizard system is complete if:

• each category has a variant definition

• shared components cover all step types

• results page receives a normalized SearchProfile

• edge cases render safe fallbacks

---

# **10\. Detailed Step Design (Wizard UX Specification)**

Below is the **exact step logic** for the wizard flow. Each step must be fast, visual and scannable. The goal is that users complete the wizard in **under 20 seconds**.

---

# **Step 0 — Country Gate**

Purpose:

Define regulatory context before any questions are asked.

UI Component:

CountrySelector

Fields:

• Primary country (required)

• Optional additional markets

Rules:

• Wizard cannot start without a country

• Additional markets influence results ranking

Example Output:

searchProfile.country \= “Germany”

searchProfile.markets \= \[“Germany”,“France”,“Italy”\]

---

# **Step 1 — Category Selection (Tonic Cards)**

Purpose:

Let users define their problem domain.

Component:

CategoryCardGrid

Cards:

• Tax & VAT

• Product & Packaging

• Data & Privacy

• Marketing & SEO

• Corporate & Structure

• Full Support

Card Elements:

• icon

• title

• one-line explanation

Example:

“Tax & VAT”

“Understand cross-border VAT obligations”

Interaction:

Single select.

Selecting a card loads the corresponding **Wizard Variant**.

---

# **Step 2 — Context Question**

Purpose:

Identify business context quickly.

Component:

SingleSelectCardGroup

Example Options:

• E-commerce brand

• Marketplace seller

• SaaS company

• Agency

• Other

Output Example:

searchProfile.businessType \= “Ecommerce”

Edge Case:

If “Other” selected → optional free text clarification.

---

# **Step 3 — Market Scope**

Purpose:

Determine geographic complexity.

Component:

CountryMultiSelect

Options:

• selling only in selected country

• selling across EU

• selling globally

Output:

searchProfile.marketScope \= “EU”

Edge Case:

If “global” selected → show hint:

“Some compliance rules differ significantly outside the EU.”

---

# **Step 4 — Risk Driver Question**

Purpose:

Identify the **main regulatory trigger**.

Component:

MultiSelectChips

Example by category.

VAT:

• selling via marketplace

• shipping cross-border

• warehouse abroad

Marketing:

• advertising claims

• paid ads

• influencer marketing

Privacy:

• tracking tools

• email marketing

• analytics

Output Example:

searchProfile.riskSignals \= \[“cross\_border\_shipping”,“marketplace”\]

---

# **Step 5 — Complexity Indicator**

Purpose:

Estimate effort and urgency.

Component:

RangeSelector

Example:

Revenue band

• \< 10k

• 10k-100k

• 100k-1M

• \>1M

Output:

searchProfile.revenueBand

Edge Case:

If revenue high \+ cross-border markets → raise priority for providers.

---

# **Step 6 — Review Step**

Purpose:

Confirm answers before generating results.

Component:

WizardReviewPanel

Displays:

• Country

• Category

• Business type

• Markets

• Risk signals

Actions:

• Generate results

• Edit (dashboard only)

Public Mode:

“Register to edit answers later”

---

# **Step 7 — Results Trigger**

When user confirms review:

System generates **SearchProfile Object**.

Example:

{

country: “Germany”,

category: “VAT”,

businessType: “Ecommerce”,

markets: \[“Germany”,“France”\],

riskSignals: \[“cross\_border\_shipping”,“marketplace”\],

revenueBand: “100k-1M”

}

This object is sent to:

• ranking engine

• provider matching

• content retrieval

---

# **11\. Wizard Behavioral Rules**

1. Maximum 5 steps  
2. Maximum 1 decision per screen  
3. Visual card selection preferred  
4. No long forms  
5. Wizard optional

---

# **12\. Wizard UX Micro-Interactions**

Animations:

• card selection highlight

• step transition slide

Feedback:

• progress indicator

• step completion tick

---

# **13\. Wizard Analytics Events**

Track:

wizard\_started

wizard\_step\_completed

wizard\_abandoned

wizard\_completed

results\_generated

---

# **14\. Wizard Performance Targets**

Target metrics:

Wizard Completion Rate \> 60%

Average Time \< 25 seconds

---

(End of Wizard Component System)