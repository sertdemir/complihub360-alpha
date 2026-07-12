import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { UserShell } from '../../components/user/UserShell';
import { Button } from '../../components/ui/Button';
import { FilterChip } from '../../components/ui/Badge';
import { RequestCard, type RequestStatus } from '../../components/ui/RequestCard';
import { ThreadDrawer } from '../../components/shared/ThreadDrawer';
import { useApiData } from '../../lib/useApiData';
import { fetchUserRequests } from '../../api/requests';

// ─── User Dashboard · Requests / Lead Center ──────────────────────────────────
// Mirrors "User Dashboard v1 · Requests / Lead Center (Desktop)" (2051:54):
// gold-word header · filter chips · Request Cards with PARTNER tag + session
// link meta. Design fixture data.

type Fixture = {
  uuid?: string;
  id: string; status: RequestStatus; statusLabel: string; company: string;
  partner?: boolean; meta: string; action: { label: string; variant: 'accent' | 'secondary' };
  bucket: 'confirm' | 'confirmed' | 'replied' | 'overdue' | 'active';
};

const REQUESTS: Fixture[] = [
  { id: 'RQ-881 · sent 14h ago', status: 'awaiting-confirm', statusLabel: 'Awaiting confirmation', company: 'Studio Bianchi SRL', partner: true,
    meta: '↗ VAT registration · Italy · avg. reply 18h', action: { label: 'Send reminder', variant: 'accent' }, bucket: 'confirm' },
  { id: 'RQ-842 · sent 4d ago', status: 'active', statusLabel: 'Active', company: 'Lex Privacy LLP', partner: true,
    meta: '↗ GDPR audit · UK', action: { label: 'Open thread', variant: 'secondary' }, bucket: 'active' },
  { id: 'RQ-864 · sent 2d ago', status: 'awaiting-reply', statusLabel: 'Provider replied', company: 'PackComply GmbH', partner: true,
    meta: '↗ EPR registration · France · reply 8h ago', action: { label: 'Open thread', variant: 'secondary' }, bucket: 'replied' },
  { id: 'RQ-818 · sent 6h ago · reply ETA 24h', status: 'active', statusLabel: 'Provider confirmed', company: 'Schmidt & Partner',
    meta: '↗ VAT roadmap · EU-wide', action: { label: 'View thread', variant: 'secondary' }, bucket: 'confirmed' },
  { id: 'RQ-819 · sent 3h ago · avg. reply 17h', status: 'awaiting-confirm', statusLabel: 'Awaiting confirmation', company: 'Madrid Tax Consultancy', partner: true,
    meta: '↗ VAT thresholds · Spain', action: { label: 'View request', variant: 'secondary' }, bucket: 'overdue' },
];

const FILTERS = [
  { key: 'all', label: 'All · 5' },
  { key: 'confirm', label: 'Awaiting confirmation · 2' },
  { key: 'confirmed', label: 'Confirmed · 1' },
  { key: 'replied', label: 'Replied · 1' },
  { key: 'overdue', label: 'Overdue · 1' },
] as const;

export function UserRequestsPage() {
  const [filter, setFilter] = useState<string>('all');
  const [threadFor, setThreadFor] = useState<string | null>(null);
  const { data: rows } = useApiData<Fixture[]>(fetchUserRequests, REQUESTS);
  const list = rows.filter((r) => filter === 'all' || r.bucket === filter);

  return (
    <UserShell activeDomain="Tax & VAT">
      <div className="mx-auto max-w-[1140px] space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-[32px] font-bold leading-tight text-fg">
              Your provider <span className="text-fg-accent">requests</span>.
            </h1>
            <p className="mt-1 text-body-sm text-fg-secondary">
              5 active · 1 overdue · 12 closed this quarter · avg. reply 22h
            </p>
          </div>
          <div className="mt-1 flex shrink-0 items-center gap-4">
            <a href="#" className="text-[12px] font-medium text-fg underline underline-offset-2">Export CSV</a>
            <Button size="sm">Find provider</Button>
          </div>
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
          {list.map((r) => (
            <RequestCard
              key={r.id}
              idLine={r.id}
              status={r.status}
              statusLabel={r.statusLabel}
              company={r.company}
              tag={r.partner ? 'PARTNER' : undefined}
              meta={r.meta}
              action={<Button size="sm" variant={r.action.variant} onClick={() => r.uuid && setThreadFor(r.uuid)}>{r.action.label}</Button>}
            />
          ))}
        </div>

        <p className="text-[11px] text-fg-tertiary">
          ● Average partner response on your workspace: 22h · 87% confirm within SLA · last 30 days
        </p>
      </div>
      <ThreadDrawer open={!!threadFor} engagementId={threadFor} viewer="user" onClose={() => setThreadFor(null)} />
    </UserShell>
  );
}
