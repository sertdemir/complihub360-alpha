# CompliHub360 · VAT Handling for Platform Invoices — Decision Brief

**As of: Aug 9, 2026 (rev. 2 — corrected for US entity) · Status: for decision · Prerequisite for the first real invoice**

> **Not a substitute for tax advice.** CompliHub360 is a company headquartered
> in the **USA (Delaware)**. This brief structures the options and the
> technical implementation; the final assessment belongs with an advisor
> covering both US and EU practice before go-live.
> **Question no. 1 for that advisor: does the operational activity carried
> out from Germany constitute a "fixed establishment" for VAT purposes?**
> If yes, the entire logic of this document flips back toward German
> VAT registration.

## 1 · Situation

CompliHub360 **(US/Delaware; assumption: no EU establishment — to be
confirmed)** invoices **providers** (B2B: tax firms, legal/compliance service
firms) via the monthly Stripe invoice run: lead fees (€120), partner
subscriptions (€149/month or €1,490/year), detail opens (€3) —
electronically supplied B2B services, invoiced in EUR. Customer base in
phase 1: Germany + EU, later UK/TR.

Relevant later: **Assistant Pro** (subscription for end users, including
consumers = B2C) — parked post-MVP, but it changes the tax logic the moment
it launches (→ OSS, see § 3).

## 2 · Tax Assessment (US entity without EU establishment)

**The good news: the pure B2B case is SIMPLER than a German-entity scenario.**
B2B services are deemed supplied where the recipient is established
(Art. 44 EU VAT Directive); with a third-country supplier, the EU business
customer self-accounts for the VAT:

| Customer class | VAT on our invoice | Mechanics |
|---|---|---|
| **German providers** | **0% — reverse charge** (§ 13b UStG) | customer self-accounts (and deducts input VAT) — NO German VAT registration required |
| **Other EU providers** | **0% — reverse charge** (Art. 196 VAT Directive) | proof of business status via VAT ID |
| **UK providers** | 0% — reverse charge (UK rules) | analogous |
| **US customers (later)** | state sales tax per state | Delaware itself: no sales tax; monitor economic-nexus thresholds of other states |

Dropped compared to a German-entity setup: German VAT returns, the EC Sales
List (ZM — only for EU-established suppliers), and the German
small-business scheme (§ 19 UStG — domestic businesses only).

**What remains mandatory:** substantiating the customer's **business status**
— without it, the customer counts as a consumer and B2C rules apply (→ § 3).
In practice: collect + validate the VAT ID at intake and carry the reverse-
charge note on every invoice (for German customers ideally
"Steuerschuldnerschaft des Leistungsempfängers, § 13b UStG").

## 3 · The Two Real Risks

**a) Fixed establishment in Germany (the pivotal question).** If the platform
is effectively operated from Germany (staff, infrastructure, decision-making),
a fixed establishment may exist — supplies could then be taxable in Germany
(19% to German customers, registration, filings). This is a question of
facts, not software → **written advisor assessment before go-live.**

**b) B2C (Assistant Pro).** Electronically supplied services from a
third-country supplier to EU consumers are taxable in the consumer's country
**from the first euro** — registration via the **non-Union OSS scheme** (one
EU member state as single point of contact) is required BEFORE the first
paying EU consumer. Assistant Pro must not simply be "switched on"; that is
the moment Stripe Tax goes from nice-to-have to necessary.

## 4 · Options

### Option A — Stripe Tax (automated) · **Recommendation**

- Detects B2B status (VAT ID, validated against VIES/HMRC databases) and
  applies reverse charge / zero-rating including the mandatory invoice notes
  automatically; monitors registration thresholds (EU B2C, US states, UK …).
- **Cost: effectively €0 in phase 1** — the 0.5% fee applies only where tax
  is actually calculated; a pure reverse-charge operation calculates none.
- Value: safeguards today's B2B classification + ready-made rails for
  tomorrow's B2C/US-nexus scenarios.
- Limit: does not replace a qualified VIES confirmation with an evidence
  record (archive once per provider during vetting).

### Option B — Manual

All invoices at 0% with the reverse-charge note, VAT-ID checks at intake,
threshold monitoring by hand. Defensible in a pure B2B operation (every
invoice looks the same) — but no safety net against the B2C/nexus trap and
no automatic ID validation.

### Option C — Defer

Only tenable while invoices are sandbox-only. Even a reverse-charge invoice
needs formally correct content (note text, IDs) from invoice no. 1.

## 5 · Technical Implementation on Our Side

1. **VAT ID + billing country as mandatory intake fields**
   (+ `providers.vat_id`, `billing_country`); archive a qualified VIES check
   during vetting. **The B2B evidence is now the load-bearing pillar.**
2. **Enrich the Stripe customer**: `tax_ids` + address → basis for
   reverse-charge detection and the mandatory invoice note.
3. **Activate the Stripe live account on the Delaware entity** (EIN, US
   address — the current sandbox account is independent of this).
4. Option A only: enable `automatic_tax` in the invoice run + extend the
   restricted API key with the Tax permissions (deliberately not granted yet).
5. Effort: items 1–3 ≈ one manageable PR (intake field, migration, customer
   sync in the billing run); item 4 ≈ a few lines.

## 6 · Recommendation & Checklist

**Recommendation: Option A (Stripe Tax)** — in this constellation it is
effectively free (pure reverse-charge operation = no 0.5% fee) and at the
same time insurance against both real risks (the fixed-establishment switch
and the B2C launch).

| # | Step | Who |
|---|---|---|
| 1 | Advisor (US+EU): fixed establishment in Germany yes/no — **in writing** · US obligations (Delaware franchise tax, federal) | Founder |
| 2 | Activate the Stripe live account on the Delaware entity (EIN, US address) | Founder |
| 3 | Enable Stripe Tax in the dashboard + Tax permissions on the restricted key | Founder |
| 4 | Intake fields + migration + customer sync + `automatic_tax` in the run | Engineering (PR) |
| 5 | Sandbox test: German provider (§ 13b note) · Italian provider (RC) · customer without VAT ID (error path) | Engineering |
| 6 | Before launching Assistant Pro: non-Union OSS registration | Founder + advisor |

## Sources

- Stripe Tax pricing (0.5% only where tax is calculated): stripe.com/tax/pricing
- Stripe Tax × Invoicing, tax IDs & reverse charge: docs.stripe.com/tax/invoicing/tax-ids
- Stripe Tax in the EU (RC with VAT ID, non-Union cases): docs.stripe.com/tax/supported-countries/european-union
- EU VAT Directive Art. 44/196 (B2B place of supply / reverse charge) · § 13b UStG (RC for third-country suppliers)
