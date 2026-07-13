import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ProviderShell } from '../../components/provider/ProviderShell';
import { Button } from '../../components/ui/Button';
import { FilterChip } from '../../components/ui/Badge';
import { Tag } from '../../components/ui/Tag';
import { Card } from '../../components/ui/Card';
import { useApiData } from '../../lib/useApiData';
import { fetchNotificationsFeed, NOTIFICATIONS_VIEWER, type FeedItem } from '../../api/notifications';
import { markSeen } from '../../api/reads';

// ─── Provider /notifications ──────────────────────────────────────────────────
// Mirrors "Provider Dashboard v1 · /notifications (Desktop)": aggregated event
// feed grouped by day, filter chips, per-event type tag + action link.
// C1: unread comes from the read-state watermark; chips carry live counts and
// actually filter; "Mark all read" persists the watermark.

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

const KIND_CHIPS: { key: FeedItem['kind']; label: string }[] = [
  { key: 'request', label: 'Requests' },
  { key: 'sla', label: 'SLA' },
  { key: 'billing', label: 'Billing' },
  { key: 'review', label: 'Reviews' },
  { key: 'system', label: 'System' },
];

export function NotificationsPage() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || 'en';
  const [filter, setFilter] = useState<'all' | 'unread' | FeedItem['kind']>('all');
  // C1: once "Mark all read" ran, everything renders as read without a refetch.
  const [allSeen, setAllSeen] = useState(false);
  const [marking, setMarking] = useState(false);
  // Live event feed when the compliance-api answers; the design fixture otherwise.
  const { data } = useApiData(fetchNotificationsFeed, { groups: FEED, lastSeen: null });

  const withReadState = data.groups.map((g) => ({
    ...g,
    items: g.items.map((i) => (allSeen ? { ...i, unread: false } : i)),
  }));
  const flat = withReadState.flatMap((g) => g.items);
  const unreadCount = flat.filter((i) => i.unread).length;
  const matches = (i: (typeof flat)[number]) =>
    filter === 'all' ? true : filter === 'unread' ? !!i.unread : i.kind === filter;
  const visible = withReadState
    .map((g) => ({ ...g, items: g.items.filter(matches) }))
    .filter((g) => g.items.length > 0);

  const markAllRead = async () => {
    setMarking(true);
    try {
      await markSeen(NOTIFICATIONS_VIEWER);
    } catch { /* fixture mode: still clear locally */ }
    setAllSeen(true);
    setMarking(false);
  };

  return (
    <ProviderShell>
      <div className="mx-auto max-w-[1140px] space-y-5">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-serif text-[30px] font-bold leading-tight text-fg">Notifications</h1>
          <div className="mt-1 flex shrink-0 items-center gap-2.5">
            <Button size="sm" variant="secondary" onClick={markAllRead} disabled={marking || unreadCount === 0}>
              {marking ? '…' : 'Mark all read'}
            </Button>
            <Button size="sm" variant="ghost">Preferences</Button>
          </div>
        </div>
        <p className="-mt-3 max-w-4xl text-body-sm leading-relaxed text-fg-secondary">
          Aggregated event feed from canonical event model. New requests · SLA reminders · downgrade warnings ·
          payment events · attachment processing. Configure per-channel delivery (email + in-app) in Settings → Notifications.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <FilterChip size="sm" selected={filter === 'all'} onClick={() => setFilter('all')}>
            All · {flat.length}
          </FilterChip>
          <FilterChip size="sm" selected={filter === 'unread'} onClick={() => setFilter('unread')}>
            Unread · {unreadCount}
          </FilterChip>
          {KIND_CHIPS.filter((c) => flat.some((i) => i.kind === c.key)).map((c) => (
            <FilterChip key={c.key} size="sm" selected={filter === c.key} onClick={() => setFilter(c.key)}>
              {c.label} · {flat.filter((i) => i.kind === c.key).length}
            </FilterChip>
          ))}
        </div>

        {visible.length === 0 && (
          <p className="text-[13px] text-fg-tertiary">Nothing here — try another filter.</p>
        )}
        {visible.map((group) => (
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
                  <button
                    type="button"
                    onClick={() => {
                      const eng = 'engagementId' in n ? (n as FeedItem).engagementId : undefined;
                      navigate(`/${locale}/partner-dashboard/requests${eng ? `?thread=${eng}` : ''}`);
                    }}
                    className="mt-2 inline-block text-[12px] font-medium text-fg-brand underline-offset-2 hover:underline"
                  >{n.action}</button>
                )}
              </Card>
            ))}
          </section>
        ))}
      </div>
    </ProviderShell>
  );
}
