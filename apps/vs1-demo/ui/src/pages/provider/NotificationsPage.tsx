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
import { fetchProviderNotifications, markNotificationsRead, type ProviderNotification, type ProviderNotificationKind } from '../../api/notifications';
import { notificationTitle, notificationDesc, timeLabel, dayLabel } from '../../components/provider/notificationText';

// ─── Provider /notifications ──────────────────────────────────────────────────
// Phase 6 (ADR-0009 Nr. 5): die eigene Post des Anbieters aus
// `public.notifications` (GET /notifications), nach Tag gruppiert, mit
// Filter nach Art und Lesestand. „Alle als gelesen markieren" schreibt
// read_at auf dem Server.
//
// Bis Phase 6 las die Seite das admin-pflichtige Betriebsprotokoll — fuer
// einen Anbieter immer 403, also immer „Noch keine Benachrichtigungen",
// egal was passiert war.

const KINDS: ProviderNotificationKind[] = ['termine', 'performance', 'billing', 'verification'];
const TONE: Record<ProviderNotificationKind, 'neutral' | 'warning' | 'brand' | 'success'> = { termine: 'neutral', performance: 'warning', billing: 'brand', verification: 'success' };

type T = (k: string, o?: Record<string, unknown>) => string;

export function NotificationsPage() {
  const navigate = useNavigate();
  const { t: tRaw, i18n } = useTranslation('providerws');
  const t = tRaw as unknown as T;
  const locale = i18n.resolvedLanguage || 'en';
  const [filter, setFilter] = useState<'all' | 'unread' | ProviderNotificationKind>('all');
  const [allSeen, setAllSeen] = useState(false);
  const [marking, setMarking] = useState(false);
  const feed = useWorkspaceData(fetchProviderNotifications);
  const items = (feed.data?.items ?? []).map((i) => (allSeen ? { ...i, unread: false } : i));
  const unreadCount = items.filter((i) => i.unread).length;
  const visible = items.filter((i) => (filter === 'all' ? true : filter === 'unread' ? i.unread : i.kind === filter));

  // Nach Tag gruppieren, neueste zuerst (der Server sortiert schon so).
  const groups: Array<{ day: string; items: ProviderNotification[] }> = [];
  for (const n of visible) {
    const day = dayLabel(n.createdAt, locale, t);
    const g = groups[groups.length - 1];
    if (g && g.day === day) g.items.push(n); else groups.push({ day, items: [n] });
  }

  const markAllRead = async () => {
    setMarking(true);
    try { await markNotificationsRead({ all: true }); } catch { /* lokal trotzdem gelesen */ }
    setAllSeen(true);
    setMarking(false);
  };

  return (
    <ProviderShell>
      <div className="mx-auto max-w-[1140px] space-y-5">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-serif text-[30px] font-bold leading-tight text-fg">{t('notifications.title')}</h1>
          <Button size="sm" variant="secondary" onClick={markAllRead} disabled={marking || unreadCount === 0}>
            {marking ? '…' : t('notifications.markAllRead')}
          </Button>
        </div>
        <p className="-mt-3 max-w-4xl text-body-sm leading-relaxed text-fg-secondary">{t('notifications.subtitle')}</p>

        <div className="flex flex-wrap items-center gap-2">
          <FilterChip size="sm" selected={filter === 'all'} onClick={() => setFilter('all')}>{t('notifications.chipAll')} · {items.length}</FilterChip>
          <FilterChip size="sm" selected={filter === 'unread'} onClick={() => setFilter('unread')}>{t('notifications.chipUnread')} · {unreadCount}</FilterChip>
          {KINDS.filter((k) => items.some((i) => i.kind === k)).map((k) => (
            <FilterChip key={k} size="sm" selected={filter === k} onClick={() => setFilter(k)}>
              {t(`notifications.chip.${k}`)} · {items.filter((i) => i.kind === k).length}
            </FilterChip>
          ))}
        </div>

        {feed.state === 'loading' && <div aria-busy="true" className="h-24 animate-pulse rounded-xl bg-surface-secondary/60 motion-reduce:animate-none" />}
        {feed.state === 'error' && <LoadFailedState surface="notifications" error={feed.error} onRetry={feed.reload} section />}
        {feed.state === 'ready' && items.length === 0 && <p className="text-[13px] text-fg-tertiary">{t('bell.empty')}</p>}
        {feed.state === 'ready' && items.length > 0 && visible.length === 0 && <p className="text-[13px] text-fg-tertiary">{t('notifications.emptyFilter')}</p>}
        {groups.map((group) => (
          <section key={group.day} className="space-y-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">{group.day}</p>
            {group.items.map((n) => (
              <Card key={n.id} styleVariant="filled" className={n.unread ? 'border-l-2 border-l-fg-brand p-4' : 'p-4'} data-type={n.type}>
                <div className="flex items-center gap-2.5">
                  <p className="text-[13px] font-semibold text-fg">{notificationTitle(n, t)}</p>
                  <Tag tone={TONE[n.kind]}>{t(`notifications.chip.${n.kind}`)}</Tag>
                  <span className="ml-auto shrink-0 text-[11px] text-fg-tertiary">{timeLabel(n.createdAt, locale, t)}</span>
                </div>
                {notificationDesc(n, t, locale) && <p className="mt-1.5 text-[12px] leading-relaxed text-fg-secondary">{notificationDesc(n, t, locale)}</p>}
                <button type="button" onClick={() => navigate(`/${locale}/partner-dashboard/${n.to}`)}
                  className="mt-2 inline-block text-[12px] font-medium text-fg-brand underline-offset-2 hover:underline">
                  {t(`notifications.open.${n.to}`)}
                </button>
              </Card>
            ))}
          </section>
        ))}
      </div>
    </ProviderShell>
  );
}
