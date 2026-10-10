import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ApiError } from '../../api/client';
import { fetchCalendar, startCalendarConnect, disconnectCalendar, type CalendarStatus } from '../../api/calendar';
import type { ConfirmSpec } from './ConfirmDrawer';

// ─── Partner-Einstellungen · Kalender (Beta-Plan Fr 16.10.) ──────────────────
// Canvas „Kalender verbinden", Wahl 10.10.2026: A1 (eigene Karte oben) · B3
// (sagt, was wir tun, und nennt den Dienstleister) · C2 (Rueckmeldung im
// Abschnitt) · D1 (Trennen mit Bestaetigung). Figma: Screens-Datei, Seite
// „Kalender verbinden (Fr 16.10.)", 3652:2. Copy: providerws settings.calendar.*.
//
// Zustaende: laedt · Status nicht ladbar · noch nicht verfuegbar (Hosted Auth
// nicht eingerichtet) · nicht verbunden · verbunden. Die Rueckmeldung nach der
// Anmeldung kommt als ?calendar=connected|failed und wird danach aus der URL
// genommen — sonst stuende sie bei jedem Neuladen wieder da.

type Returned = 'connected' | 'failed' | null;

export function CalendarPanel({ onConfirm }: { onConfirm: (spec: ConfirmSpec) => void }) {
  const { t, i18n } = useTranslation('providerws');
  const locale = i18n.resolvedLanguage || 'en';
  const [params, setParams] = useSearchParams();
  const [returned, setReturned] = useState<Returned>(null);
  const [status, setStatus] = useState<CalendarStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);

  // Rueckmeldung einmal lesen und aus der URL nehmen.
  useEffect(() => {
    const r = params.get('calendar');
    if (r === 'connected' || r === 'failed') {
      setReturned(r);
      const next = new URLSearchParams(params);
      next.delete('calendar');
      setParams(next, { replace: true });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    fetchCalendar()
      .then((s) => { if (!cancelled) setStatus(s); })
      .catch(() => { if (!cancelled) { setStatus(null); setFailed(true); } });
    return () => { cancelled = true; };
  }, [attempt]);

  const connect = async () => {
    setBusy(true);
    try {
      const url = await startCalendarConnect(locale);
      window.location.assign(url);
    } catch (err) {
      setBusy(false);
      if (err instanceof ApiError && err.status === 503) {
        // Nicht eingerichtet: der Abschnitt zeigt „Noch nicht verfuegbar“.
        setStatus({ configured: false, connected: false, email: null });
        return;
      }
      setReturned('failed');
    }
  };

  const askDisconnect = () => onConfirm({
    title: t('settings.calendar.confirmTitle'),
    consequence: t('settings.calendar.confirmConsequence'),
    confirmLabel: t('settings.calendar.confirmLabel'),
    onConfirm: async () => {
      await disconnectCalendar();
      setReturned(null);
      setAttempt((n) => n + 1);
    },
  });

  const nylasNote = <p className="text-[11px] text-fg-tertiary">{t('settings.calendar.nylasNote')}</p>;

  return (
    <Card styleVariant="outlined" className="space-y-3 p-5" data-testid="calendar-panel">
      <h2 className="text-[15px] font-semibold text-fg">{t('settings.calendar.title')}</h2>

      {returned === 'connected' && status?.connected && (
        <div role="status" className="rounded-lg border border-success-500/30 bg-success-bg px-4 py-3 text-[13px] text-fg dark:bg-emerald-500/10">
          <span className="font-semibold">{t('settings.calendar.returnedOkTitle')}</span>{' '}
          <span className="text-fg-secondary">{t('settings.calendar.returnedOkBody')}</span>
        </div>
      )}
      {returned === 'failed' && !status?.connected && (
        <div role="alert" className="rounded-lg border border-error-500/30 bg-error-bg px-4 py-3 text-[13px] dark:bg-red-500/10">
          <p className="font-semibold text-fg">{t('settings.calendar.returnedFailTitle')}</p>
          <p className="mt-0.5 text-error-700 dark:text-red-300">{t('settings.calendar.returnedFailBody')}</p>
        </div>
      )}

      {failed ? (
        <div className="space-y-2">
          <p className="text-[13px] text-fg-secondary">{t('settings.calendar.loadFailed')}</p>
          <Button size="sm" variant="secondary" onClick={() => setAttempt((n) => n + 1)}>{t('settings.calendar.retry')}</Button>
        </div>
      ) : !status ? (
        <div className="h-16 animate-pulse rounded-lg bg-surface-secondary" aria-hidden />
      ) : status.connected ? (
        <div className="space-y-2" data-state="connected">
          <p className="flex items-center gap-2 text-[13px] font-medium text-fg">
            <span aria-hidden className="h-2 w-2 rounded-full bg-success-500" />
            {t('settings.calendar.connectedAs', { email: status.email ?? '' })}
          </p>
          <p className="max-w-[640px] text-[13px] leading-relaxed text-fg-secondary">{t('settings.calendar.connectedBody')}</p>
          <Button size="sm" variant="secondary" onClick={askDisconnect}>{t('settings.calendar.disconnect')}</Button>
          {nylasNote}
        </div>
      ) : !status.configured ? (
        <div className="space-y-1.5" data-state="unavailable">
          <p className="flex items-center gap-2 text-[13px] font-medium text-fg">
            <span aria-hidden className="h-2 w-2 rounded-full bg-fg-tertiary" />
            {t('settings.calendar.unavailableTitle')}
          </p>
          <p className="max-w-[640px] text-[13px] leading-relaxed text-fg-secondary">{t('settings.calendar.unavailableBody')}</p>
        </div>
      ) : (
        <div className="space-y-3" data-state="disconnected">
          <p className="max-w-[640px] text-[13px] leading-relaxed text-fg-secondary">{t('settings.calendar.body')}</p>
          <Button size="md" loading={busy} onClick={connect}>{t('settings.calendar.connect')}</Button>
          {nylasNote}
        </div>
      )}
    </Card>
  );
}
