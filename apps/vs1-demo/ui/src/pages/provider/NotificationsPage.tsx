import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ProviderShell } from '../../components/provider/ProviderShell';
import { Button } from '../../components/ui/Button';
import { FilterChip } from '../../components/ui/Badge';
import { Tag } from '../../components/ui/Tag';
import { Card } from '../../components/ui/Card';
import { useApiData } from '../../lib/useApiData';
import { fetchEventLogFeed, NOTIFICATIONS_VIEWER, type FeedItem } from '../../api/notifications';
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

// Design fixture: company names, RQ-IDs, amounts and the client quote are data
// and stay verbatim; all surrounding labels come from the providerws namespace.
function buildFeedFixture(t: (k: string, o?: Record<string, unknown>) => string): Feed[] {
  return [
    {
      day: t('notifications.dayToday'),
      items: [
        { title: `${t('notifications.itemNewRequest')} · Möbel-Berater Müller GmbH`, event: 'request_routed', time: t('notifications.timeMinAgo', { count: 12 }), unread: true, kind: 'request',
          desc: t('notifications.descRq0234'), action: t('notifications.actionOpenRq', { id: 'RQ-0234' }) },
        { title: `${t('notifications.itemNewRequest')} · TexTec OÜ (Estonia)`, event: 'request_routed', time: t('notifications.timeHoursAgo', { count: 2 }), unread: true, kind: 'request',
          desc: t('notifications.descRq0233'), action: t('notifications.actionOpenRq', { id: 'RQ-0233' }) },
        { title: `${t('notifications.itemSlaReminder')} · RQ-0232 · Smart-Stage UG`, event: 'sla_reminder_sent', time: t('notifications.timeHoursAgo', { count: 4 }), kind: 'sla',
          desc: t('notifications.descRq0232'), action: t('notifications.actionOpenRq', { id: 'RQ-0232' }) },
      ],
    },
    {
      day: t('notifications.dayYesterday'),
      items: [
        { title: `${t('notifications.itemEngagementClosed')} · Lampada B.V. · NL VAT cleanup`, event: 'engagement_completed', time: `${t('notifications.dayYesterday')} · 18:34`, kind: 'system',
          desc: t('notifications.descEngagementClosed') },
        { title: `${t('notifications.itemNewReview')} · Lampada B.V.`, event: 'client_review_posted', time: `${t('notifications.dayYesterday')} · 18:34`, kind: 'review',
          desc: '"Schneller Turnaround, präzise Kommunikation. Hat exakt unsere Lücke geschlossen." — Marlies Hertog, Managing Director' },
      ],
    },
  ];
}

const KIND_CHIPS: { key: FeedItem['kind']; labelKey: string }[] = [
  { key: 'request', labelKey: 'notifications.chipRequests' },
  { key: 'sla', labelKey: 'notifications.chipSla' },
  { key: 'billing', labelKey: 'notifications.chipBilling' },
  { key: 'review', labelKey: 'notifications.chipReviews' },
  { key: 'system', labelKey: 'notifications.chipSystem' },
];

// api-delivered day labels → localized (defaultValue = raw label from the API).
const DAY_KEY: Record<string, string> = {
  Today: 'notifications.dayToday',
  Yesterday: 'notifications.dayYesterday',
};

export function NotificationsPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('providerws');
  const locale = i18n.resolvedLanguage || 'en';
  const [filter, setFilter] = useState<'all' | 'unread' | FeedItem['kind']>('all');
  // C1: once "Mark all read" ran, everything renders as read without a refetch.
  const [allSeen, setAllSeen] = useState(false);
  const [marking, setMarking] = useState(false);
  // Live event feed when the compliance-api answers; the design fixture otherwise.
  const { data } = useApiData(fetchEventLogFeed, { groups: buildFeedFixture(t), lastSeen: null });

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
          <h1 className="font-serif text-[30px] font-bold leading-tight text-fg">{t('notifications.title')}</h1>
          <div className="mt-1 flex shrink-0 items-center gap-2.5">
            <Button size="sm" variant="secondary" onClick={markAllRead} disabled={marking || unreadCount === 0}>
              {marking ? '…' : t('notifications.markAllRead')}
            </Button>
            <Button size="sm" variant="ghost">{t('notifications.preferences')}</Button>
          </div>
        </div>
        <p className="-mt-3 max-w-4xl text-body-sm leading-relaxed text-fg-secondary">
          {t('notifications.subtitle')}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <FilterChip size="sm" selected={filter === 'all'} onClick={() => setFilter('all')}>
            {t('notifications.chipAll')} · {flat.length}
          </FilterChip>
          <FilterChip size="sm" selected={filter === 'unread'} onClick={() => setFilter('unread')}>
            {t('notifications.chipUnread')} · {unreadCount}
          </FilterChip>
          {KIND_CHIPS.filter((c) => flat.some((i) => i.kind === c.key)).map((c) => (
            <FilterChip key={c.key} size="sm" selected={filter === c.key} onClick={() => setFilter(c.key)}>
              {t(c.labelKey)} · {flat.filter((i) => i.kind === c.key).length}
            </FilterChip>
          ))}
        </div>

        {visible.length === 0 && (
          <p className="text-[13px] text-fg-tertiary">{t('notifications.emptyFilter')}</p>
        )}
        {visible.map((group) => (
          <section key={group.day} className="space-y-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">
              {DAY_KEY[group.day] ? t(DAY_KEY[group.day], { defaultValue: group.day }) : group.day}
            </p>
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
                      const booking = 'bookingId' in n ? (n as FeedItem).bookingId : undefined;
                      if (booking) { navigate(`/${locale}/partner-dashboard/termine`); return; }
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
