import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { apiFetch } from '../../api/client';

// ─── Configure-Alerts drawer (Board 2073:164 · wiring map B15) ───────────────
// Per-owner alert preferences, persisted in alert_prefs (owner = guest_key
// until accounts adopt guest sessions). `key` stays the API field name;
// `i18nKey` addresses the userws copy.

const TOGGLES: { key: string; i18nKey: string; def: boolean }[] = [
  { key: 'threshold_breach', i18nKey: 'thresholdBreach', def: true },
  { key: 'threshold_approach', i18nKey: 'thresholdApproach', def: true },
  { key: 'deadlines', i18nKey: 'deadlines', def: true },
  { key: 'provider_updates', i18nKey: 'providerUpdates', def: true },
  { key: 'rule_changes', i18nKey: 'ruleChanges', def: false },
  { key: 'weekly_digest', i18nKey: 'weeklyDigest', def: false },
];

function ownerKey(): string {
  return localStorage.getItem('ch360_guest_key') || 'demo-user';
}

export function ConfigureAlertsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation('userws');
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setSaved(false); setError(''); setLoaded(false);
    apiFetch<{ ok: boolean; prefs: Record<string, boolean> | null }>(`/api/v1/alert-prefs?owner=${encodeURIComponent(ownerKey())}`)
      .then((res) => {
        const base = Object.fromEntries(TOGGLES.map((tg) => [tg.key, tg.def]));
        setPrefs({ ...base, ...(res.prefs ?? {}) });
        setLoaded(true);
      })
      .catch(() => {
        setPrefs(Object.fromEntries(TOGGLES.map((tg) => [tg.key, tg.def])));
        setLoaded(true);
      });
  }, [open]);

  const save = async () => {
    setBusy(true); setError(''); setSaved(false);
    try {
      await apiFetch('/api/v1/alert-prefs', {
        method: 'PUT',
        body: JSON.stringify({ owner: ownerKey(), prefs }),
      });
      setSaved(true);
    } catch {
      setError(t('configureAlerts.saveError'));
    }
    setBusy(false);
  };

  return (
    <Drawer
      forceDark
      open={open}
      onClose={onClose}
      side="right"
      size="md"
      eyebrow={t('configureAlerts.eyebrow')}
      title={t('configureAlerts.title')}
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <p className="text-[11px] text-fg-tertiary">{saved ? t('configureAlerts.savedNote') : t('configureAlerts.deliveryNote')}</p>
          <Button variant="accent" size="sm" onClick={save} disabled={busy || !loaded}>{busy ? '…' : t('configureAlerts.savePreferences')}</Button>
        </div>
      }
    >
      <div className="space-y-2.5">
        {TOGGLES.map((tg) => {
          const on = prefs[tg.key] ?? tg.def;
          return (
            <button
              key={tg.key}
              type="button"
              onClick={() => setPrefs((p) => ({ ...p, [tg.key]: !on }))}
              className="flex w-full items-start justify-between gap-3 rounded-lg border border-elevate/10 bg-elevate/[0.03] px-4 py-3 text-left transition-colors hover:border-elevate/25"
            >
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-fg">{t(`configureAlerts.toggles.${tg.i18nKey}.label`)}</span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-fg-tertiary">{t(`configureAlerts.toggles.${tg.i18nKey}.desc`)}</span>
              </span>
              <span className={
                'mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ' +
                (on ? 'justify-end bg-fg-brand' : 'justify-start bg-elevate/15')
              }>
                <span className="h-4 w-4 rounded-full bg-white" />
              </span>
            </button>
          );
        })}
        {error && <p className="rounded-lg border border-error-500/30 bg-error-500/10 px-3 py-2 text-[12px] text-error-500">{error}</p>}
      </div>
    </Drawer>
  );
}
