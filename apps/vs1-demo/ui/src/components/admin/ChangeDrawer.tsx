import { useEffect, useState } from 'react';
import { Drawer } from '../ui/Drawer';
import { Badge, type BadgeTone } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Banner } from '../ui/Banner';
import { Textarea } from '../ui/Textarea';
import { Skeleton } from '../ui/Skeleton';
import { ApiError } from '../../api/client';
import { decideChange, fetchChangeDetail, type ChangeDecision, type ChangeDetail } from '../../api/review';

// ─── Change request entscheiden (Canvas E V1, 2026-10-01) ────────────────────
// Drawer aus der Queue: vorher/nachher, Fristklasse, wen es betrifft, dann
// entscheiden. Welche Entscheidung erlaubt ist, haengt an der Wirkung — die
// Regel liegt beim Server (providerReview.ts DECISIONS), hier nur gespiegelt.
// Begruendung ist Pflicht, wo der Partner sie liest. Englisch wie der Rest
// des Admin-Bereichs.

const DEADLINE: Record<string, { label: string; tone: BadgeTone }> = {
  immediate_24h: { label: '24 hours', tone: 'error' },
  within_3_business_days: { label: 'within 3 business days', tone: 'warning' },
  before_effective_date: { label: 'before effective date', tone: 'warning' },
};
const ACTIONS: Record<string, Array<{ decision: ChangeDecision; label: string; variant: 'primary' | 'secondary' | 'danger'; needsNote: boolean }>> = {
  held: [
    { decision: 'approve', label: 'Approve', variant: 'primary', needsNote: false },
    { decision: 'reject', label: 'Reject with reason', variant: 'danger', needsNote: true },
    { decision: 'require_reverification', label: 'Require re-verification', variant: 'secondary', needsNote: true },
  ],
  applied: [
    { decision: 'approve', label: 'Confirm', variant: 'primary', needsNote: false },
    { decision: 'require_reverification', label: 'Require re-verification', variant: 'secondary', needsNote: true },
  ],
  pause: [
    { decision: 'resume', label: 'Resume services', variant: 'primary', needsNote: false },
    { decision: 'keep_paused', label: 'Keep paused', variant: 'secondary', needsNote: true },
  ],
};
const EFFECT_INFO: Record<string, string> = {
  held: 'Waiting — not live. Users still see the previous value.',
  applied: 'Already live — reported fact (name, address, representative). Confirm or ask for a document.',
  pause: 'Material event — the listed services are paused and out of matching.',
};

const show = (v: unknown, field = '') => {
  if (v == null || v === '') return '—';
  if (field.startsWith('price_') && typeof v === 'number') return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
  if (field === 'completion_days_estimate' && typeof v === 'number') return `${v} days`;
  if (field === 'response_time_hours' && typeof v === 'number') return `${v} h`;
  return Array.isArray(v) ? (v.length ? v.join(', ') : '—') : String(v);
};
const label = (k: string) => k.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

export function ChangeDrawer({ providerKey, providerName, changeId, onClose, onDecided }: { providerKey: string; providerName: string; changeId: string | null; onClose: () => void; onDecided: () => void }) {
  const [detail, setDetail] = useState<ChangeDetail | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setDetail(null); setNote(''); setErr(null);
    if (changeId) fetchChangeDetail(providerKey, changeId).then(setDetail).catch(() => setErr('This change could not be loaded.'));
  }, [providerKey, changeId]);

  const decide = async (decision: ChangeDecision, needsNote: boolean) => {
    if (!changeId) return;
    if (needsNote && !note.trim()) { setErr('Please add a note — the provider will read it.'); return; }
    setBusy(true); setErr(null);
    try { await decideChange(providerKey, changeId, decision, note.trim()); onDecided(); onClose(); }
    catch (e) {
      setErr(e instanceof ApiError && e.status === 409 && /live value/i.test(e.message)
        ? 'The live value changed since this was submitted. Reject it with a note instead.'
        : e instanceof Error ? e.message : 'The decision could not be saved.');
    } finally { setBusy(false); }
  };

  const c = detail?.change;
  const dl = c ? DEADLINE[c.deadline_class] : null;
  const fields = c && c.effect !== 'pause' ? Object.keys(c.old_value ?? {}) : [];
  return (
    <Drawer open={!!changeId} onClose={onClose} size="lg" eyebrow="Change request" title={`${providerName} · ${c ? label(c.event_type ?? c.change_type.split(',')[0]) : '…'}`}
      headerExtra={dl ? <Badge tone={dl.tone} size="sm">{dl.label}</Badge> : null}
      footer={c && ['submitted', 'under_review'].includes(c.status) ? (
        <div className="flex flex-wrap gap-2">
          {(ACTIONS[c.effect] ?? []).map((a) => <Button key={a.decision} size="sm" variant={a.variant} disabled={busy || (a.decision === 'approve' && c.effect === 'held' && detail?.stale)} onClick={() => decide(a.decision, a.needsNote)}>{a.label}</Button>)}
        </div>
      ) : null}>
      {!detail && !err && <Skeleton variant="rect" height={220} />}
      {err && <Banner status="warning" title={err} className="mb-4" />}
      {c && detail && (
        <div className="space-y-5 text-[13px]">
          <p className="text-fg-tertiary">
            {detail.service ? `${detail.service.service_name} · ` : ''}submitted {new Date(c.submitted_at).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            {c.status === 'under_review' ? ' · under review' : ''}
          </p>
          <p className="text-fg-secondary">{EFFECT_INFO[c.effect]}</p>
          {detail.stale && <Banner status="warning" title="The live value changed since this was submitted — approving would overwrite it. Reject with a note instead." />}
          {c.effect !== 'pause' ? (
            <div className="overflow-hidden rounded-lg border border-stroke">
              <div className="grid grid-cols-3 bg-surface-secondary px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary"><span>Field</span><span>Before</span><span>After</span></div>
              {fields.map((k) => (
                <div key={k} className="grid grid-cols-3 border-t border-stroke-subtle px-3 py-2">
                  <span className="text-fg-secondary">{label(k)}</span><span>{show(c.old_value?.[k], k)}</span><span className="font-semibold text-fg-brand">{show(c.new_value?.[k], k)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-stroke p-3">
              <p className="font-medium text-fg">{label(c.event_type ?? '')} · since {show(c.occurred_on)}</p>
              <p className="mt-1 text-fg-secondary">{(c.affected_service_ids ?? []).length} service(s) paused</p>
            </div>
          )}
          {c.provider_note && <p className="rounded-lg bg-surface-secondary px-3 py-2 text-fg-secondary"><span className="font-medium text-fg">Provider note:</span> {c.provider_note}</p>}
          <div className="rounded-lg bg-surface-secondary px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">User impact</p>
            <p className="mt-1 text-fg-secondary">
              {c.effect === 'pause'
                ? `${detail.upcoming_bookings} upcoming booking(s) with this provider. Affected users were told by email and see a notice on their appointment.`
                : `${detail.upcoming_bookings} upcoming booking(s) keep their booked price (price snapshot). New users see the new value after approval.`}
            </p>
          </div>
          {['submitted', 'under_review'].includes(c.status) && (
            <label className="block">
              <span className="mb-1 block text-[12px] font-medium text-fg-secondary">Note to the provider (required for reject, re-verification and keeping paused)</span>
              <Textarea inputSize="sm" rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
            </label>
          )}
        </div>
      )}
    </Drawer>
  );
}
