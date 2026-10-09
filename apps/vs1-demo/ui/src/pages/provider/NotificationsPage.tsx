import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ProviderShell } from '../../components/provider/ProviderShell';
import { Button } from '../../components/ui/Button';
import { FilterChip } from '../../components/ui/Badge';
import { Tag } from '../../components/ui/Tag';
import { Card } from '../../components/ui/Card';
import { useWorkspaceData } from '../../lib/useWorkspaceData';
import { LoadFailedState } from '../../components/provider/WorkspaceStates';
import { ApiError } from '../../api/client';
import { fetchEventLogFeed, NOTIFICATIONS_VIEWER, type FeedItem } from '../../api/notifications';
import { markSeen } from '../../api/reads';

// ─── Provider /notifications ──────────────────────────────────────────────────
// Mirrors "Provider Dashboard v1 · /notifications (Desktop)": aggregated event
// feed grouped by day, filter chips, per-event type tag + action link.
// C1: unread comes from the read-state watermark; chips carry live counts and
// actually filter; "Mark all read" persists the watermark.
//
// TKT-PROV-12: keine Fixture mehr. Die Quelle ist das Betriebsprotokoll, und
// das antwortet einem Anbieter mit 403 — eine eigene Quelle fuer Anbieter gibt
// es noch nicht. Ein 403 ist kein voruebergehender Fehler, also kein A2,
// sondern „Noch keine Benachrichtigungen" (bell.empty).

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
  const feed = useWorkspaceData(fetchEventLogFeed);
  const noFeedForAccount = feed.state === 'error' && feed.error instanceof ApiError && feed.error.status === 403;
  const data = feed.data ?? { groups: [], lastSeen: null };

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
    } catch { /* der Server hat nicht gespeichert; lokal trotzdem gelesen */ }
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

        {feed.state === 'loading' && <div aria-busy="true" className="h-24 animate-pulse rounded-xl bg-surface-secondary/60 motion-reduce:animate-none" />}
        {feed.state === 'error' && !noFeedForAccount && <LoadFailedState surface="notifications" error={feed.error} onRetry={feed.reload} section />}
        {(noFeedForAccount || (feed.state === 'ready' && flat.length === 0)) && (
          <p className="text-[13px] text-fg-tertiary">{t('bell.empty')}</p>
        )}
        {feed.state === 'ready' && flat.length > 0 && visible.length === 0 && (
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
