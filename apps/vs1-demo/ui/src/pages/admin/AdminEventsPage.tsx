import { useState } from 'react';
import { AdminShell } from '../../components/admin/AdminShell';
import { EntityCard } from '../../components/ui/Cards';
import { FilterChip } from '../../components/ui/Badge';
import { useApiData } from '../../lib/useApiData';
import { fetchNotificationsFeed, type FeedGroup } from '../../api/notifications';

// ─── Admin · Events & Audit (Figma 2975:556) ─────────────────────────────────
// The raw audit stream, newest first, filterable by domain. Reuses the
// event_log feed endpoint; payload snapshots render inline.

const FIXTURE: FeedGroup[] = [
  {
    day: 'Today',
    items: [
      { title: 'Engagement created · RQ-778E', event: 'primary_request_submitted', time: '2h ago', desc: 'FUNNEL · dahlmann-cpa · NL vat_oss', kind: 'request', unread: true },
      { title: 'Provider confirmed via magic link', event: 'provider_confirmed_via_magic_link', time: '5h ago', desc: 'FUNNEL · single-use token burned', kind: 'request' },
      { title: 'Document uploaded · sanitized', event: 'document_uploaded', time: '8h ago', desc: 'PRIVACY · 2 PII redacted · consent given', kind: 'system' },
    ],
  },
  {
    day: 'Yesterday',
    items: [
      { title: 'AI request blocked — no consent', event: 'document_ai_blocked', time: '26h ago', desc: 'PRIVACY · gate reason NO_CONSENT', kind: 'system' },
      { title: 'SLA reminder sent · RQ-4A07', event: 'sla_reminder_sent', time: '30h ago', desc: 'SLA · reply due · baltika-tax', kind: 'sla' },
    ],
  },
];

const FILTERS = ['All', 'Funnel', 'SLA', 'Security', 'Privacy', 'Billing'] as const;

const KIND_FILTER: Record<string, (desc: string) => boolean> = {
  All: () => true,
  Funnel: (d) => d.startsWith('FUNNEL') || d.includes('request'),
  SLA: (d) => d.startsWith('SLA') || d.toLowerCase().includes('sla'),
  Security: (d) => d.startsWith('SECURITY') || /token|auth|blocked/i.test(d),
  Privacy: (d) => d.startsWith('PRIVACY') || /consent|redact|document/i.test(d),
  Billing: (d) => d.startsWith('BILLING') || /invoice/i.test(d),
};

export function AdminEventsPage() {
  const { data, source } = useApiData(() => fetchNotificationsFeed().then((f) => f.groups), FIXTURE);
  const groups = data;
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const pred = KIND_FILTER[filter];

  return (
    <AdminShell>
      <div className="mx-auto flex max-w-[1160px] flex-col gap-6">
        <div>
          <h1 className="font-serif text-[32px] font-semibold text-fg">
            Events & <span className="text-fg-accent-emphasis">Audit</span>
          </h1>
          <p className="mt-1 text-[13px] text-fg-secondary">
            Every critical action — immutable, filterable, exportable.
            {source === 'fixture' && <span className="ml-2 text-fg-tertiary">· demo data</span>}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <FilterChip key={f} selected={filter === f} onClick={() => setFilter(f)}>
              {f}
            </FilterChip>
          ))}
        </div>

        {groups.map((g) => {
          const items = g.items.filter((it) => pred(`${it.desc} ${it.event}`));
          if (!items.length) return null;
          return (
            <section key={g.day}>
              <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-fg-tertiary">{g.day}</h2>
              <div className="flex flex-col gap-3">
                {items.map((it, i) => (
                  <EntityCard
                    key={`${g.day}-${i}`}
                    name={it.title}
                    meta={it.desc || it.event}
                    trailing={<span className="text-[11px] text-fg-tertiary">{it.time}</span>}
                    unread={it.unread}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </AdminShell>
  );
}
