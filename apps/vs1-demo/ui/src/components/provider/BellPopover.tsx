import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react';
import { Button } from '../ui/Button';
import { fetchNotificationsFeed, NOTIFICATIONS_VIEWER, type FeedItem } from '../../api/notifications';
import { markSeen } from '../../api/reads';
import { cn } from '../../lib/utils';

// ─── Bell popover (Figma 2653:148 · wiring map B3) ───────────────────────────
// Topbar bell with live unread count; the popover shows the latest events with
// unread markers. "Mark all read" persists the C1 watermark; items with an
// engagement deep-link jump straight into the request thread.

const SHOWN = 7;

interface BellPopoverProps {
  unread?: number;
  onAllRead: () => void;
}

export function BellPopover({ unread, onAllRead }: BellPopoverProps) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('providerws');
  const locale = i18n.resolvedLanguage || 'en';
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [marking, setMarking] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setItems(null);
    fetchNotificationsFeed()
      .then((f) => setItems(f.groups.flatMap((g) => g.items).slice(0, SHOWN)))
      .catch(() => setItems([]));
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const markAllRead = async () => {
    setMarking(true);
    try { await markSeen(NOTIFICATIONS_VIEWER); } catch { /* clear locally anyway */ }
    setItems((prev) => prev?.map((i) => ({ ...i, unread: false })) ?? prev);
    onAllRead();
    setMarking(false);
  };

  const openItem = (i: FeedItem) => {
    setOpen(false);
    if (i.engagementId) navigate(`/${locale}/partner-dashboard/requests?thread=${i.engagementId}`);
    else navigate(`/${locale}/partner-dashboard/notifications`);
  };

  const unreadShown = items?.filter((i) => i.unread).length ?? 0;

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
          <span className="absolute -right-1.5 -top-1.5 grid h-[15px] min-w-[15px] place-items-center rounded-full bg-fg-brand px-[3px] text-[9px] font-bold leading-none text-[#0b1620]">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* click-outside catcher */}
          <div className="fixed inset-0 z-[90]" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-[calc(100%+10px)] z-[95] w-[380px] overflow-hidden rounded-xl border border-elevate/10 bg-surface shadow-[0_18px_50px_-12px_rgba(0,0,0,0.65)]">
            <div className="flex items-center justify-between border-b border-elevate/10 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-fg-tertiary">{t('bell.header')}</p>
              <button
                type="button"
                onClick={markAllRead}
                disabled={marking || unreadShown === 0}
                className="text-[11px] font-medium text-fg-brand transition-colors hover:text-fg disabled:cursor-default disabled:text-fg-tertiary"
              >
                {marking ? '…' : t('bell.markAllRead')}
              </button>
            </div>

            <div className="max-h-[420px] overflow-y-auto">
              {items === null && <p className="px-4 py-5 text-[12px] text-fg-tertiary">{t('bell.loading')}</p>}
              {items !== null && items.length === 0 && (
                <p className="px-4 py-5 text-[12px] text-fg-tertiary">{t('bell.empty')}</p>
              )}
              {items?.map((i, idx) => (
                <button
                  key={`${i.event}-${idx}`}
                  type="button"
                  onClick={() => openItem(i)}
                  className={cn(
                    'flex w-full items-start gap-2.5 border-b border-elevate/5 px-4 py-3 text-left transition-colors hover:bg-elevate/[0.04]',
                    i.unread && 'bg-elevate/[0.03]',
                  )}
                >
                  <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', i.unread ? 'bg-fg-brand' : 'bg-elevate/15')} />
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-semibold text-fg">{i.title}</span>
                    {i.desc && <span className="mt-0.5 block truncate text-[11px] text-fg-tertiary">{i.desc}</span>}
                    <span className="mt-0.5 block text-[10px] text-fg-tertiary">{i.time}</span>
                  </span>
                </button>
              ))}
            </div>

            <div className="border-t border-elevate/10 px-3 py-2.5">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => { setOpen(false); navigate(`/${locale}/partner-dashboard/notifications`); }}
              >
                {t('bell.viewAll')}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
