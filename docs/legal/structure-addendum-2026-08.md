# CompliHub360 · Structure Addendum: US C-Corp + German DevCo

**As of: Aug 9, 2026 · Addendum to the VAT decision brief · Status: recommendation for advisor review**

> **Not a substitute for legal/tax advice.** This addendum describes the
> recommended structural pattern and the items an advisor with US+German
> practice must settle bindingly.

## 1 · Situation & Core Risks

- **C-Corp (Delaware)** founded by co-founder A (USA) — management/CEO.
- **Co-founder B (Germany)** — CTO, technical responsibility only.
- Development initially from Germany, later possibly Turkey or elsewhere.
- Hosting in the EU (privacy positioning).

**Core risks:** (a) the place of effective management factually shifting to
Germany → German corporate tax liability of the C-Corp (§ 10 AO);
(b) **false self-employment** ("Scheinselbstständigkeit") in a freelancer
setup — German pension authority status audits with retroactive social-
security back payments; (c) **informal ("unofficial") ownership side
agreements** → hidden participation, transfer-pricing adjustments,
due-diligence killer.

## 2 · Recommended Structure (a combination)

### 2.1 Cap table: co-founder B appears officially in the formation documents

- **Founder shares with vesting** (market standard: 4 years / 1-year cliff)
  at formation — separate from any service relationship.
- No "hiding" the founder: the C-Corp reports foreign ≥25% owners anyway
  (**Form 5472**; missed filing: $25,000 penalty each); hidden founders fail
  at the latest in investor due diligence.
- Personal tax for B (Germany): dividends/exit taxable in Germany; possible
  exit taxation on later relocation → advisor item.

### 2.2 Service delivery: German DevCo (UG/GmbH), officially documented

Two clean variants — both work, **no informal hybrid**:

| Variant | Ownership | Character |
|---|---|---|
| **B1 · True subsidiary** | C-Corp holds the GmbH shares | group structure, consolidated; transfer pricing between related parties |
| **B2 · Founder's DevCo** | Co-founder B holds the shares | independent service company with a written development agreement |

**Not recommended:** a GmbH that is formally independent but economically
attributed to the C-Corp via trust/side-letter arrangements ("unofficial
subsidiary") — hidden participation, tax and liability risks, DD killer.
**Layered is fine; concealed is not.**

### 2.3 The development agreement (DevCo ↔ C-Corp)

- **Cost-plus remuneration** (market standard ~5–10% markup) = the
  transfer-pricing standard for contract development; monthly invoicing.
- **VAT:** B2B services to a US customer → not taxable in Germany; the
  DevCo's input-VAT deduction is preserved.
- **IP assignment:** all code/work products transfer contractually to the
  C-Corp (including contribution of pre-existing IP at formation). Without a
  complete IP chain, the C-Corp is worthless in any due diligence.
- Scope wording: technical execution, **no management authority** over the
  C-Corp.

### 2.4 Evidence of US management

Board resolutions, contract signatures and strategic decisions (pricing,
partnerships, hiring) documented with co-founder A in the USA. Rule of
thumb: **titles don't protect — lived, documented practice determines** the
place of effective management.

### 2.5 Turkey / another country later

Repeat the pattern: local DevCo (or relocation of the existing one) with an
identical set of agreements. The structure is deliberately portable.

## 3 · Why Not the Alternatives?

- **Freelancing directly for the C-Corp:** one client + full integration =
  textbook **false self-employment** (status audit, retroactive
  social-security payments for years). The GmbH layer is the established
  mitigation.
- **Employment by the C-Corp:** German employer registration (wage tax /
  social security) for the US corp + increased permanent-establishment risk.

## 4 · Privacy Note (EU Hosting)

EU hosting is right for GDPR practice and latency — but it is **no shield
against US government access**: as long as the C-Corp is the data
controller, the **CLOUD Act** applies regardless of server location. Do not
advertise "data is safe from the US" (misleading, actionable under German
competition law). To fully play the privacy card, place data
controllership in the EU entity (variant B1 with the GmbH as controller) →
advisor topic.

## 5 · Advisor Checklist

| # | Item | Goal |
|---|---|---|
| 1 | Place of effective management: is the role/process documentation sufficient? | written assessment |
| 2 | Variant B1 (subsidiary) vs. B2 (founder DevCo) for this case | decision |
| 3 | Development agreement: cost-plus rate, IP clauses, scope wording | contract draft |
| 4 | Form 5472 · Delaware franchise tax · federal filings | compliance calendar |
| 5 | Compensation of co-founder B (GmbH managing-director salary vs. distributions) | structuring |
| 6 | B's shares: German taxation, vesting, possible exit taxation | structuring |
| 7 | Data controllership C-Corp vs. EU entity (CLOUD Act / GDPR positioning) | decision |
| 8 | Imprint/legal pages reflecting the actual responsible entity · legal-services-act (RDG) sign-off for the risk map | implementation |
