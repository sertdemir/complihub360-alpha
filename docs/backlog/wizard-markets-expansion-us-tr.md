# Backend Backlog — Wizard Markets Expansion: United States + Türkiye + Others

**Status:** OPEN — design done, backend pending
**Created:** 2026-05-15
**Trigger:** Figma update on Wizard Step 1 (Markets) — added US, Türkiye, Others (modal picker)
**Figma:** `CompliHub-360` → Page `Wizard` → Section `Wizard / 01 Markets` (node `1199:403` parent)
**Related docs:** `GoogleDrive_Docs/User Flows (Complete)`, `GoogleDrive_Docs/API Contracts & Data Model`, `GoogleDrive_Docs/Search & Ranking Logic`

---

## Why this exists

Step 1 of the assessment Wizard previously covered 6 EU markets (DE · UK · NL · FR · IT · ES). The Figma now exposes **US**, **Türkiye**, and an **Others** modal picker. The frontend ships ahead of the backend coverage — this doc captures what the backend must deliver before US/TR users land in Step 5 (Risk Map) and trust the output.

Until the backend mapping is live, the Wizard will collect US/TR selections but the Risk Map must surface them with a degraded confidence state. Design has reserved a Review-Step disclaimer for that — *„Coverage in active expansion for these markets"* — to avoid a credibility break.

---

## Scope per new market

### 1. United States 🇺🇸

US is **not** a federal-VAT regime. Compliance is fragmented across 50 states (sales/use tax) and several federal layers. Minimum backend coverage:

**Sales-tax nexus engine**
- Economic-nexus thresholds per state (post-*South Dakota v. Wayfair*, 2018). Each state has its own threshold — typical pattern: $100,000 in sales or 200 transactions/yr, but variations exist (CA $500k, TX $500k, NY $500k + 100 txns, etc.).
- Marketplace-facilitator laws: which states deem the marketplace (not the seller) liable for collection — 47 states as of 2025.
- Physical-nexus triggers: inventory in Amazon FBA warehouses, employees, click-through nexus.

**Obligation types to model**
- State sales-tax registration (per state where nexus crossed)
- Quarterly/monthly sales-tax return filing
- Marketplace-facilitator reporting (1099-K thresholds)
- Resale-certificate management for B2B
- Sales-tax on digital goods (varies by state — SaaS taxable in ~20 states)

**Required input from Wizard**
- Annual revenue band (already collected — Step 2)
- Business model (D2C vs Marketplace vs SaaS — affects which framework applies)
- US-specific: states with physical presence? Inventory in FBA? (new Step or follow-up)

**Penalty citations to seed**
- State-by-state penalty matrices (typical 5–25% of unpaid tax + interest)
- Reference: each state's revenue department; e.g. CA CDTFA, NY DTF, TX Comptroller

**Verified-Partner coverage gap**
- Need at least one US-licensed CPA or tax-advisor partner per major state cluster (West, Central, East)
- Cross-state advisors (Avalara-style or boutique multi-state CPAs)

### 2. Türkiye 🇹🇷

Türkiye runs a centralized VAT (KDV) regime plus mandatory electronic invoicing. Coverage is simpler than US but has specifics not in the EU stack.

**KDV (Katma Değer Vergisi)**
- VAT rates: 1%, 10%, 20% (effective 2023 reform — was 1/8/18 before)
- Registration threshold for non-residents selling into TR
- Special regime for digital services to consumers: *Elektronik Hizmet Sunucularına KDV Sorumluluğu* (foreign digital-service providers must register if selling to TR consumers)

**E-invoicing / e-fatura / e-arşiv**
- **e-Fatura**: mandatory B2B/B2G electronic invoicing if annual revenue ≥ 3M TRY (threshold revised annually)
- **e-Arşiv**: mandatory B2C electronic archive if e-Fatura-mandated
- **e-İrsaliye**: e-delivery-note for physical goods movement
- **e-Defter**: e-bookkeeping (ledger)
- Integration via GİB (Gelir İdaresi Başkanlığı) portal or special integrators

**Other obligations**
- Withholding tax (stopaj) rules — applies to cross-border B2B services
- Cross-border supply rules — DDP vs DAP affects who is the importer of record
- Customs and ÖTV (special consumption tax) for certain goods

**Required input from Wizard**
- TRY revenue threshold (e-Fatura trigger) — needs separate currency handling
- Selling to TR consumers vs businesses (B2B/B2C affects which e-invoice regime)

**Verified-Partner coverage gap**
- Need at least one TR-licensed YMM (Yeminli Mali Müşavir / sworn financial advisor) partner
- E-invoicing integrator (e-Fatura special integrator partnership)

### 3. Others (modal picker — country list)

The `Others` card opens a modal with a searchable list of additional countries. Minimum first-batch suggestion (matches existing CompliHub partner network gaps + likely user demand):

**Tier-1 Others (build coverage for first):**
- 🇨🇭 Switzerland — VAT (MwSt/TVA/IVA), no EU, threshold-based registration
- 🇦🇹 Austria — EU-VAT, OSS, EPR
- 🇧🇪 Belgium — EU-VAT, EPR per region (Wallonia/Flanders/Brussels split)
- 🇸🇪 Sweden — EU-VAT, EPR producer responsibility, FTI registration
- 🇩🇰 Denmark — EU-VAT, EPR, DRS
- 🇵🇱 Poland — EU-VAT, JPK_VAT file format, EPR ROP system

**Tier-2 (lazy-load, lower priority):**
- 🇳🇴 Norway — non-EU, VOEC scheme
- 🇮🇪 Ireland — EU-VAT, low-tax SaaS jurisdiction
- 🇫🇮 Finland · 🇵🇹 Portugal · 🇨🇿 Czechia · 🇬🇷 Greece · 🇷🇴 Romania · 🇭🇺 Hungary

**API contract for modal**

```http
GET /api/wizard/markets/others
  → 200 OK
  {
    "tiers": [
      { "tier": 1, "countries": [
          { "code": "CH", "name": "Switzerland", "hint": "MwSt · no EU · registration threshold" },
          ...
        ]
      },
      { "tier": 2, "countries": [...] }
    ],
    "search_enabled": true,
    "max_select": null   // null = unlimited; revisit if perf
  }
```

The modal pre-fetches Tier-1, lazy-loads Tier-2 on user scroll or search query length ≥ 2.

---

## Wizard-engine impact

The Risk Map output engine (Step 5) currently assumes EU regime mappings. For US/TR (and Others-Tier-1), each existing obligation must declare:

```yaml
# Example obligation schema extension
obligation_id: oss_quarterly_return
applies_to_markets: [DE, NL, FR, IT, ES]   # current
applies_to_business_models: [d2c, marketplace, hybrid]
applies_if_revenue_above: null
penalty_template: "...UStG §18i (OSS)"

# New required attribute: market-specific equivalent
equivalent_obligations:
  US: state_sales_tax_registration    # different ID
  TR: kdv_registration
  CH: vat_mwst_registration
```

Three obligation states (currently `Likely — confirm to refine` · `Depends on B2B mix` · `Depends on tools`) need a **fourth** for unsupported-market interim behavior:

- `Coverage expanding` — surfaced when user picks a market we haven't fully mapped. Triggers a CTA: *„Tell us about your stack, we'll route to a partner who handles this market."*

---

## Frontend handoff to backend — required endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/wizard/markets` | GET | Returns the 9 headline markets (DE, UK, NL, FR, IT, ES, US, TR + Others-trigger) with hint copy. Localizable. |
| `/api/wizard/markets/others` | GET | Returns the country list for the modal (Tier-1 + Tier-2). Cached client-side. |
| `/api/wizard/markets/search?q=` | GET | Search across all countries (full list, not limited to Tier-1/2). Returns code, name, hint, coverage_status (`full`, `partial`, `expanding`). |
| `/api/wizard/risk-map` | POST | Existing endpoint. Must accept US/TR/Others-country codes. Returns obligations + coverage_status flag per obligation. |

---

## Open questions for backend / product

1. **Coverage policy for US.** Do we ship with one or two pilot states (e.g. CA + NY) or attempt all 50 from day one? Recommended: 5-state pilot (CA, NY, TX, FL, WA) covering ~40% of US e-commerce volume + state-by-state economic-nexus matrix in DB seed, even if Verified-Partner coverage starts narrower.

2. **TRY currency handling.** Step 2 revenue chips are in € today. For TR-only operators, do we add a TRY-equivalent band, or auto-convert (with FX-date-of-assessment caveat)? Recommend: keep EUR as primary, show TRY equivalent on hover for TR-selected sessions.

3. **Verified-Partner sourcing.** US/TR need pre-vetted advisors in the network before Risk Map can promise „we connect you with who fixes it." Without partners, the gold CTA *„Unlock matches"* either degrades or routes to general inquiry. Decision needed: launch with degraded CTA copy for US/TR, or hold the launch.

4. **Localization of obligation copy.** Currently all Risk Map copy is English. For TR users we likely want at least English + Turkish toggles for §-citations. Out of scope for this round but flag for i18n backlog.

5. **„Coverage expanding" badge in DS.** The fourth obligation state needs a new visual treatment in Compass — currently only Critical/High/Medium Risk Badges exist. Spec needed: same Risk Badge shape, neutral-gray variant + small "expanding" sub-label, OR an inline microstate instead of a badge. Defer to `compass` skill when ready.

6. **Penalty data source.** US sales-tax penalty matrices vary state-by-state and update; need a data-feed strategy (manual annual update vs Avalara/TaxJar API ingestion).

---

## Suggested execution order

1. **Backend foundations** — extend obligation schema with `equivalent_obligations`, add `coverage_status` to all responses
2. **Country catalog API** — `/markets`, `/markets/others`, `/markets/search` endpoints with seed data
3. **TR coverage** (simpler than US) — KDV thresholds, e-Fatura/e-Arşiv obligations, 2-3 partner contracts
4. **US coverage — pilot states** (CA, NY, TX, FL, WA) — economic nexus matrix, marketplace-facilitator flags
5. **Compass `Risk Badge — Expanding` variant** — design system addition
6. **Risk Map view update** — render fourth state, route Verified-Partner CTA to inquiry-form when coverage gap

---

## File metadata

This doc is the canonical handoff for the Step-1-Markets expansion. Update in-place rather than forking. When backend work begins, append a `## Execution log` section with PRs, decisions, and learned constraints. When fully shipped, archive to `docs/backlog/archive/`.
