import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { UserShell } from '../../components/user/UserShell';
import { Button } from '../../components/ui/Button';
import { FilterChip } from '../../components/ui/Badge';
import { SessionRow, type SessionRisk } from '../../components/ui/SessionRow';

// ─── User Dashboard · Sessions ────────────────────────────────────────────────
// Mirrors "User Dashboard v1 · Sessions list (Desktop)" (2051:48): gold-word
// header · filter chips · Session Rows with country badge, domain pill,
// NEEDS-REFRESH status, risk line + Open action. Design fixture data.

type Fixture = {
  country: string; domain: string; needsRefresh?: boolean; updated: string;
  title: string; riskLine: string; risk: SessionRisk;
};

const SESSIONS: Fixture[] = [
  { country: 'IT', domain: 'Tax & VAT', needsRefresh: true, updated: '· Updated 2h ago', title: 'VAT registration · Italy', riskLine: '● High risk · threshold reached · 1 markets', risk: 'high' },
  { country: 'FR', domain: 'Product & Packaging', updated: '· Updated 1d ago', title: 'EPR registration · France', riskLine: '● Medium risk · deadline Q3 2026 · 1 markets', risk: 'medium' },
  { country: 'UK', domain: 'Data & Privacy', needsRefresh: true, updated: '· Updated 3d ago', title: 'GDPR audit & DPA review', riskLine: '● High risk · cookie consent · 1 markets', risk: 'high' },
  { country: 'ES', domain: 'Tax & VAT', updated: '· Updated 7d ago', title: 'VAT thresholds · Spain', riskLine: '● Low risk · monitoring only · 1 markets', risk: 'low' },
  { country: 'DE', domain: 'Data & Privacy', updated: '· Updated 14d ago', title: 'Cookie consent setup', riskLine: '● Medium risk · review pending · 1 markets', risk: 'medium' },
  { country: 'DE', domain: 'Tax & VAT', updated: '· Updated 1mo ago', title: 'VAT roadmap · EU-wide', riskLine: '● Low risk · compliant · 4 markets', risk: 'low' },
];

const FILTERS = [
  { key: 'all', label: 'All · 6', match: () => true },
  { key: 'refresh', label: 'Need refresh · 2', match: (s: Fixture) => !!s.needsRefresh },
  { key: 'vat', label: 'Tax & VAT · 3', match: (s: Fixture) => s.domain === 'Tax & VAT' },
  { key: 'privacy', label: 'Privacy · 2', match: (s: Fixture) => s.domain === 'Data & Privacy' },
  { key: 'packaging', label: 'Packaging · 1', match: (s: Fixture) => s.domain === 'Product & Packaging' },
];

export function SessionsPage() {
  const [filter, setFilter] = useState('all');
  const match = FILTERS.find((f) => f.key === filter)?.match ?? (() => true);
  const list = SESSIONS.filter(match);

  return (
    <UserShell activeDomain="Tax & VAT">
      <div className="mx-auto max-w-[1140px] space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-[32px] font-bold leading-tight text-fg">
              Your compliance <span className="text-fg-accent">sessions</span>.
            </h1>
            <p className="mt-1 text-body-sm text-fg-secondary">
              6 sessions saved · 2 need a refresh · last updated 2h ago
            </p>
          </div>
          <Button className="mt-1 shrink-0">Start new search</Button>
        </div>

        <div className="flex items-center gap-2">
          {FILTERS.map((f) => (
            <FilterChip key={f.key} size="sm" selected={filter === f.key} onClick={() => setFilter(f.key)}>
              {f.label}
            </FilterChip>
          ))}
          <button type="button" className="ml-auto flex items-center gap-1 text-[12px] text-fg-tertiary transition-colors hover:text-fg">
            Sort: Last updated <ChevronDown size={12} />
          </button>
        </div>

        <div className="space-y-2.5">
          {list.map((s) => (
            <SessionRow
              key={s.title}
              country={s.country}
              domain={s.domain}
              status={s.needsRefresh ? 'Needs refresh' : undefined}
              updated={s.updated}
              title={s.title}
              riskLine={s.riskLine}
              risk={s.risk}
              onMenu={() => {}}
              action={<Button size="sm" variant="accent">Open</Button>}
            />
          ))}
        </div>
      </div>
    </UserShell>
  );
}
