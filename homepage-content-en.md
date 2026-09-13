# CompliHub360 — Homepage Content (EN)

All visible copy of the homepage (`/en`), section by section, in the order the page renders it (`apps/vs1-demo/ui/src/pages/HomePage.tsx`). Source of truth is the English locale files (`public/locales/en/home.json`, `common.json`, `userws.json`); texts are quoted verbatim.

**Legend:** **bold** inside a headline = the gold-highlighted word (`GoldWord`). Fixture values that live in code (percentages, ratings, demo rows) are included where they appear on screen.

---

## 1 · Hero (`HomeHeroWorld`)

**Headline**
Global Compliance.
**Simplified.**

**Lead**
Understand your obligations. Find the right specialists. Stay compliant — everywhere you sell.

**Primary CTA:** Start the Risk Map
**Free-question input:** placeholder "Describe what you need" · button "Send"

### Promise band (4 promises)

| Title | Description |
|---|---|
| Know your obligations | See clearly what applies to your business. |
| The right specialists | We match you with verified partners who fit your case. |
| Get things done | Connect, collaborate, complete. |
| Always on your side | Human support and AI help — around the clock. |

### Proof strip (5 proofs)

| Title | Description |
|---|---|
| 360° coverage | Across countries, topics and regulations. |
| Expert network | Verified specialists you can trust. |
| Smart technology | AI guidance with human expertise. |
| Human first | Real people. Real support. |
| Your data, protected | Enterprise-grade security and privacy. |

---

## 2 · Problem Recognition (`ProblemRecognition`, `#why-this-is-hard`)

**Eyebrow:** Why this is hard

**Headline:** Getting a **straight** answer is the hard part.

**Lead**
Most people we talk to have already tried. The problem is rarely effort — it is that the answers do not line up, and there is no way to tell which one fits your situation.

### Four pains

**01 · Two advisors, two answers.**
Ask the same question twice and you get two defensible answers. Without the source behind each one, you cannot tell which applies to you.

**02 · Sold more than you need.**
The incentive is to quote the widest scope. Nobody is paid to tell you a task is small, or that you have already handled it.

**03 · Weeks that disappear into scoping.**
Before the actual work starts you have explained your business five times and compared quotes that measure different things.

**04 · No basis for comparison.**
Every proposal is structured differently. Comparing them means guessing at what each one left out.

**Closing note**
None of this means you have a problem. It means you do not have a clear picture yet — and that is a solvable one.

---

## 3 · Entry Door — demo edition (`EntryDoorDemo`, `#entry-door`)

**Eyebrow:** Begin here

**Headline:** One assessment. One result. The path becomes **legible**.

**Subtitle**
Six minutes. No account required. We map your operations against the regulations that actually apply, and show you what to do next.

**CTA:** Assess My Needs
**Demo controls (aria):** Pause demo · Play demo

### Self-playing wizard demo (`AnimatedWizard`, copy from `wizard.*`)

**Rail:** Markets · Operations · Domains · Review
**Header link:** Save progress

**Step 1 — Where do you operate?**
Multi-select. We map regulations against the markets you sell into.

| Card | Sub-line |
|---|---|
| Germany | Primary VAT regime · LUCID register |
| United Kingdom | Post-Brexit packaging + VAT |
| Netherlands | VAT + WEEE register |
| France | EPR + AGEC compliance |
| Italy | VAT + REACH |
| Spain | VAT + ecodesign |
| United States | Sales-tax nexus · marketplace facilitator |
| Türkiye | VAT (KDV) · e-fatura / e-arşiv |
| Others | Open country list → |

**Step 2 — What do your operations look like?**
We scope the regulations that apply to your operation, not just your market.

| Card | Sub-line |
|---|---|
| D2C e-commerce | Direct-to-consumer online sales |
| B2B / wholesale | Sell to businesses or distributors |
| Marketplace | You connect buyers + sellers |
| SaaS / digital | Software, no physical shipment |
| Hybrid | Mix of B2B and B2C channels |
| Other | Tell us in a sentence |

**Step 3 — Which compliance areas concern you?**
Multi-select. We prioritize the obligations in these domains.

| Card | Sub-line |
|---|---|
| Tax & VAT | Cross-border VAT, OSS/IOSS, thresholds |
| EPR & Packaging | EPR, producer responsibility, registers |
| Data & Privacy | GDPR, DPAs, EU representative |
| Marketing Compliance | Consent, cookies, advertising rules |
| Corporate & Structure | Entities, permanent establishment, filings |
| Product Compliance | CE marking, product safety, GPSR |
| Logistics & Customs | EORI, HS codes, Intrastat, customs |
| Legal Advisory | Contracts, T&Cs, consumer law |

**Skip hint:** Not sure? Skip and we'll route based on your business model and markets.

**Step 4 — Review: Your situation, summarized.**
Here's what we'll use. Edit anything you need, then generate your risk map.
Rows: Markets · Operations · Compliance domains · Edit
Trust line: Anonymous · No account required to see your risk map · Processed in ~4 seconds

**Footer buttons:** Back · Next · Skip & route · Generate my risk map

---

## 4 · Risk Map Showcase (`RiskMapShowcase`, `#risk-map`)

**Eyebrow:** What a risk map looks like · anonymized example

**Headline:** Here's what **applies** to you.

**Subtitle**
Based on Germany · United Kingdom · Netherlands. D2C e-commerce, €2M—€5M revenue. VAT · EPR · Privacy in scope.

### Card head (compact stats)

| Value | Label |
|---|---|
| 8 | Obligations identified |
| 4 | Due within 30 days |
| 14 | Days median deadline |
| 3 | Verified Partners |

### Obligation rows (as shown)

| Severity | Obligation | Market · Due | State |
|---|---|---|---|
| Immediate | OSS quarterly return | DE · NL · Due Apr 30 | Confirmed |
| Immediate | VAT registration — UK | UK · Due May 15 | Likely |
| Immediate | EPR packaging registration (LUCID) | DE · Due May 02 | Likely |
| Medium | DPIA for tracking pixels | EU-wide · Due — | Answer 2 questions |
| High | Cookie banner + consent records | EU-wide · Due Ongoing | Confirmed |

Severity labels: Low · Medium · High · Immediate
State labels: Confirmed · Likely · Answer 2 questions

---

## 5 · Match Showcase (`MatchShowcase`, `#matchmaking`)

**Eyebrow:** The difference

**Headline**
Other tools tell you what's wrong.
We **connect** you with who fixes it.

**Subtitle**
Risk maps are public — every compliance dashboard offers one. What makes CompliHub360 different is what comes after: verified providers across countries and domains, pre-vetted, response-tracked, with structured handovers. You don't search. We match.

### Three anonymous dossiers (identity locked, badge "Verified")

| Specialty | Tags | Match | Covers | Footer line |
|---|---|---|---|---|
| VAT & OSS Specialist | UStG §18i (OSS) · DE · NL · FR | 94% match | covers your 2 Critical priorities | 24h response · 4.8 ★ · 142 prior engagements |
| UK Packaging Compliance | UK Packaging Regs. · PackUK · EPR renewal | 88% match | covers your 1 High priority | 21h response · 4.9 ★ · 86 prior engagements |
| Cross-Border EPR Counsel | VerpackG · LUCID · cross-border | 81% match | covers your 1 Medium priority | 36h response · 4.7 ★ · 211 prior engagements |

**CTA:** Unlock matches with a free account

---

## 6 · How It Works — route edition (`HowItWorksRoute`, `#the-five-steps`, copy from `common.json → howItWorks.*`)

**Eyebrow:** How it works

**Headline:** From a question to someone who can **act**.

**Lead**
Five steps. You can stop after any of them — most people do, and that is a perfectly good outcome.

### Five stations

**1 · Understand — Ask in your own words.**
Ask in the free-text field — the answer carries the source behind every point. No account.

**2 · Assess — See what actually applies to you.**
The wizard asks four things and builds your Risk Map — every obligation with legal basis and deadline.

**3 · Decide — Decide what needs outside help.**
The Risk Map separates what you can handle internally from what needs a specialist.

**4 · Match — Quality before names.**
Specialists first without identity: coverage, verified qualifications, response time.

**5 · Act — Book, then hand over.**
Pick a slot — your dossier travels along, so you never explain your business a sixth time.

**CTA:** See how each step works

---

## 7 · Domains Atlas (`DomainsAtlas`, `#what-we-know`)

**Eyebrow:** What we know

**Headline:** Every domain. **One** coherent map.

**Subtitle**
The map nobody draws — drawn. Every domain we cover, end to end, with the markets it applies in and the obligations that come with it.

**Dossier labels:** Domain · Active in: · When this matters · What we cover · Learn more

### The eight areas

#### Tax & VAT — DE · UK · NL · FR · IT · ES
*Rail line:* Know which VAT regime applies in each market you sell into, and when a registration becomes due.
*Intro:* Cross-border VAT, OSS/IOSS, intra-community supply, distance-selling thresholds. Six markets means six VAT regimes, six registration thresholds, six filing cadences. We track each.
*When this matters:* You sell B2C into another EU market for the first time
*What we cover:* OSS / IOSS quarterly returns · Distance-selling threshold monitoring · Intra-community supply VAT · Reverse-charge mechanism · Per-market VAT registrations · Bilateral DTA implications

#### EPR & Packaging — DE · UK · NL · FR · AT · BE
*Rail line:* Know whether you count as a producer in a market — and what you must register before the first shipment.
*Intro:* Extended Producer Responsibility across packaging, batteries, and electronics. Each market runs its own register, fee schedule, and reporting cadence. We map who you register with and when.
*When this matters:* You ship physical goods into a new EU market
*What we cover:* LUCID / national packaging registers · Take-back & recycling obligations · Ecomodulation fee tiers · WEEE & battery registration · Annual reporting volumes · Authorised-representative requirements

#### Data & Privacy — EU-WIDE · POST-BREXIT UK
*Rail line:* Know what you may collect, on what basis, and what you have to be able to show.
*Intro:* Data protection across the EU and post-Brexit UK. From records of processing to international transfers, we surface the obligations that follow your data — not just your headquarters.
*When this matters:* You process personal data of EU/UK residents
*What we cover:* DPIAs for high-risk processing · Records of Processing (RoPA) · Processor / sub-processor agreements · International transfer mechanisms · Subject-access & deletion handling · Breach notification timelines

#### Marketing Compliance — EU-WIDE · EPRIVACY
*Rail line:* Know what you may claim, how you may reach people, and what consent has to look like.
*Intro:* Consent and fair-marketing rules under ePrivacy and consumer law. Cookie walls, opt-ins, and dark-pattern scrutiny vary by market — we track what each regulator actually enforces.
*When this matters:* You run paid acquisition into the EU
*What we cover:* Cookie-consent banner validity · Consent records & proof · E-mail / SMS opt-in rules · Dark-pattern audits · Influencer & ad disclosure · Unsubscribe & suppression handling

#### Corporate & Structure — DE · AT · CH
*Rail line:* Know where your setup creates obligations — permanent establishment, filings, beneficial owners.
*Intro:* Entity-level obligations in the DACH region. Annual statements, beneficial-owner transparency, and intra-group contracts each carry their own deadlines and penalties.
*When this matters:* You operate a local entity or branch
*What we cover:* Annual financial statements · Transparency / UBO register filings · Beneficial-owner updates · Intra-group contract documentation · Local representation requirements · Filing-deadline tracking

#### Product Compliance — EU-WIDE · UK
*Rail line:* Know whether your product may go on the market, and what evidence you have to hold.
*Intro:* Whether a product may be placed on the market at all, and what proof stands behind it. Separate from packaging: this is the product itself — safety, conformity, documentation, and who inside the EU answers for it.
*When this matters:* You place a physical product on the EU market for the first time
*What we cover:* General Product Safety Regulation (EU) 2023/988 · CE marking and declaration of conformity · Technical documentation and its retention · Responsible person established in the EU · Incident reporting and recalls · UKCA marking for Great Britain

#### Logistics & Customs — DE · UK · NL · FR · EU
*Rail line:* Know what your goods need to cross a border, and who carries the liability when they do.
*Intro:* What goods need in order to cross a border, and who carries the liability once they do. Customs identity, declarations, statistics and the terms of delivery that decide who pays and who answers.
*When this matters:* You ship across a customs border for the first time
*What we cover:* EORI registration · Import and export declarations · Intrastat reporting once the threshold is crossed · Incoterms and where liability sits · Import VAT and deferment · GB ↔ EU movements after Brexit

#### Legal Advisory — EU-WIDE
*Rail line:* Know when a question genuinely needs a lawyer — and reach one who already has your case.
*Intro:* The questions that need a qualified answer rather than a checklist: contracts, terms, consumer rights, disputes. CompliHub360 is not a law firm — Verified Partners advise under their own professional liability, and we make sure the one you reach already has your case.
*When this matters:* You enter a contract type you have not used before
*What we cover:* Terms and consumer information duties · Supplier and platform contracts · Withdrawal, returns and warranty · Liability and its limits · Handling a dispute across borders · Which jurisdiction actually applies

> The locale file carries three "when this matters" lines per area; the atlas renders only the first. The full set lives on each area's own page (`/en/compliance/:slug`).

---

## 8 · Trust Band (`TrustBand`, `#why-both`)

**Eyebrow:** Why both belong together

**Headline**
Platforms know the rules, directories know the people.
CompliHub360 closes **both halves** at once.

### Six trust proofs

| Title | Description |
|---|---|
| Risk-prioritized, not exhaustive | Critical to Low. Four to twelve items at any time. Not 200-page checklists. |
| Sourced from the regulators themselves | Every entry links to the official notice, registry page, or case law it draws from. |
| Updated against drift | Rules change. The map updates when a deadline moves, a regulator clarifies, or a registry opens. |
| Plain language by default | If a clause needs a paragraph to explain, the paragraph is what you see — not the clause. |
| Verified by us, not self-listed | Each Verified Partner is vetted on coverage, response time, and named real outcomes — not a directory. |
| Shared accountability built-in | Every engagement is contractual. Partners accept responsibility for the matter, not just the advice. |

---

## 9 · Inside One Engagement (`HowItActs`, `#engagement` — the header's "Pricing" anchor)

**Eyebrow:** Inside one engagement

**Headline:** What happens **between** the match and the resolution.

**Subtitle**
Once you're matched, three things stop being assumptions: what it costs, when you'll hear back, and what you take with you. Each is set before the first email.

### Card 01 — Cost, before you commit.
Every Verified Partner publishes a fixed estimate before you accept the engagement. No discovery calls just to find out what something costs.

| Label | Value |
|---|---|
| Estimated cost | €2,400 — €3,800 |
| Scope | OSS quarterly returns · DE + NL + FR |
| Approval | Set before any work begins |

### Card 02 — Response, on the clock.
24–48h to first response, or we route to the next available partner — automatically. The clock is part of the contract, not a promise.

Initial response SLA: **≤ 48h**
Auto-routed to the next partner if missed. Contractually agreed.

### Card 03 — A trail you keep.
Every step is logged on a private timeline — request, reply, agreed scope, deliverables. Yours to keep, exportable any time, in any format your auditor needs.

| Date | Event |
|---|---|
| Apr 24 | Request sent |
| Apr 25 | Partner accepted · 21h |
| Apr 28 | Proposal received |
| May 02 | Scope agreed |

Export · PDF · CSV · API

---

## 10 · Beyond the Assessment (`BeyondAssessment`)

**Eyebrow:** Beyond the assessment

**Headline:** From one-time check to **home base** for everything compliance.

**Subtitle**
The assessment is free. What comes after — your workspace, live news, expert content, your partners — is what makes CompliHub360 the place you come back to.

**Pills:** Available today · Launching with Beta

### Tile 1 — Your map. Your partners. Your trail. Persistent. *(Available today)*
The assessment becomes a saved dossier. Your engagement timeline lives in your dashboard. Provider relationships, compliance trail, risk map — all in one place, all yours.

*Dashboard window (excerpt of the real workspace, `userws.*` + fixtures):*
Welcome back, Alex. · Start new search
Pick up where you left off — VAT registration · Italy — Continue →
Active requests 3 — Verifizierte Steuerkanzlei · Norditalien · VAT · Italy · 14h (Awaiting confirmation) · Verifizierter EPR-Spezialist · Deutschland · EPR · France (Active)
Saved sessions 4 — TAX & VAT · IT · VAT registration · Italy (● High risk · threshold reached) · PACKAGING · FR · EPR registration · France (● Medium risk · deadline Q3)

### Tile 2 — Updates that affect you. *(Launching with Beta)*
Real-time alerts when regulators move in markets you operate in. Curated by domain, scoped to your operation.

*Notifications window:*
Notifications
MONITORING · Risk threshold reached · Italy VAT · 6h
REQUEST · Provider replied · Verifizierte Steuerkanzlei · 12 min
SLA · SLA reminder · Datenschutz-Kanzlei · UK · 4h

### Tile 3 — Learn from the pros. *(Launching with Beta)*
Webinars with regulators. Tutorials from specialists. Experts you'd recognize from YouTube.

*Library window:*
Knowledge library.
WEBINAR · TAX & VAT · OSS vs IOSS: live Q&A mit verifizierten Steuerexperten · CompliHub360 Live · 90 Min.
VIDEO · TAX & VAT · Italian VAT registration: step-by-step · CompliHub360 Editorial · 8 Min.

> Note: the window fixtures still carry a few German strings (partner names, webinar title). They mirror the live workspace fixtures verbatim.

---

## 11 · FAQ (`HomeFaq`)

**Label:** Frequently asked

**Headline:** What you're **probably** wondering.

### Assessment & Risk Map

**Is the assessment really free?**
Yes. No account, no credit card. You get a structured risk map at the end. Registering after — to keep it, to match with providers, to receive alerts — is the optional next step.

**Where does the Risk Map's data come from?**
Every entry links to the official announcement, register page or case law it derives from — and is updated whenever a deadline moves, an authority clarifies or a register opens.

**Can I export my Risk Map?**
Yes. As a PDF for your records or your auditor — and in your workspace, your full trail is exportable at any time as PDF, CSV or via the API.

**Can I check several markets and areas at once?**
Yes. The assessment covers every market and area you operate in and merges the obligations into one coherent map — prioritised across all of them.

**What if my market isn't covered yet?**
Tell us where you operate. We add markets continuously, and early registrants help set the priority — we will alert you the moment your market goes live.

### Partners & engagements

**Are you giving me legal advice?**
No. CompliHub360 maps obligations and surfaces what is likely to apply to your operation — it is not legal advice. When a matter needs a binding opinion, we connect you to a Verified Partner who can give one.

**How are Verified Partners vetted?**
Every partner is reviewed by us on domain coverage, response time, and named real-world outcomes — not a self-listed directory. Each engagement is contractual, with shared accountability for the matter.

**What does an engagement cost?**
Each Verified Partner publishes a fixed estimate before you accept — no discovery calls just to learn the price. You see the range and scope up front, and approve it before any work begins.

**How fast does a partner respond?**
24–48 hours to the first response, contractually agreed. If it slips, we automatically route your request to the next available Verified Partner.

**Am I tied to one partner?**
No. Every engagement is contracted individually. You can request further matches or switch at any time — your trail and your Risk Map remain yours.

### Account & data

**Do I need an account?**
Not for the assessment — it runs in your browser without one. You only need a free account to keep your Risk Map, unlock matches or receive alerts.

**How is my data handled?**
The assessment runs in your browser and needs no account. If you register, your dossier is stored under EU data-protection rules, encrypted, and never sold or shared without your instruction.

---

## 12 · Footer (`SiteFooter`, incl. `NewsletterBand`)

### Newsletter band

**Eyebrow:** Stay current
**Headline:** When a regulation moves, you'll know.
**Description:** One brief per month. New thresholds, deadlines, and authoritative source links — for the markets you operate in. No promotional content.
**Link:** Or unlock real-time alerts with a free account
**Card title:** The monthly briefing
**Input:** placeholder "you@yourcompany.com" · aria "Email address" · button "Subscribe"
**Success:** You're on the list — check your inbox.
**Privacy line:** We use your email only for the brief. Unsubscribe in one click. See our privacy policy.

### Footer body

**Tagline:** The orchestration layer between compliance complexity and operational reality.
**Note:** Not a law firm. We orchestrate verified specialists.
**Beta tag:** Beta

| Platform | Compliance areas | Markets | Company |
|---|---|---|---|
| How it works | All areas | All markets | About |
| Who it is for | Tax & VAT | Germany | Partners |
| Pricing | EPR & Packaging | France | Trust & Security |
| Start Assessment | Data & Privacy | United States | Contact |
| | Marketing Compliance | United Kingdom | Support |
| | Corporate & Structure | Italy | |
| | Product Compliance | Spain | |
| | Logistics & Customs | Netherlands | |
| | Legal Advisory | Türkiye | |

**Markets line:** Markets we cover today: Germany · United Kingdom · Netherlands · France · Italy · Spain. More countries rolling out through 2026.

**Disclaimer:** CompliHub360 is an orchestration platform — not a law firm. Legal, tax, and regulatory advice is delivered by Verified Partners under their own professional liability. We do not provide Rechtsberatung within the meaning of §§ RDG / StBerG.

**Copyright:** © 2026 CompliHub360.
**Legal links:** Privacy Policy · Terms (AGB) · Impressum · Cookie Policy · Sub-Processors
