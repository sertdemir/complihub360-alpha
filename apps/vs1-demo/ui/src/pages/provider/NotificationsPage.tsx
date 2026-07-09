import { useState } from 'react';
import { ProviderShell } from '../../components/provider/ProviderShell';
import { Button } from '../../components/ui/Button';
import { FilterChip } from '../../components/ui/Badge';
import { Tag } from '../../components/ui/Tag';
import { Card } from '../../components/ui/Card';
import { useApiData } from '../../lib/useApiData';
import { fetchNotifications } from '../../api/notifications';

// ─── Provider /notifications ──────────────────────────────────────────────────
// Mirrors "Provider Dashboard v1 · /notifications (Desktop)": aggregated event
// feed grouped by day, filter chips, per-event type tag + action link. Fixture.

type Feed = {
  day: string;
  items: {
    title: string; event: string; time: string; desc: string;
    action?: string; unread?: boolean; kind: 'request' | 'sla' | 'billing' | 'system' | 'review';
  }[];
};

const FEED: Feed[] = [
  {
    day: 'Today',
    items: [
      { title: 'New request · Möbel-Berater Müller GmbH', event: 'request_routed', time: '12 min ago', unread: true, kind: 'request',
        desc: 'EPR setup for DE marketplace launch · €4.2M revenue · 91% match score · SLA 24h from now', action: 'Open RQ-0234 →' },
      { title: 'New request · TexTec OÜ (Estonia)', event: 'request_routed', time: '2h ago', unread: true, kind: 'request',
        desc: 'VAT review for DE+AT · €1.8M revenue · OSS expansion · 84% match score', action: 'Open RQ-0233 →' },
      { title: 'SLA reminder · RQ-0232 · Smart-Stage UG', event: 'sla_reminder_sent', time: '4h ago', kind: 'sla',
        desc: 'Reminder #1 (T+24h) sent · 14h 12m remaining before reroute · DPIA workshop for SaaS company', action: 'Open RQ-0232 →' },
    ],
  },
  {
    day: 'Yesterday',
    items: [
      { title: 'Engagement closed · Lampada B.V. · NL VAT cleanup', event: 'engagement_completed', time: 'Yesterday · 18:34', kind: 'system',
        desc: 'Client marked engagement complete · 5-star rating · €3,600 invoiced · trust_score +2' },
      { title: 'New 5-star review · Lampada B.V.', event: 'client_review_posted', time: 'Yesterday · 18:34', kind: 'review',
        desc: '"Schneller Turnaround, präzise Kommunikation. Hat exakt unsere Lücke geschlossen." — Marlies Hertog, Managing Director' },
    ],
  },
];

const FILTERS = ['All · 42', 'Unread · 2', 'Requests · 18', 'SLA · 8', 'Governance · 1', 'Billing · 6', 'System · 9'];

export function NotificationsPage() {
  const [filter, setFilter] = useState('All · 42');
  // Live event feed when the compliance-api answers; the design fixture otherwise.
  const { data: feed } = useApiData(fetchNotifications, FEED);
  return (
    <ProviderShell>
      <div className="mx-auto max-w-[1140px] space-y-5">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-serif text-[30px] font-bold leading-tight text-fg">Notifications</h1>
          <div className="mt-1 flex shrink-0 items-center gap-2.5">
            <Button size="sm" variant="secondary">Mark all read</Button>
            <Button size="sm" variant="ghost">Preferences</Button>
          </div>
        </div>
        <p className="-mt-3 max-w-4xl text-body-sm leading-relaxed text-fg-secondary">
          Aggregated event feed from canonical event model. New requests · SLA reminders · downgrade warnings ·
          payment events · attachment processing. Configure per-channel delivery (email + in-app) in Settings → Notifications.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <FilterChip key={f} size="sm" selected={filter === f} onClick={() => setFilter(f)}>{f}</FilterChip>
          ))}
        </div>

        {feed.map((group) => (
          <section key={group.day} className="space-y-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">{group.day}</p>
            {group.items.map((n) => (
              <Card key={n.title} styleVariant="filled" className={n.unread ? 'border-l-2 border-l-fg-brand p-4' : 'p-4'}>
                <div className="flex items-center gap-2.5">
                  <p className="text-[13px] font-semibold text-fg">{n.title}</p>
                  <Tag tone={n.kind === 'request' ? 'brand' : n.kind === 'sla' ? 'warning' : n.kind === 'review' ? 'success' : 'neutral'}>
                    {n.event}
                  </Tag>
                  <span className="ml-auto shrink-0 text-[11px] text-fg-tertiary">{n.time}</span>
                </div>
                <p className="mt-1.5 text-[12px] leading-relaxed text-fg-secondary">{n.desc}</p>
                {n.action && (
                  <a href="#" className="mt-2 inline-block text-[12px] font-medium text-fg-brand underline-offset-2 hover:underline">{n.action}</a>
                )}
              </Card>
            ))}
          </section>
        ))}
      </div>
    </ProviderShell>
  );
}
