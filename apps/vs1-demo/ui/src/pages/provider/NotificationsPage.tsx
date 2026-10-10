import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ProviderShell } from '../../components/provider/ProviderShell';
import { Button } from '../../components/ui/Button';
import { FilterChip } from '../../components/ui/Badge';
import { useWorkspaceData } from '../../lib/useWorkspaceData';
import { LoadFailedState } from '../../components/provider/WorkspaceStates';
import { markNotificationsRead } from '../../api/notifications';
import { fetchPartnerNotifications, type PartnerNotification, type PartnerTopic } from '../../api/partnerNotifications';
import { partnerNotificationText } from '../../lib/partnerNotificationText';
import { cn } from '../../lib/utils';

// ─── Partner · Benachrichtigungen (Canvas-Wahl B V1, 2026-10-10) ──────────────
// Nach Tag, Filter nach Thema. Quelle ist die eigene Post des Partners —
// vorher das Betriebsprotokoll, das Partnern mit 403 antwortet; die Seite
// zeigte deshalb immer „Noch keine Benachrichtigungen" (TKT-PROV-12 hatte
// das ehrlich gemacht, die Quelle fehlte). Jede Zeile fuehrt dorthin, wo man
// handeln kann.

const TOPIC_CHIPS: { key: PartnerTopic; labelKey: string }[] = [
  { key: 'appointments', labelKey: 'partnerNotif.chipAppointments' },
  { key: 'billing', labelKey: 'notifications.chipBilling' },
  { key: 'verification', labelKey: 'partnerNotif.chipVerification' },
  { key: 'plan', labelKey: 'partnerNotif.chipPlan' },
];
const TOPIC_LABEL: Record<PartnerTopic, string> = {
  appointments: 'partnerNotif.chipAppointments', billing: 'notifications.chipBilling', verification: 'partnerNotif.chipVerification', plan: 'partnerNotif.chipPlan',
};

export function NotificationsPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('providerws');
  const locale = i18n.resolvedLanguage || 'en';
  const [filter, setFilter] = useState<'all' | 'unread' | PartnerTopic>('all');
  const [allSeen, setAllSeen] = useState(false);
  const [marking, setMarking] = useState(false);
  const feed = useWorkspaceData(fetchPartnerNotifications);
  const all = (feed.data ?? []).map((n) => (allSeen ? { ...n, unread: false } : n));
  const unreadCount = all.filter((n) => n.unread).length;
  const shown = all.filter((n) => filter === 'all' ? true : filter === 'unread' ? n.unread : n.topic === filter);

  // Nach Kalendertag gruppiert, in der Sprache des Partners.
  const dayOf = (iso: string) => {
    const d = new Date(iso); const today = new Date();
    const diff = Math.round((new Date(today.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86_400_000);
    if (diff === 0) return t('notifications.dayToday');
    if (diff === 1) return t('notifications.dayYesterday');
    return d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  };
  const groups: { day: string; items: PartnerNotification[] }[] = [];
  for (const n of shown) {
    const day = dayOf(n.createdAt);
    const g = groups.find((x) => x.day === day);
    if (g) g.items.push(n); else groups.push({ day, items: [n] });
  }

  const markAllRead = async () => {
    setMarking(true);
    try { await markNotificationsRead({ all: true }); } catch { /* lokal trotzdem gelesen */ }
    setAllSeen(true);
    setMarking(false);
  };
  const open = (n: PartnerNotification) => {
    if (n.unread) markNotificationsRead({ id: n.id }).catch(() => {});
    navigate(`/${locale}/partner-dashboard/${n.to}`);
  };

  return (
    <ProviderShell>
      <div className="mx-auto max-w-[1140px] space-y-5">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-serif text-[30px] font-bold leading-tight text-fg">{t('notifications.title')}</h1>
          <Button size="sm" variant="secondary" className="mt-1 shrink-0" onClick={markAllRead} disabled={marking || unreadCount === 0}>
            {marking ? '…' : t('notifications.markAllRead')}
          </Button>
        </div>
        <p className="-mt-3 max-w-4xl text-body-sm leading-relaxed text-fg-secondary">{t('partnerNotif.pageSubtitle')}</p>

        <div className="flex flex-wrap items-center gap-2">
          <FilterChip size="sm" selected={filter === 'all'} onClick={() => setFilter('all')}>{t('notifications.chipAll')} · {all.length}</FilterChip>
          <FilterChip size="sm" selected={filter === 'unread'} onClick={() => setFilter('unread')}>{t('notifications.chipUnread')} · {unreadCount}</FilterChip>
          {TOPIC_CHIPS.filter((c) => all.some((n) => n.topic === c.key)).map((c) => (
            <FilterChip key={c.key} size="sm" selected={filter === c.key} onClick={() => setFilter(c.key)}>
              {t(c.labelKey)} · {all.filter((n) => n.topic === c.key).length}
            </FilterChip>
          ))}
        </div>

        {feed.state === 'loading' && <div aria-busy="true" className="h-24 animate-pulse rounded-xl bg-surface-secondary/60 motion-reduce:animate-none" />}
        {feed.state === 'error' && <LoadFailedState surface="notifications" error={feed.error} onRetry={feed.reload} section />}
        {feed.state === 'ready' && all.length === 0 && <p className="text-[13px] text-fg-tertiary">{t('partnerNotif.empty')}</p>}
        {feed.state === 'ready' && all.length > 0 && shown.length === 0 && <p className="text-[13px] text-fg-tertiary">{t('notifications.emptyFilter')}</p>}

        {groups.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-stroke bg-surface">
            {groups.map((g) => (
              <section key={g.day}>
                <p className="px-5 pb-1.5 pt-3 text-[11px] font-medium uppercase tracking-[0.06em] text-fg-tertiary">{g.day}</p>
                {g.items.map((n) => {
                  const { title, body } = partnerNotificationText(t, n, locale);
                  return (
                    <button key={n.id} type="button" onClick={() => open(n)}
                      className="flex w-full items-start gap-3 border-t border-stroke px-5 py-3 text-left transition-colors hover:bg-surface-secondary">
                      <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.unread ? 'bg-fg-brand' : 'bg-transparent')} aria-label={n.unread ? t('notifications.chipUnread') : undefined} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-semibold text-fg">{title}</span>
                        <span className="mt-0.5 block text-[13px] leading-relaxed text-fg-secondary">{body}</span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-[12px] text-fg-tertiary">{new Date(n.createdAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="text-[12px] font-semibold text-fg-brand">{t(TOPIC_LABEL[n.topic])} →</span>
                      </span>
                    </button>
                  );
                })}
              </section>
            ))}
          </div>
        )}
      </div>
    </ProviderShell>
  );
}
