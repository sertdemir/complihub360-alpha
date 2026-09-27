import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle2, Clock, ExternalLink, FileText, Info, XCircle } from 'lucide-react';
import { AdminShell } from '../../components/admin/AdminShell';
import { Card } from '../../components/ui/Card';
import { Badge, type BadgeTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Banner } from '../../components/ui/Banner';
import { Modal } from '../../components/ui/Modal';
import { Tag } from '../../components/ui/Tag';
import { Skeleton } from '../../components/ui/Skeleton';
import { ApiError } from '../../api/client';
import {
  decideCoverage, decideEvidence, fetchReviewDossier, requestInfo, setLifecycle, withdrawRequest,
  type CellAction, type EvidenceDecision, type Gate, type ReviewDossier, type ReviewEvidence,
} from '../../api/review';
import type { CoverageStatus, LifecycleStatus, MatrixCell } from '../../api/application';
import { LIFECYCLE } from './AdminProvidersPage';
import { cn } from '../../lib/utils';

// ─── Admin · Pruefung (Figma "Admin · Pruefung — Dossier v2", Canvas 7A + 8A) ─
// Split-View: links die Angabe (Rechtsform, Matrix mit Zell-Aktionen), rechts
// Register und Dokument mit Entscheidung. Darueber die Gate-Leiste: sie zeigt
// GENAU die Punkte, die POST …/lifecycle bei active/limited zurueckgibt —
// keine zweite Wahrheit in der UI. Jede Ablehnung, Einschraenkung und
// Nachfrage braucht einen Grund, den der Anbieter liest; die API erzwingt es,
// die Formulare fragen deshalb zuerst danach.

type CellState = CoverageStatus | 'requested';
const CELL: Record<CellState, { tone: BadgeTone; icon: typeof CheckCircle2; color: string; label: string }> = {
  approved: { tone: 'success', icon: CheckCircle2, color: 'text-success-600', label: 'Approved' },
  limited: { tone: 'info', icon: Info, color: 'text-info-500', label: 'Limited' },
  pending: { tone: 'neutral', icon: Clock, color: 'text-fg-tertiary', label: 'Requested' },
  requested: { tone: 'warning', icon: AlertCircle, color: 'text-warning-600', label: 'Evidence requested' },
  rejected: { tone: 'error', icon: XCircle, color: 'text-error-500', label: 'Rejected' },
  suspended: { tone: 'neutral', icon: Clock, color: 'text-fg-tertiary', label: 'Suspended' },
  expired: { tone: 'neutral', icon: Clock, color: 'text-fg-tertiary', label: 'Expired' },
};
const EVIDENCE_LABEL: Record<string, string> = { incorporation: 'Commercial register extract', vat_id: 'VAT ID (VIES)', insurance: 'Professional liability insurance', representative_identity: 'Authorised representative', professional_licence: 'Professional licence' };
const RESULT: Record<ReviewEvidence['result'], { label: string; tone: BadgeTone }> = { received: { label: 'Received', tone: 'info' }, reviewed: { label: 'Verified', tone: 'success' }, independently_verified: { label: 'Registry-verified', tone: 'success' }, rejected: { label: 'Rejected', tone: 'error' }, expired: { label: 'Expired', tone: 'error' } };
const GATE_LABEL: Record<string, string> = {
  'evidence.incorporation': 'Register extract verified', 'evidence.vat_id': 'VAT ID confirmed (VIES)', 'evidence.insurance': 'Insurance verified', 'evidence.representative_identity': 'Representative verified',
  'coverage.none_approved': '≥ 1 cell approved', 'agreements.provider_agreement': 'Provider agreement accepted', 'agreements.privacy_notice': 'Privacy notice accepted', 'agreements.billing_authorization': 'Billing authorisation accepted',
  'billing.not_ready': 'Billing ready', 'billing.no_payment_method': 'no payment method', 'billing.incomplete_billing_info': 'billing details incomplete', 'billing.inactive_subscription': 'no active subscription', 'billing.withdrawn_authorization': 'authorisation withdrawn', 'billing.overdue_invoice': 'overdue invoice', 'billing.account_paused': 'account paused',
  'plan.category_allowance': 'Plan category allowance', 'lifecycle.terminated': 'Account closed',
};
const GATE_ITEMS = ['evidence.incorporation', 'evidence.vat_id', 'evidence.insurance', 'evidence.representative_identity', 'coverage.none_approved', 'agreements.provider_agreement', 'agreements.privacy_notice', 'agreements.billing_authorization', 'billing.not_ready', 'plan.category_allowance'];

function fmt(iso: string | null | undefined, locale: string, time = false): string {
  if (!iso) return '—';
  const d = new Date(iso); if (Number.isNaN(d.getTime())) return iso;
  return time ? d.toLocaleString(locale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function KV({ k, v, ok }: { k: string; v: React.ReactNode; ok?: boolean }) {
  return <div className="flex items-start gap-3 text-[13px]"><span className="w-[150px] shrink-0 text-[12px] text-fg-tertiary">{k}</span><span className="min-w-0 flex-1 text-fg">{v ?? '—'}</span>{ok && <CheckCircle2 size={14} className="mt-0.5 text-success-600" />}</div>;
}

export function AdminProviderReviewPage() {
  const { key = '' } = useParams();
  const { i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || 'en';
  const base = `/${locale}/admin/providers`;
  const [d, setD] = useState<ReviewDossier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [gate, setGate] = useState<Gate | null>(null);
  const [dialog, setDialog] = useState<{ kind: 'cell'; cell: MatrixCell; action: CellAction } | { kind: 'lifecycle'; to: LifecycleStatus } | { kind: 'request' } | null>(null);

  const reload = useCallback(() => fetchReviewDossier(key).then((x) => { setD(x); setGate(x.gate); setError(null); if (!selected) setSelected(x.evidence.find((e) => e.source === 'document' && e.result === 'received')?.id ?? x.evidence[0]?.id ?? null); })
    .catch((e: unknown) => setError(e instanceof ApiError && e.status === 404 ? 'Provider not found.' : 'The dossier could not be loaded. The API answers 403 without an admin login.')), [key, selected]);
  useEffect(() => { void reload(); }, [reload]);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setNote(null);
    try { await fn(); setNote(ok); await reload(); }
    catch (e) {
      if (e instanceof ApiError && e.status === 422) { setNote(e.message); void reload(); }
      else setNote(e instanceof Error ? e.message : 'That did not work.');
    }
  };

  const requestedCells = new Set((d?.open_requests ?? []).filter((r) => r.country_code).map((r) => `${r.service_id ?? '*'}:${r.country_code}`));
  const countries = d ? Array.from(new Set(d.matrix.flatMap((r) => r.cells.map((c) => c.country_code)))).sort() : [];
  const ev = d?.evidence.find((e) => e.id === selected) ?? null;
  const lc = d ? (LIFECYCLE[d.provider.lifecycle_status] ?? { label: d.provider.lifecycle_status, tone: 'neutral' as BadgeTone }) : null;
  const canActivate = !!gate?.ok;

  return (
    <AdminShell>
      <div className="mx-auto flex max-w-[1160px] flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <Link to={base}><Button size="sm" variant="ghost">← Queue</Button></Link>
          <span className="ml-auto flex items-center gap-2">
            {lc && <Badge tone={lc.tone} appearance="solid" size="md">{lc.label}</Badge>}
            {d?.services.some((s) => /^(tax-vat|legal-advisory)/.test(s.service_code)) && <Badge tone="error" appearance="outline" size="md">High risk · regulated area</Badge>}
          </span>
        </div>
        {error && <Banner status="warning" title={error} />}
        {!d && !error && <div className="space-y-4"><Skeleton variant="rect" height={60} /><Skeleton variant="rect" height={160} /><Skeleton variant="rect" height={400} /></div>}
        {d && (
          <>
            <div>
              <h1 className="font-serif text-[32px] font-semibold text-fg">{d.provider.name}</h1>
              <p className="mt-1 text-[13px] text-fg-secondary">{d.provider.provider_key} · {d.services.map((s) => s.service_code.split('.')[0]).filter((v, i, a) => a.indexOf(v) === i).join(', ') || 'no services'} · {countries.join(', ') || 'no countries'} · since {fmt(d.provider.lifecycle_status_since, locale)}{d.has_dashboard_user ? '' : ' · no dashboard login linked'}</p>
            </div>
            {note && <Banner status="info" title={note} onClose={() => setNote(null)} />}

            {/* Gate-Leiste (8A) */}
            <Card styleVariant="outlined" className="space-y-3 p-5">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-[15px] font-semibold text-fg">Activation gate</h2>
                <Badge tone={gate?.ok ? 'success' : 'warning'} size="sm">{GATE_ITEMS.length - (gate?.missing.filter((m) => GATE_ITEMS.includes(m)).length ?? 0)} of {GATE_ITEMS.length} conditions</Badge>
                <span className="ml-auto text-[12px] text-fg-tertiary">Target on activation today: <strong className="text-fg">{gate?.target ?? '—'}</strong> ({gate?.approved_cells ?? 0} of {gate?.total_cells ?? 0} cells approved)</span>
              </div>
              <div className="grid gap-2 md:grid-cols-4">
                {GATE_ITEMS.map((g) => {
                  const missing = gate?.missing.includes(g) ?? true;
                  const reasons = g === 'billing.not_ready' ? (gate?.missing ?? []).filter((m) => m.startsWith('billing.') && m !== 'billing.not_ready').map((m) => GATE_LABEL[m] ?? m) : g === 'plan.category_allowance' && gate?.allowance ? [gate.allowance.plan ? `over: ${gate.allowance.over.join(', ')}` : 'no plan chosen'] : [];
                  return (
                    <div key={g} className={cn('rounded-md px-3 py-2 text-[12px]', missing ? 'bg-warning-bg text-fg' : 'bg-surface-secondary text-fg-secondary')}>
                      <span className="flex items-center gap-1.5">{missing ? <AlertCircle size={14} className="text-warning-600" /> : <CheckCircle2 size={14} className="text-success-600" />}{GATE_LABEL[g]}</span>
                      {missing && reasons.length > 0 && <span className="block pl-5 text-warning-700">{reasons.join(' · ')}</span>}
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-auto max-w-xl text-[12px] text-fg-tertiary">Activation is possible only once every condition is met. The API returns the same points — this bar is not a copy, it is the same state.</span>
                <Button size="sm" variant="secondary" onClick={() => setDialog({ kind: 'request' })}>Request evidence</Button>
                {d.provider.lifecycle_status === 'submitted' && <Button size="sm" variant="secondary" onClick={() => act(() => setLifecycle(key, 'under_verification'), 'Moved to under review.')}>Start review</Button>}
                {['active', 'limited'].includes(d.provider.lifecycle_status) ? (
                  <Button size="sm" variant="ghost" onClick={() => setDialog({ kind: 'lifecycle', to: 'paused' })}>Pause</Button>
                ) : (
                  <Button size="sm" disabled={!canActivate} onClick={() => setDialog({ kind: 'lifecycle', to: gate?.target ?? 'limited' })}>{gate?.target === 'active' ? 'Activate' : 'Activate as limited'}</Button>
                )}
              </div>
            </Card>

            <div className="grid items-start gap-4 lg:grid-cols-[1fr_440px]">
              {/* Links: Angabe */}
              <div className="space-y-4">
                <Card styleVariant="outlined" className="space-y-2.5 p-5">
                  <div className="flex items-center justify-between"><h2 className="text-[15px] font-semibold text-fg">Claimed · legal entity & representation</h2><Badge tone="neutral" size="sm">confidential</Badge></div>
                  <KV k="Company" v={d.provider.name} ok={d.checklist.find((c) => c.type === 'incorporation')?.state === 'reviewed'} />
                  <KV k="Legal form" v={d.confidential?.entity_type} />
                  <KV k="Registration no." v={d.confidential?.registration_number} ok={d.checklist.find((c) => c.type === 'incorporation')?.state === 'reviewed'} />
                  <KV k="Registered address" v={d.confidential?.registered_address} />
                  <KV k="Representative" v={[d.confidential?.representative_name, d.confidential?.representative_title].filter(Boolean).join(' · ')} ok={d.checklist.find((c) => c.type === 'representative_identity')?.state === 'reviewed'} />
                  <KV k="Insurance" v={[d.confidential?.insurance_type, d.confidential?.insurance_provider, d.confidential?.insurance_valid_until ? `valid until ${d.confidential.insurance_valid_until}` : null].filter(Boolean).join(' · ')} ok={d.checklist.find((c) => c.type === 'insurance')?.state === 'reviewed'} />
                  <KV k="Contact" v={d.provider.contact_email ?? '—'} />
                  <KV k="Agreements" v={`${d.agreements.length} of ${d.required_agreements.length} · ${d.agreements.map((a) => `${a.agreement_type} ${a.version}`).join(', ') || '—'}`} ok={d.required_agreements.every((r) => d.agreements.some((a) => a.agreement_type === r))} />
                  <p className="pt-1 text-[12px] text-fg-tertiary">Check mark = matches a verified piece of evidence. The representative is decided on the register extract (identity service to follow).</p>
                </Card>

                <Card styleVariant="outlined" className="space-y-3 p-5">
                  <div className="flex items-center justify-between"><h2 className="text-[15px] font-semibold text-fg">Approvals per service and country</h2><Badge tone={gate?.approved_cells ? 'success' : 'warning'} size="sm">{gate?.approved_cells ?? 0} of {gate?.total_cells ?? 0} approved</Badge></div>
                  <div className="overflow-x-auto rounded-md border border-stroke-subtle">
                    <table className="w-full text-[13px]">
                      <thead className="bg-surface-secondary text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary"><tr><th className="px-3 py-2 text-left font-semibold">Service</th>{countries.map((c) => <th key={c} className="w-[210px] px-3 py-2 text-left font-semibold"><Tag tone="neutral">{c}</Tag></th>)}</tr></thead>
                      <tbody>
                        {d.matrix.map((row) => (
                          <tr key={row.service_id} className="border-t border-stroke-subtle align-top">
                            <td className="px-3 py-3"><p className="font-medium text-fg">{row.service_name}</p><p className="text-[12px] text-fg-tertiary">{row.service_code}</p></td>
                            {countries.map((c) => {
                              const cell = row.cells.find((x) => x.country_code === c);
                              if (!cell) return <td key={c} className="px-3 py-3 text-fg-tertiary">—</td>;
                              const st: CellState = cell.status === 'pending' && (requestedCells.has(`${row.service_id}:${c}`) || requestedCells.has(`*:${c}`)) ? 'requested' : cell.status;
                              const Icon = CELL[st].icon;
                              const actions: Array<[string, CellAction, 'success' | 'ghost']> = st === 'pending' || st === 'requested' ? [['Approve', 'approve', 'success'], ['Limit', 'limit', 'ghost'], ['Reject', 'reject', 'ghost'], ['Request', 'request_info', 'ghost']]
                                : st === 'approved' ? [['Limit', 'limit', 'ghost'], ['Pause', 'pause', 'ghost']] : st === 'limited' ? [['Approve', 'approve', 'success'], ['Pause', 'pause', 'ghost']] : [['Reopen', 'reopen', 'ghost']];
                              return (
                                <td key={c} className="px-3 py-3">
                                  <span className="flex items-center gap-2"><Icon size={15} className={CELL[st].color} /><Badge tone={CELL[st].tone} size="sm">{CELL[st].label}</Badge></span>
                                  <p className="mt-1 text-[12px] text-fg-tertiary">{cell.limitations ?? (cell.approved_at ? `since ${fmt(cell.approved_at, locale)}` : '')}</p>
                                  <div className="mt-1.5 flex flex-wrap gap-1">{actions.map(([l, a, v]) => <Button key={a} size="sm" variant={v} onClick={() => a === 'approve' || a === 'reopen' ? act(() => decideCoverage(key, cell.coverage_id, { action: a }), `${l}: ${row.service_name} · ${c}`) : setDialog({ kind: 'cell', cell, action: a })}>{l}</Button>)}</div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[12px] text-fg-tertiary">Cell actions: approve · limit (with note) · reject (with reason) · pause · request evidence. Reject, limit and request need a reason the provider reads.</p>
                </Card>

                {d.open_requests.length > 0 && (
                  <Card styleVariant="outlined" className="space-y-2 p-5">
                    <h2 className="text-[15px] font-semibold text-fg">Open requests</h2>
                    {d.open_requests.map((r) => (
                      <div key={r.id} className="flex items-start gap-3 text-[13px]"><AlertCircle size={15} className="mt-0.5 text-warning-600" /><span className="min-w-0 flex-1"><span className="font-medium text-fg">{EVIDENCE_LABEL[r.evidence_type] ?? r.evidence_type}{r.country_code ? ` · ${r.country_code}` : ''}</span><span className="block text-[12px] text-fg-tertiary">{r.message} · {fmt(r.requested_at, locale, true)}</span></span><Button size="sm" variant="ghost" onClick={() => act(() => withdrawRequest(key, r.id), 'Request withdrawn.')}>Withdraw</Button></div>
                    ))}
                  </Card>
                )}

                <Card styleVariant="outlined" className="space-y-2 p-5">
                  <h2 className="text-[15px] font-semibold text-fg">Decision log</h2>
                  {d.history.length === 0 && <p className="text-[12px] text-fg-tertiary">Nothing decided yet.</p>}
                  {d.history.map((h) => (
                    <div key={h.id} className="flex gap-3 text-[13px]"><span className="w-[120px] shrink-0 text-[12px] text-fg-tertiary">{fmt(h.created_at, locale, true)}</span><span className="min-w-0 flex-1"><span className="block font-medium text-fg">{h.subject} · {h.action}{(h.to ?? h.to_value) ? ` → ${h.to ?? h.to_value}` : ''}</span>{h.reason && <span className="block text-[12px] text-fg-tertiary">{h.reason}</span>}</span><span className="w-[70px] shrink-0 text-right text-[12px] text-fg-tertiary">{h.actor_kind}</span></div>
                  ))}
                </Card>
              </div>

              {/* Rechts: Register + Dokument */}
              <div className="space-y-4">
                <Card styleVariant="outlined" className="space-y-2.5 p-5">
                  <div className="flex items-center justify-between"><h2 className="text-[15px] font-semibold text-fg">Registry</h2><Badge tone={d.registry.vat.status === 'valid' ? 'success' : d.registry.vat.status === 'invalid' ? 'error' : 'neutral'} size="sm">VIES · {d.registry.vat.status ?? 'not checked'}</Badge></div>
                  <KV k="VAT ID" v={d.registry.vat.vat_id} ok={d.registry.vat.status === 'valid'} />
                  <KV k="Checked" v={fmt(d.registry.vat.checked_at, locale, true)} />
                  <p className="text-[12px] text-fg-tertiary">Registry check instead of a document: the result is stored, not an ID card.</p>
                </Card>

                <Card styleVariant="outlined" className="space-y-3 p-5">
                  <div className="flex items-center justify-between"><h2 className="text-[15px] font-semibold text-fg">Evidence</h2><Badge tone={d.checklist.every((c) => c.state === 'reviewed') ? 'success' : 'warning'} size="sm">{d.checklist.filter((c) => c.state === 'reviewed').length} of {d.checklist.length}</Badge></div>
                  <div className="divide-y divide-stroke-subtle overflow-hidden rounded-md border border-stroke-subtle">
                    {d.evidence.map((e) => (
                      <button key={e.id} type="button" onClick={() => setSelected(e.id)} className={cn('flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px]', selected === e.id ? 'bg-brand/10' : 'hover:bg-surface-secondary')}>
                        <FileText size={14} className="shrink-0 text-fg-tertiary" />
                        <span className="min-w-0 flex-1 truncate text-fg">{EVIDENCE_LABEL[e.evidence_type] ?? e.evidence_type}{e.supports_countries?.length ? ` · ${e.supports_countries.join(', ')}` : ''}{e.original_name ? ` · ${e.original_name}` : ''}</span>
                        <Badge tone={RESULT[e.result].tone} size="sm">{RESULT[e.result].label}</Badge>
                      </button>
                    ))}
                    {d.evidence.length === 0 && <p className="px-3 py-3 text-[12px] text-fg-tertiary">No evidence uploaded yet.</p>}
                  </div>
                  {ev && <EvidenceDecision key={ev.id} providerKey={key} ev={ev} locale={locale} onDone={(msg) => act(async () => undefined, msg)} onRequest={() => setDialog({ kind: 'request' })} />}
                </Card>
              </div>
            </div>
          </>
        )}

        {/* Dialoge: Zell-Aktion mit Grund · Lifecycle mit Grund · Nachfrage */}
        <ReasonDialog dialog={dialog} onClose={() => setDialog(null)} onSubmit={async (reason, extra) => {
          if (!dialog) return;
          if (dialog.kind === 'cell') await act(() => decideCoverage(key, dialog.cell.coverage_id, { action: dialog.action, reason, limitations: dialog.action === 'limit' ? reason : undefined, evidence_type: dialog.action === 'request_info' ? (extra || 'professional_licence') : undefined }), `${dialog.action} · ${dialog.cell.country_code}`);
          if (dialog.kind === 'lifecycle') await act(() => setLifecycle(key, dialog.to, reason), `Status → ${dialog.to}`);
          if (dialog.kind === 'request') await act(() => requestInfo(key, { evidence_type: extra || 'professional_licence', message: reason }), 'Evidence requested — the provider is notified.');
          setDialog(null);
        }} />
      </div>
    </AdminShell>
  );
}

function EvidenceDecision({ providerKey, ev, locale, onDone, onRequest }: { providerKey: string; ev: ReviewEvidence; locale: string; onDone: (msg: string) => Promise<void>; onRequest: () => void }) {
  const [expires, setExpires] = useState(ev.expires_at ?? '');
  const [next, setNext] = useState('');
  const [notes, setNotes] = useState(ev.reviewer_notes ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const decide = async (result: EvidenceDecision) => {
    if (result === 'rejected' && !notes.trim()) { setErr('A rejection needs a reason the provider can act on.'); return; }
    setBusy(true); setErr(null);
    try { await decideEvidence(providerKey, ev.id, { result, notes: notes.trim() || undefined, expires_at: expires || undefined, next_review_at: next || undefined }); await onDone(`${RESULT[result].label}: ${EVIDENCE_LABEL[ev.evidence_type] ?? ev.evidence_type}`); }
    catch (e) { setErr(e instanceof Error ? e.message : 'That did not work.'); }
    finally { setBusy(false); }
  };
  return (
    <div className="space-y-3">
      <div className="rounded-md bg-surface-tertiary p-3">
        <div className="flex items-center justify-between text-[12px] text-fg-secondary">
          <span>{ev.original_name ?? (ev.source === 'registry_check' ? `Registry · ${ev.registry_reference ?? ''}` : '—')}{ev.size_bytes ? ` · ${Math.round(ev.size_bytes / 1000)} KB` : ''}{ev.uploaded_at ? ` · ${fmt(ev.uploaded_at, locale)}` : ''}</span>
          {ev.download_url && <a href={ev.download_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-fg-brand hover:underline">open · link valid {Math.round((ev.download_expires_in_sec ?? 600) / 60)} min <ExternalLink size={12} /></a>}
        </div>
        {ev.source === 'document' && (
          ev.download_url ? <iframe title={ev.original_name ?? 'document'} src={ev.download_url} className="mt-2 h-[280px] w-full rounded border border-stroke bg-surface" /> : <div className="mt-2 grid h-[120px] place-items-center rounded border border-dashed border-stroke text-[12px] text-fg-tertiary">{ev.upload_confirmed ? 'No signed link available.' : 'Upload not confirmed yet — nothing to show.'}</div>
        )}
      </div>
      <p className="text-[13px] font-medium text-fg">Decision on this evidence</p>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-[12px] text-fg-tertiary">Valid until<Input type="date" inputSize="sm" value={expires} onChange={(e) => setExpires(e.target.value)} className="mt-1" /></label>
        <label className="text-[12px] text-fg-tertiary">Next review<Input type="date" inputSize="sm" value={next} onChange={(e) => setNext(e.target.value)} className="mt-1" /></label>
      </div>
      <label className="block text-[12px] text-fg-tertiary">Note (required for a rejection — the provider reads it)<Textarea inputSize="sm" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" /></label>
      {err && <p className="text-[12px] text-error-500">{err}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="success" disabled={busy || (ev.source === 'document' && !ev.upload_confirmed)} onClick={() => decide('reviewed')}>Verified</Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => decide('rejected')}>Reject</Button>
        <Button size="sm" variant="secondary" className="ml-auto" onClick={onRequest}>Request evidence</Button>
      </div>
    </div>
  );
}

function ReasonDialog({ dialog, onClose, onSubmit }: { dialog: { kind: 'cell'; cell: MatrixCell; action: CellAction } | { kind: 'lifecycle'; to: LifecycleStatus } | { kind: 'request' } | null; onClose: () => void; onSubmit: (reason: string, extra?: string) => Promise<void> }) {
  const [reason, setReason] = useState('');
  const [type, setType] = useState('professional_licence');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setReason(''); setType('professional_licence'); }, [dialog]);
  if (!dialog) return null;
  const title = dialog.kind === 'cell' ? `${dialog.action.replace('_', ' ')} · ${dialog.cell.country_code}` : dialog.kind === 'lifecycle' ? `Set status → ${dialog.to}` : 'Request evidence';
  const needsType = dialog.kind === 'request' || (dialog.kind === 'cell' && dialog.action === 'request_info');
  const needsReason = dialog.kind === 'request' || (dialog.kind === 'cell' && dialog.action !== 'approve' && dialog.action !== 'reopen') || (dialog.kind === 'lifecycle' && ['paused', 'suspended', 'terminated', 'more_info_required'].includes(dialog.to));
  return (
    <Modal open onClose={onClose} title={title} size="md" footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={busy || (needsReason && !reason.trim())} onClick={async () => { setBusy(true); try { await onSubmit(reason.trim(), type); } finally { setBusy(false); } }}>Confirm</Button></div>}>
      <div className="space-y-3">
        {needsType && (
          <label className="block text-[12px] text-fg-tertiary">Evidence type
            <select value={type} onChange={(e) => setType(e.target.value)} className="mt-1 w-full rounded-md border border-stroke bg-surface px-3 py-2 text-[13px] text-fg">
              {Object.entries(EVIDENCE_LABEL).filter(([k]) => k !== 'vat_id').map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
        )}
        <label className="block text-[12px] text-fg-tertiary">{needsReason ? 'Reason — the provider reads this' : 'Note (optional)'}
          <Textarea inputSize="sm" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1" placeholder={dialog.kind === 'request' ? 'e.g. Please provide the tax-advisory licence for Austria (chamber certificate or register extract).' : ''} />
        </label>
        <p className="text-[12px] text-fg-tertiary">Plain, actionable, no deadline threats. The provider sees exactly this text in the Verification Center and by email.</p>
      </div>
    </Modal>
  );
}
