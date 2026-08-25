import type { PartnerData } from './types';

// ─── Demo fixture ─────────────────────────────────────────────────────────────
// Realistic CompliHub360 partner data in the presentational view-model shape. Used
// by the landing-page previews. The real dashboard maps `useDashboardStore` data
// into this same shape when it adopts these blocks.

export const demoPartnerData: PartnerData = {
  featuredRequest: {
    id: 'req-d2c',
    isNew: true,
    matchPct: 94,
    title: 'D2C e-commerce · DE · UK · Netherlands',
    meta: '€2M — €5M revenue · founded 2022',
    arrived: 'arrived 4 min ago',
    feeNote: '€92 on accept',
    obligations: [
      { level: 'critical', text: 'OSS quarterly return — due Apr 30 · UStG §18i' },
      { level: 'critical', text: 'EPR LUCID registration — VerpackG Art. 9' },
      { level: 'high', text: 'EPR PackUK renewal — May 15' },
    ],
  },
  inboxFeatured: { id: 'l-d2c', title: 'D2C · DE / UK / NL · €2M—€5M', matchPct: 94, meta: '2 Critical · 1 High · arrived 4m ago', dimmed: false },
  inboxLeads: [
    { id: 'l-saas', title: 'SaaS · IT · €5M—€25M', matchPct: 88, meta: '1 Critical · 2 Medium · 2h ago', dimmed: true },
    { id: 'l-mkt', title: 'Marketplace · NL · DE · €25M+', matchPct: 81, meta: '3 Critical · arrived yesterday', dimmed: true },
  ],
  tier: {
    tierName: 'Founding Partner · Tier 1',
    note: '12% above network average · review in 23 days',
    windowLabel: 'Last 90 days',
    trend: '↑ trending steady',
    kpis: [
      { label: 'Acceptance rate', value: '87%', sub: '↑ 4pp vs last month' },
      { label: 'Avg confirm time', value: '6h', sub: 'within 24h SLA' },
      { label: 'SLA breaches', value: '1', sub: 'in last 7 days' },
      { label: 'Active engagements', value: '5', sub: 'auto-pause at 5+' },
    ],
    headsUp: {
      title: 'Heads-up — 1 confirm-SLA breach in last 7 days.',
      body: '2 more breaches in next 14 days triggers Tier-2 review. Action recommended within 3 days.',
    },
  },
  coverage: {
    categoriesActive: 2,
    categoriesTotal: 5,
    categories: [
      { label: 'Tax & VAT', on: true },
      { label: 'EPR & Packaging', on: true },
      { label: 'Data & Privacy', on: false },
      { label: 'Marketing Compliance', on: false },
      { label: 'Corporate & Structure', on: false },
    ],
    jurisdictionsActive: ['DE', 'UK', 'NL'],
    jurisdictionsInactive: ['FR'],
    autoPause: true,
  },
  activeEngagement: {
    client: 'Müller & Co. KG',
    meta: 'D2C e-commerce · DE / UK / NL · €2M—€5M',
    billedNote: '✓ Accepted · $100 billed',
    handover: [
      'Full Risk Map · 8 obligations · €25k exposure',
      'Statutory citations + penalty matrix',
      'Direct contact details unlocked',
      'Download · PDF / JSON',
    ],
    privateNote: '"Sent intro doc on Mon. Awaiting their VAT-ID. Follow up Wed."',
  },
};
