import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bookmark } from 'lucide-react';
import { UserShell } from '../../components/user/UserShell';
import { FilterChip } from '../../components/ui/Badge';
import { Tag } from '../../components/ui/Tag';
import { EntityCard } from '../../components/ui/Cards';
import { useApiData } from '../../lib/useApiData';
import { fetchNotificationsFeed, USER_NOTIFICATIONS_VIEWER, type FeedGroup, type FeedItem } from '../../api/notifications';

// ─── User Dashboard · Notifications ───────────────────────────────────────────
// Mirrors "User · Notifications (Desktop)" (2675:3): filter chips + day-grouped
// feed rows (type tag + time + detail). Live event feed with its own C1
// read-state; rows with an engagement deep-link (C12) open the request thread.
// Fixture feed rows are demo data and stay untranslated.

const FIXTURE: FeedGroup[] = [
  { day: 'Today', items: [
    { title: 'Provider replied · Verifizierte Steuerkanzlei · Norditalien', event: 'REQUEST', kind: 'request', time: '12 min', unread: true,
      desc: 'Proposal received for VAT registration · Italy' },
    { title: 'SLA reminder · Verifizierte Datenschutz-Kanzlei · UK', event: 'SLA', kind: 'sla', time: '4h',
      desc: 'No response in 96h — re-route to another partner available' },
    { title: 'Risk threshold reached · Italy VAT', event: 'MONITORING', kind: 'system', time: '6h',
      desc: '€145k IT revenue — €10k EU-wide OSS threshold exceeded' },
  ]},
  { day: 'Yesterday', items: [
    { title: 'Session refreshed · GDPR audit & DPA review', event: 'SYSTEM', kind: 'system', time: '18:34',
      desc: 'New regulatory rules applied — review what changed' },
    { title: 'Export ready · VAT-roadmap.pdf', event: 'EXPORT', kind: 'review', time: '09:12',
      desc: 'Download link sent to your email · expires in 24h' },
  ]},
];

const KIND_TONE: Record<FeedItem['kind'], 'brand' | 'success' | 'warning' | 'neutral' | 'error'> = {
  request: 'brand',
  sla: 'warning',
  billing: 'neutral',
  review: 'success',
  system: 'neutral',
};

const KIND_CHIPS: { key: FeedItem['kind']; labelKey: string }[] = [
  { key: 'request', labelKey: 'chipRequests' },
  { key: 'sla', labelKey: 'chipSla' },
  { key: 'billing', labelKey: 'chipBilling' },
  { key: 'review', labelKey: 'chipReviews' },
  { key: 'system', labelKey: 'chipSystem' },
];

export function UserNotificationsPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('userws');
  const locale = i18n.resolvedLanguage || 'en';
  const [filter, setFilter] = useState<'all' | 'unread' | FeedItem['kind']>('all');
  const { data } = useApiData(
    () => fetchNotificationsFeed(USER_NOTIFICATIONS_VIEWER),
    { groups: FIXTURE, lastSeen: null },
  );

  // Day headers come from the feed ("Today"/"Yesterday") — translate known ones.
  const tDay = (day: string) =>
    day === 'Today' ? t('notifications.dayToday') : day === 'Yesterday' ? t('notifications.dayYesterday') : day;

  const flat = data.groups.flatMap((g) => g.items);
  const matches = (i: FeedItem) =>
    filter === 'all' ? true : filter === 'unread' ? !!i.unread : i.kind === filter;
  const visible = data.groups
    .map((g) => ({ ...g, items: g.items.filter(matches) }))
    .filter((g) => g.items.length > 0);

  const openItem = (i: FeedItem) => {
    if (i.bookingId) { navigate(`/${locale}/dashboard/termine`); return; }
    if (i.engagementId) navigate(`/${locale}/dashboard/requests?thread=${i.engagementId}`);
  };

  return (
    <UserShell>
      <div className="mx-auto max-w-[1140px] space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-[32px] font-bold leading-tight text-fg">
              <span className="text-fg-accent">{t('notifications.title')}</span>
            </h1>
            <p className="mt-1 text-body-sm text-fg-secondary">{t('notifications.sub')}</p>
          </div>
          <button type="button" className="mt-2 flex shrink-0 items-center gap-1.5 text-[12px] text-fg-secondary transition-colors hover:text-fg">
            <Bookmark size={13} /> {t('shared.bookmarks')}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterChip size="sm" selected={filter === 'all'} onClick={() => setFilter('all')}>
            {t('notifications.filterAll', { count: flat.length })}
          </FilterChip>
          <FilterChip size="sm" selected={filter === 'unread'} onClick={() => setFilter('unread')}>
            {t('notifications.filterUnread', { count: flat.filter((i) => i.unread).length })}
          </FilterChip>
          {KIND_CHIPS.filter((c) => flat.some((i) => i.kind === c.key)).map((c) => (
            <FilterChip key={c.key} size="sm" selected={filter === c.key} onClick={() => setFilter(c.key)}>
              {t(`notifications.${c.labelKey}`)} · {flat.filter((i) => i.kind === c.key).length}
            </FilterChip>
          ))}
        </div>

        {visible.length === 0 && (
          <p className="text-[13px] text-fg-tertiary">{t('notifications.empty')}</p>
        )}
        {visible.map((group) => (
          <section key={group.day} className="space-y-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">{tDay(group.day)}</p>
            {group.items.map((n) => (
              <EntityCard
                key={`${n.event}-${n.title}-${n.time}`}
                name={n.title}
                badge={<Tag tone={KIND_TONE[n.kind]}>{n.event}</Tag>}
                meta={n.desc}
                trailing={<span className="text-[11px] text-fg-tertiary">{n.time}</span>}
                unread={n.unread}
                interactive={!!n.engagementId || !!n.bookingId}
                onClick={n.engagementId || n.bookingId ? () => openItem(n) : undefined}
                avatar={<span className="grid h-9 w-9 place-items-center rounded-full bg-elevate/[0.06] text-[13px] text-fg-tertiary">🔔</span>}
              />
            ))}
          </section>
        ))}
      </div>
    </UserShell>
  );
}
