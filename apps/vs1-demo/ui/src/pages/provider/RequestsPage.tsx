import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Inbox } from 'lucide-react';
import { Moon, ChevronDown } from 'lucide-react';
import { ProviderShell } from '../../components/provider/ProviderShell';
import { Banner } from '../../components/ui/Banner';
import { FilterChip } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { RequestCard, type RequestStatus } from '../../components/ui/RequestCard';
import { ThreadDrawer } from '../../components/shared/ThreadDrawer';
import { EmptyState } from '../../components/ui/EmptyState';
import { useApiData } from '../../lib/useApiData';
import { fetchProviderRequests } from '../../api/requests';

// ─── Provider /requests ───────────────────────────────────────────────────────
// Mirrors the Figma screen "Provider Dashboard v1 · /requests (Desktop)"
// (0tJtkBs5… 1908:16): new-requests banner · header with OOO link · filter
// chips + SLA sort · request list built from <RequestCard>. Data is the design
// fixture until the requests API lands.

type Fixture = {
  id: string;
  status: RequestStatus;
  statusLabel: string;
  company: string;
  tag?: string;
  meta: string;
  sla?: string;
  action: { label: string; variant: 'accent' | 'primary' | 'ghost' };
};

const REQUESTS: Fixture[] = [
  {
    id: 'RQ-0234 · 12 min ago', status: 'awaiting-confirm', statusLabel: 'Awaiting confirm',
    company: 'Möbel-Berater Müller GmbH', tag: 'DE · EPR',
    meta: 'D2C · €4.2M revenue · target launch Q3 · sells furniture cross-border via own webshop + Amazon DE/AT marketplaces',
    sla: '23h 48m', action: { label: 'Open · confirm', variant: 'accent' },
  },
  {
    id: 'RQ-0233 · 2h ago', status: 'awaiting-confirm', statusLabel: 'Awaiting confirm',
    company: 'TexTec OÜ (Estonia)', tag: 'DE+AT · VAT',
    meta: 'B2B · €1.8M revenue · OSS registered DE only · expanding into AT under reverse-charge regime',
    sla: '21h 40m', action: { label: 'Open · confirm', variant: 'accent' },
  },
  {
    id: 'RQ-0232 · 8h ago', status: 'awaiting-confirm', statusLabel: 'Awaiting confirm',
    company: 'Smart-Stage UG', tag: 'DE · Data Privacy',
    meta: 'SaaS · €600k revenue · processes EU resident data · needs DPIA + GDPR Art. 30 records',
    sla: '14h 12m', action: { label: 'Open · confirm', variant: 'accent' },
  },
  {
    id: 'RQ-0228 · Yesterday', status: 'awaiting-reply', statusLabel: 'Awaiting reply',
    company: 'Brunnen Living Ltd.', tag: 'DE+UK · VAT',
    meta: 'D2C + Marketplace · €12M revenue · renewing annual VAT advisory retainer · prior engagements 2023+2024',
    sla: '36h 18m', action: { label: 'Reply', variant: 'primary' },
  },
  {
    id: 'RQ-0227 · 2 days ago', status: 'awaiting-reply', statusLabel: 'Awaiting reply',
    company: 'Nordic Decor AS', tag: 'NO · VAT',
    meta: 'D2C · €3M revenue · expanding to Norway · needs VOEC scheme guidance + cross-border invoicing',
    sla: '11h 04m', action: { label: 'Reply', variant: 'primary' },
  },
  {
    id: 'RQ-0225 · 4 days ago', status: 'active', statusLabel: 'Active',
    company: 'KraftKaffee GmbH', tag: 'DE · VAT',
    meta: 'D2C · €2.4M revenue · quarterly OSS filing in progress · Q2 deadline 2026-07-31',
    action: { label: 'View', variant: 'ghost' },
  },
];

const FILTERS = [
  { key: 'confirm', label: 'Awaiting confirmation · 3', match: 'awaiting-confirm' },
  { key: 'reply', label: 'Awaiting reply · 2', match: 'awaiting-reply' },
  { key: 'active', label: 'Active · 1', match: 'active' },
] as const;

export function RequestsPage() {
  // Demo states (Figma: OOO + First-Request-empty): append ?state=ooo | empty.
  const [params] = useSearchParams();
  const demoState = params.get('state');
  const [filter, setFilter] = useState<string>('confirm');
  const [bannerOpen, setBannerOpen] = useState(true);
  const [threadFor, setThreadFor] = useState<string | null>(null);
  // Live data when the compliance-api answers; the design fixture otherwise.
  const { data: requests } = useApiData(fetchProviderRequests, REQUESTS);
  const activeMatch = FILTERS.find((f) => f.key === filter)?.match;
  const list = requests.filter((r) => !activeMatch || r.status === activeMatch);

  return (
    <ProviderShell>
      <div className="mx-auto max-w-[1140px] space-y-5">
        {demoState === 'ooo' && (
          <Banner status="brand" title="Out of office active · until Mon 2026-07-14" action={<Button size="sm" variant="secondary">End early</Button>}>
            New requests are paused and re-routed · your ranking is frozen while away · SLA timers resume on return.
          </Banner>
        )}
        {bannerOpen && demoState !== 'ooo' && (
          <Banner
            status="info"
            title="2 new requests since you last checked · 12 min ago"
            action={<Button size="sm" variant="secondary" onClick={() => setBannerOpen(false)}>Mark all seen</Button>}
          >
            Magic-link emails sent · they'll appear here too
          </Banner>
        )}

        <div className="flex items-start justify-between gap-4">
          <h1 className="font-serif text-[30px] font-bold leading-tight text-fg">Requests</h1>
          <button type="button" className="mt-2 flex shrink-0 items-center gap-1.5 text-[12px] text-fg-secondary transition-colors hover:text-fg">
            <Moon size={13} /> Out of office
          </button>
        </div>
        <p className="-mt-3 max-w-3xl text-body-sm leading-relaxed text-fg-secondary">
          All requests routed to your workspace · push-anchored (email + magic-link). New requests highlighted with a
          persistent banner until confirmed. Default filter shows requests awaiting your action.
        </p>

        <div className="flex items-center gap-2">
          {FILTERS.map((f) => (
            <FilterChip key={f.key} selected={filter === f.key} onClick={() => setFilter(f.key)}>
              {f.label}
            </FilterChip>
          ))}
          <button type="button" className="ml-auto flex items-center gap-1 text-[12px] text-fg-tertiary transition-colors hover:text-fg">
            Sort: SLA urgency <ChevronDown size={12} />
          </button>
        </div>

        {demoState === 'empty' ? (
          <EmptyState
            icon={<Inbox size={28} />}
            title="No requests yet"
            description="Your profile is live. New requests land here + in your inbox as magic-links — most partners receive their first request within 5 days."
            action={<Button size="sm" variant="secondary">Preview public profile</Button>}
          />
        ) : (
        <div className="space-y-2.5">
          {list.map((r) => (
            <RequestCard
              key={r.id}
              idLine={'idLine' in r ? (r as { idLine: string }).idLine : r.id}
              status={r.status}
              statusLabel={r.statusLabel}
              company={r.company}
              tag={r.tag}
              meta={r.meta}
              slaValue={r.sla}
              action={<Button size="sm" variant={r.action.variant} onClick={() => setThreadFor(r.id)}>{r.action.label}</Button>}
            />
          ))}
        </div>
        )}
      </div>
      <ThreadDrawer open={!!threadFor} engagementId={threadFor} viewer="provider" onClose={() => setThreadFor(null)} />
    </ProviderShell>
  );
}
