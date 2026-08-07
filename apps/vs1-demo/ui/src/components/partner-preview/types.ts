// ─── Partner-preview view-model ───────────────────────────────────────────────
// Presentational types for the shared partner-dashboard blocks used BOTH on the
// provider landing page (preview) and (later) in the real partner dashboard.
// Decoupled from the thin `useDashboardStore` LeadRequest — the store maps its
// data into these richer view-models at the call site.

export type RequestPriority = 'critical' | 'high' | 'medium' | 'low';

export interface RequestObligation {
  level: RequestPriority;
  /** e.g. "OSS quarterly return — due Apr 30 · UStG §18i" */
  text: string;
}

/** A structured, pre-scoped engagement request (the core "lead" card). */
export interface PartnerRequest {
  id: string;
  isNew?: boolean;
  /** Match score 0–100. */
  matchPct: number;
  /** e.g. "D2C e-commerce · DE · UK · Netherlands" */
  title: string;
  /** e.g. "€2M — €5M revenue · founded 2022" */
  meta: string;
  obligations: RequestObligation[];
  /** e.g. "arrived 4 min ago" */
  arrived?: string;
  /** e.g. "€92 on accept" (compact) or full fee note. */
  feeNote?: string;
}

/** A condensed inbox row (collapsed lead). */
export interface InboxLead {
  id: string;
  /** e.g. "SaaS · IT · €5M—€25M" */
  title: string;
  matchPct?: number;
  /** e.g. "1 Critical · 2 Medium · 2h ago" or "· 2 days" */
  meta: string;
  dimmed?: boolean;
}

export interface TierKpi {
  label: string;
  value: string;
  sub: string;
}

export interface TierSummary {
  tierName: string; // "Founding Partner · Tier 1"
  note: string; // "12% above network average · review in 23 days"
  windowLabel: string; // "Last 90 days"
  trend: string; // "↑ trending steady"
  kpis: TierKpi[];
  headsUp?: { title: string; body: string };
}

export interface CoverageCategory {
  label: string;
  on: boolean;
}

export interface CoverageSettings {
  categoriesActive: number;
  categoriesTotal: number;
  categories: CoverageCategory[];
  jurisdictionsActive: string[];
  jurisdictionsInactive: string[];
  autoPause: boolean;
}

export interface ActiveEngagement {
  client: string; // "Müller & Co. KG"
  meta: string; // "D2C e-commerce · DE / UK / NL · €2M—€5M"
  billedNote: string; // "✓ Accepted · $100 billed"
  handover: string[];
  privateNote: string;
}

export interface PartnerData {
  featuredRequest: PartnerRequest;
  /** The featured/active lead as a compact inbox row (highlighted). */
  inboxFeatured: InboxLead;
  inboxLeads: InboxLead[];
  tier: TierSummary;
  coverage: CoverageSettings;
  activeEngagement: ActiveEngagement;
}
