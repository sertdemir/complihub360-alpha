import { useEffect, useState } from 'react';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { apiFetch } from '../../api/client';

// ─── Configure-Alerts drawer (Board 2073:164 · wiring map B15) ───────────────
// Per-owner alert preferences, persisted in alert_prefs (owner = guest_key
// until accounts adopt guest sessions).

const TOGGLES: { key: string; label: string; desc: string; def: boolean }[] = [
  { key: 'threshold_breach', label: 'Threshold breaches', desc: 'Revenue crosses a VAT/OSS registration threshold in any monitored market.', def: true },
  { key: 'threshold_approach', label: 'Approaching thresholds (80%)', desc: 'Early warning before a threshold is reached.', def: true },
  { key: 'deadlines', label: 'Filing deadlines', desc: 'OSS/EPR/GDPR filing dates — 14 and 3 days ahead.', def: true },
  { key: 'provider_updates', label: 'Provider updates', desc: 'Confirmations, replies and SLA events on your requests.', def: true },
  { key: 'rule_changes', label: 'Regulatory changes', desc: 'Rule updates that affect a saved session ("Needs refresh").', def: false },
  { key: 'weekly_digest', label: 'Weekly digest', desc: 'One summary mail per week instead of individual alerts.', def: false },
];

function ownerKey(): string {
  return localStorage.getItem('ch360_guest_key') || 'demo-user';
}

export function ConfigureAlertsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
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
        const base = Object.fromEntries(TOGGLES.map((t) => [t.key, t.def]));
        setPrefs({ ...base, ...(res.prefs ?? {}) });
        setLoaded(true);
      })
      .catch(() => {
        setPrefs(Object.fromEntries(TOGGLES.map((t) => [t.key, t.def])));
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
      setError('Saving failed — try again in a moment.');
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
      eyebrow="MONITORING"
      title="Configure alerts"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <p className="text-[11px] text-fg-tertiary">{saved ? 'Saved — applies to e-mail and in-app alerts.' : 'Delivery: e-mail + in-app.'}</p>
          <Button variant="accent" size="sm" onClick={save} disabled={busy || !loaded}>{busy ? '…' : 'Save preferences'}</Button>
        </div>
      }
    >
      <div className="space-y-2.5">
        {TOGGLES.map((t) => {
          const on = prefs[t.key] ?? t.def;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setPrefs((p) => ({ ...p, [t.key]: !on }))}
              className="flex w-full items-start justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition-colors hover:border-white/25"
            >
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-fg">{t.label}</span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-fg-tertiary">{t.desc}</span>
              </span>
              <span className={
                'mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ' +
                (on ? 'justify-end bg-fg-brand' : 'justify-start bg-white/15')
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
