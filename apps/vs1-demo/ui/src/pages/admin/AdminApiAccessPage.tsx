import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AdminShell } from '../../components/admin/AdminShell';
import { Card } from '../../components/ui/Card';
import { Badge, FilterChip, type BadgeTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Checkbox } from '../../components/ui/Checkbox';
import { Banner } from '../../components/ui/Banner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { adminListApiClients, adminDecideApiClient, ALL_SCOPES, type AdminApiClientRow, type ApiClientStatus, type ApiScope } from '../../api/apiAccess';

// ─── Admin · API-Zugänge (Phase 7, ADR-0010, Canvas 4A) ─────────────────────
// Figma: Seite „Enterprise-API (Phase 7)", 3683:399. Eine Queue neben der
// Pruef-Queue: je Antrag Zweck, Kontakt, Scopes als Haekchen (das Team vergibt,
// nicht der Anbieter), Rate Limit, Gebuehren-Notiz, dann Freigeben oder
// Ablehnen mit Begruendung. Darunter die aktiven Zugaenge mit Sperren (Grund
// Pflicht) und Widerrufen. Wie die anderen Admin-Seiten bleibt die
// Oberflaeche englisch: der Arbeitsplatz ist intern.

const STATUS: Record<ApiClientStatus, { label: string; tone: BadgeTone }> = {
  requested: { label: 'Requested', tone: 'warning' }, approved: { label: 'Approved · key pending', tone: 'info' }, active: { label: 'Active', tone: 'success' },
  suspended: { label: 'Suspended', tone: 'error' }, revoked: { label: 'Revoked', tone: 'neutral' }, rejected: { label: 'Rejected', tone: 'neutral' },
};
const SCOPE_HELP: Record<ApiScope, string> = {
  'leads:read': 'Leads after disclosure', 'leads:write': 'Write back lead status', 'events:read': 'Event feed',
  'billing:read': 'Invoices and credits', 'availability:write': 'Only with explicit approval',
};
const FILTERS: Array<{ key: 'open' | 'active' | 'suspended' | 'all'; label: string; match: (s: ApiClientStatus) => boolean }> = [
  { key: 'open', label: 'Open', match: (s) => s === 'requested' || s === 'approved' },
  { key: 'active', label: 'Active', match: (s) => s === 'active' },
  { key: 'suspended', label: 'Suspended', match: (s) => s === 'suspended' },
  { key: 'all', label: 'All', match: () => true },
];

const fmt = (iso: string | null, locale: string) => (iso ? new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');

export function AdminApiAccessPage() {
  const { i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || 'en';
  const [rows, setRows] = useState<AdminApiClientRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'open' | 'active' | 'suspended' | 'all'>('open');
  const [notice, setNotice] = useState<string | null>(null);
  const load = () => adminListApiClients().then(setRows).catch(() => setError('API clients could not be loaded. The API answers 403 without an admin login.'));
  useEffect(() => { void load(); }, []);

  const visible = useMemo(() => (rows ?? []).filter((r) => FILTERS.find((f) => f.key === filter)!.match(r.status)), [rows, filter]);
  const count = (k: typeof filter) => (rows ?? []).filter((r) => FILTERS.find((f) => f.key === k)!.match(r.status)).length;

  const decide = async (row: AdminApiClientRow, patch: Parameters<typeof adminDecideApiClient>[1]) => {
    setNotice(null);
    try {
      const c = await adminDecideApiClient(row.id, patch);
      setRows((cur) => (cur ?? []).map((r) => (r.id === c.id ? { ...r, ...c } : r)));
      setNotice(`${row.provider_name ?? row.provider_key}: ${patch.action}${patch.action === 'approve' ? ' — the provider creates the key in their workspace' : ''}.`);
    } catch {
      setNotice(`${row.provider_name ?? row.provider_key}: the change did not go through. The provider sees the previous state.`);
    }
  };

  return (
    <AdminShell>
      <div className="mx-auto flex max-w-[1160px] flex-col gap-6">
        <div>
          <h1 className="font-serif text-[32px] font-semibold text-fg">API <span className="text-fg-accent-emphasis">access</span></h1>
          <p className="mt-1 max-w-3xl text-[13px] text-fg-secondary">Enterprise-API requests from Global providers: purpose, scopes, rate limit, fee note. Every decision is an event; a suspension or rejection always carries a reason the provider reads.</p>
        </div>
        {error && <Banner status="warning" title={error} />}
        {notice && <Banner status="info" title={notice} />}
        {!rows && !error && <Skeleton variant="rect" height={240} />}
        {rows && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {FILTERS.map((f) => <FilterChip key={f.key} selected={filter === f.key} onClick={() => setFilter(f.key)}>{f.label} · {count(f.key)}</FilterChip>)}
            </div>
            {visible.length === 0 && <EmptyState size="compact" title="Nothing in this view" description="No API clients match the filter." />}
            {visible.map((r) => (r.status === 'requested' ? <RequestCard key={r.id} row={r} locale={locale} onDecide={(p) => decide(r, p)} /> : <ClientRow key={r.id} row={r} locale={locale} onDecide={(p) => decide(r, p)} />))}
          </>
        )}
      </div>
    </AdminShell>
  );
}

function RequestCard({ row, locale, onDecide }: { row: AdminApiClientRow; locale: string; onDecide: (p: Parameters<typeof adminDecideApiClient>[1]) => Promise<void> }) {
  const [scopes, setScopes] = useState<ApiScope[]>(row.requested_scopes);
  const [limit, setLimit] = useState(String(row.rate_limit_per_minute || 120));
  const [fee, setFee] = useState(row.fee_note ?? '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const toggle = (s: ApiScope) => setScopes((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  const lim = Number(limit);
  const limitOk = Number.isInteger(lim) && lim >= 1 && lim <= 10000;
  const go = async (p: Parameters<typeof adminDecideApiClient>[1]) => { setBusy(true); try { await onDecide(p); } finally { setBusy(false); } };
  return (
    <Card styleVariant="outlined" className="space-y-4 p-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <h2 className="text-[16px] font-semibold text-fg">{row.provider_name ?? row.provider_key}</h2>
        <Badge tone="brand" size="sm">{row.plan_code ?? '—'}{!row.eligible && ' · not eligible'}</Badge>
        <Badge tone={STATUS.requested.tone} size="sm">Requested {fmt(row.created_at, locale)}</Badge>
        <span className="ml-auto text-[12px] text-fg-tertiary">{row.name} · {row.contact_email ?? '—'} · {row.terms_version ?? '—'} accepted</span>
      </div>
      <div className="rounded-lg bg-surface-secondary px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-tertiary">Purpose as stated</p>
        <p className="mt-1 text-[13px] text-fg">„{row.use_case ?? '—'}"</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-tertiary">Scopes — the team grants</p>
          {ALL_SCOPES.map((s) => (
            <label key={s} className="flex items-center gap-3 py-1.5 text-[13px]">
              <Checkbox size="sm" checked={scopes.includes(s)} onChange={() => toggle(s)} />
              <code className="font-mono text-[12px] text-fg">{s}</code>
              <span className="text-fg-secondary">{SCOPE_HELP[s]}</span>
              {row.requested_scopes.includes(s) && <Badge tone="neutral" size="xs" className="ml-auto">requested</Badge>}
            </label>
          ))}
        </div>
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-tertiary">Rate limit per minute</span>
            <Input inputSize="sm" type="number" min={1} max={10000} value={limit} onChange={(e) => setLimit(e.target.value)} error={!limitOk} />
            <span className="block text-[11px] text-fg-tertiary">Default 120 · 1 to 10 000 · 429 with Retry-After above</span>
          </label>
          <label className="block space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-tertiary">Fee (note only, invoiced manually)</span>
            <Input inputSize="sm" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="none — standard integration" maxLength={500} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-tertiary">Decision note (required to reject — the provider reads it)</span>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} />
          </label>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-stroke-subtle pt-3">
        <Button size="sm" variant="primary" disabled={busy || !limitOk || scopes.length === 0} onClick={() => go({ action: 'approve', scopes, rate_limit_per_minute: lim, fee_note: fee || undefined, decision_note: note || undefined })}>Approve</Button>
        <Button size="sm" variant="secondary" disabled={busy || !note.trim()} onClick={() => go({ action: 'reject', decision_note: note.trim() })}>Reject with reason</Button>
        <span className="ml-auto text-[11px] text-fg-tertiary">Approval → the provider creates the key · notification api_access_decided</span>
      </div>
    </Card>
  );
}

function ClientRow({ row, locale, onDecide }: { row: AdminApiClientRow; locale: string; onDecide: (p: Parameters<typeof adminDecideApiClient>[1]) => Promise<void> }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const st = STATUS[row.status];
  const go = async (p: Parameters<typeof adminDecideApiClient>[1]) => { setBusy(true); try { await onDecide(p); setAsking(false); setReason(''); } finally { setBusy(false); } };
  return (
    <Card styleVariant="outlined" className="space-y-3 px-5 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-medium text-fg">{row.provider_name ?? row.provider_key}</p>
        <code className="font-mono text-[12px] text-fg-secondary">{row.key_prefix ?? 'no key yet'}</code>
        <Badge tone={st.tone} size="sm">{st.label}</Badge>
        <span className="ml-auto text-[12px] text-fg-tertiary">
          {row.scopes.join(', ') || '—'} · {row.rate_limit_per_minute}/min · last used {row.last_used_at ? fmt(row.last_used_at, locale) : 'never'}{row.last_used_ip ? ` · ${row.last_used_ip}` : ''}
        </span>
        {row.status === 'active' || row.status === 'approved' ? <Button size="sm" variant="ghost" disabled={busy} onClick={() => setAsking((v) => !v)}>Suspend</Button> : null}
        {row.status === 'suspended' && <Button size="sm" variant="secondary" disabled={busy} onClick={() => go({ action: 'reinstate' })}>Reinstate</Button>}
        {row.status !== 'revoked' && row.status !== 'rejected' && <Button size="sm" variant="ghost" disabled={busy} onClick={() => go({ action: 'revoke' })}>Revoke</Button>}
      </div>
      {row.status === 'suspended' && row.suspended_reason && <p className="text-[12px] text-fg-secondary">Reason: {row.suspended_reason} · since {fmt(row.suspended_at, locale)}</p>}
      {row.fee_note && <p className="text-[12px] text-fg-tertiary">Fee note: {row.fee_note}</p>}
      {asking && (
        <div className="flex flex-wrap items-center gap-2 border-t border-stroke-subtle pt-3">
          <Input inputSize="sm" className="min-w-[320px] flex-1" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason — the provider reads it" maxLength={500} />
          <Button size="sm" variant="primary" disabled={busy || !reason.trim()} onClick={() => go({ action: 'suspend', reason: reason.trim() })}>Suspend with reason</Button>
          <Button size="sm" variant="ghost" onClick={() => setAsking(false)}>Cancel</Button>
        </div>
      )}
    </Card>
  );
}
