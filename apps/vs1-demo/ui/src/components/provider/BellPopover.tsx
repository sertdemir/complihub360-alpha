import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react';
import { Button } from '../ui/Button';
import { markNotificationsRead } from '../../api/notifications';
import { fetchPartnerNotifications, type PartnerNotification } from '../../api/partnerNotifications';
import { partnerNotificationText } from '../../lib/partnerNotificationText';
import { cn } from '../../lib/utils';

// ─── Glocke im Partner-Kopf (Canvas-Wahl A V2, 2026-10-10) ───────────────────
// Liest die eigene Post des Partners (vorher das Betriebsprotokoll, das
// Partnern mit 403 antwortet — die Glocke war immer leer). Zwei Gruppen:
// „Needs you" (eine Handlung ist offen — folgt der Lage, nicht dem Lesen) und
// „For your information". Ruhig: kein Rot, keine Dringlichkeitswoerter.

const SHOWN = 6;

interface BellPopoverProps {
  unread?: number;
  onAllRead: () => void;
}

export function BellPopover({ unread, onAllRead }: BellPopoverProps) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('providerws');
  const locale = i18n.resolvedLanguage || 'en';
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PartnerNotification[] | null>(null);
  const [marking, setMarking] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setItems(null);
    fetchPartnerNotifications()
      .then(setItems)
      .catch(() => setItems([]));
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const markAllRead = async () => {
    setMarking(true);
    try { await markNotificationsRead({ all: true }); } catch { /* lokal trotzdem als gelesen zeigen */ }
    setItems((prev) => prev?.map((i) => ({ ...i, unread: false })) ?? prev);
    onAllRead();
    setMarking(false);
  };

  const openItem = (i: PartnerNotification) => {
    setOpen(false);
    if (i.unread) markNotificationsRead({ id: i.id }).catch(() => {});
    navigate(`/${locale}/partner-dashboard/${i.to}`);
  };

  const needs = (items ?? []).filter((i) => i.needsAction);
  const info = (items ?? []).filter((i) => !i.needsAction).slice(0, Math.max(0, SHOWN - needs.length));
  const unreadShown = items?.filter((i) => i.unread).length ?? 0;
  const ago = (iso: string) => {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' });
    const min = Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
    if (Math.abs(min) < 60) return rtf.format(min, 'minute');
    const h = Math.round(min / 60);
    return Math.abs(h) < 24 ? rtf.format(h, 'hour') : rtf.format(Math.round(h / 24), 'day');
  };

  const row = (i: PartnerNotification) => {
    const { title, body } = partnerNotificationText(t, i, locale);
    return (
      <button
        key={i.id}
        type="button"
        onClick={() => openItem(i)}
        className="flex w-full items-start gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-surface-secondary"
      >
        <span className={cn('mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full', i.unread ? 'bg-fg-brand' : 'bg-transparent')} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold text-fg">{title}</span>
          <span className="mt-0.5 block text-[12px] leading-snug text-fg-secondary">{body}</span>
        </span>
        <span className="shrink-0 text-[11px] text-fg-tertiary">{ago(i.createdAt)}</span>
      </button>
    );
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={t('bell.aria')}
        onClick={() => setOpen((v) => !v)}
        className={cn('relative text-fg-tertiary transition-colors hover:text-fg', open && 'text-fg')}
      >
        <Bell size={18} />
        {!!unread && (
          <span className="absolute -right-1.5 -top-1.5 grid h-[15px] min-w-[15px] place-items-center rounded-full bg-fg-brand px-[3px] text-[9px] font-bold leading-none text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[90]" onClick={() => setOpen(false)} />
          <div role="dialog" aria-label={t('bell.header')} className="absolute right-0 top-[calc(100%+10px)] z-[95] w-[360px] max-w-[calc(100vw-32px)] overflow-hidden rounded-xl border border-stroke bg-surface shadow-[0_12px_32px_-12px_rgba(11,21,18,0.25)]">
            <div className="flex items-center justify-between border-b border-stroke px-4 py-3">
              <p className="text-[14px] font-semibold text-fg">{t('bell.header')}</p>
              <button
                type="button"
                onClick={markAllRead}
                disabled={marking || unreadShown === 0}
                className="text-[12px] font-semibold text-fg-brand transition-colors hover:text-fg disabled:cursor-default disabled:text-fg-tertiary"
              >
                {marking ? '…' : t('bell.markAllRead')}
              </button>
            </div>

            <div className="max-h-[440px] overflow-y-auto pb-1">
              {items === null && <p className="px-4 py-5 text-[12px] text-fg-tertiary">{t('bell.loading')}</p>}
              {items !== null && items.length === 0 && (
                <p className="px-4 py-5 text-[12px] text-fg-tertiary">{t('partnerNotif.empty')}</p>
              )}
              {needs.length > 0 && (
                <>
                  <p className="px-4 pb-1 pt-2.5 text-[10.5px] font-medium uppercase tracking-[0.07em] text-warning-700 dark:text-warning-300">{t('partnerNotif.needsYou')}</p>
                  {needs.map(row)}
                </>
              )}
              {info.length > 0 && (
                <>
                  <p className="px-4 pb-1 pt-2.5 text-[10.5px] font-medium uppercase tracking-[0.07em] text-fg-tertiary">{t('partnerNotif.forInfo')}</p>
                  {info.map(row)}
                </>
              )}
            </div>

            <div className="border-t border-stroke px-3 py-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => { setOpen(false); navigate(`/${locale}/partner-dashboard/notifications`); }}
              >
                {t('partnerNotif.seeAll')}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
