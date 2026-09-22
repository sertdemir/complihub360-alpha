import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock, FileText, PencilLine, RefreshCw } from 'lucide-react';
import { AdminShell } from '../../components/admin/AdminShell';
import { KPICard } from '../../components/ui/Cards';
import { Card } from '../../components/ui/Card';
import { Badge, FilterChip, type BadgeTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Banner } from '../../components/ui/Banner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { fetchQueue, type Queue, type QueueKind, type QueueRow, type Risk } from '../../api/review';
import type { LifecycleStatus } from '../../api/application';

// ─── Admin · Prüf-Queue (Figma "Admin · Prüf-Queue v2", Canvas 6A) ──────────
// Eine Tabelle, nach Risiko und Frist sortiert — die Sortierung macht die API
// (providerReview.ts), die Seite filtert nur. Wie die anderen Admin-Seiten
// bleibt die Oberflaeche englisch: der Review-Arbeitsplatz ist intern.

const KIND: Record<QueueKind, { label: string; icon: typeof FileText }> = {
  application: { label: 'Application', icon: FileText },
  reverification: { label: 'Re-verification', icon: RefreshCw },
  change_request: { label: 'Change request', icon: PencilLine },
  expiring_evidence: { label: 'Evidence expiring', icon: Clock },
};
const RISK: Record<Risk, { label: string; tone: BadgeTone; appearance: 'solid' | 'soft' }> = {
  high: { label: 'High', tone: 'error', appearance: 'solid' },
  medium: { label: 'Medium', tone: 'warning', appearance: 'soft' },
  low: { label: 'Low', tone: 'neutral', appearance: 'soft' },
};
export const LIFECYCLE: Record<LifecycleStatus, { label: string; tone: BadgeTone }> = {
  draft: { label: 'Draft', tone: 'neutral' }, submitted: { label: 'Submitted', tone: 'info' }, more_info_required: { label: 'Evidence requested', tone: 'warning' },
  under_verification: { label: 'Under review', tone: 'brand' }, approved_pending_activation: { label: 'Approved · activation pending', tone: 'info' },
  active: { label: 'Active', tone: 'success' }, limited: { label: 'Active (limited)', tone: 'info' }, reverification_due: { label: 'Re-verification due', tone: 'warning' },
  paused: { label: 'Paused', tone: 'neutral' }, suspended: { label: 'Suspended', tone: 'error' }, terminated: { label: 'Closed', tone: 'neutral' },
};
const FILTERS: Array<{ key: 'all' | QueueKind; label: string }> = [
  { key: 'all', label: 'All' }, { key: 'application', label: 'Applications' }, { key: 'reverification', label: 'Re-verification' }, { key: 'change_request', label: 'Changes' }, { key: 'expiring_evidence', label: 'Expiring' },
];

function relative(iso: string | null, locale: string): string {
  if (!iso) return '—';
  const d = new Date(iso); if (Number.isNaN(d.getTime())) return iso;
  const diffH = Math.round((d.getTime() - Date.now()) / 3_600_000);
  if (Math.abs(diffH) < 48) return diffH < 0 ? `${-diffH} h ago` : `in ${diffH} h`;
  return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function AdminProvidersPage() {
  const { i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || 'en';
  const base = `/${locale}/admin/providers`;
  const [queue, setQueue] = useState<Queue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | QueueKind>('all');
  const [q, setQ] = useState('');
  useEffect(() => { fetchQueue().then(setQueue).catch(() => setError('The queue could not be loaded. The API answers 403 without an admin login.')); }, []);

  const rows = useMemo(() => (queue?.rows ?? []).filter((r) => (filter === 'all' || r.kind === filter) && (!q || `${r.provider_name} ${r.provider_key}`.toLowerCase().includes(q.toLowerCase()))), [queue, filter, q]);
  const count = (k: 'all' | QueueKind) => (queue?.rows ?? []).filter((r) => k === 'all' || r.kind === k).length;
  const expiring = (queue?.rows ?? []).filter((r) => r.kind === 'expiring_evidence').length;

  return (
    <AdminShell>
      <div className="mx-auto flex max-w-[1160px] flex-col gap-6">
        <div>
          <h1 className="font-serif text-[32px] font-semibold text-fg">Review <span className="text-fg-accent-emphasis">Queue</span></h1>
          <p className="mt-1 text-[13px] text-fg-secondary">Applications, re-verifications, change requests and expiring evidence — sorted by risk, then deadline.</p>
        </div>
        {error && <Banner status="warning" title={error} />}
        {!queue && !error && <div className="grid gap-4 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} variant="rect" height={100} />)}</div>}
        {queue && (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <KPICard label="Open items" value={queue.counts.total} />
              <KPICard label="High risk" value={queue.counts.high} />
              <KPICard label="New applications" value={queue.counts.applications} />
              <KPICard label="Expiring in 30 days" value={expiring} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {FILTERS.map((f) => <FilterChip key={f.key} selected={filter === f.key} onClick={() => setFilter(f.key)}>{f.label} · {count(f.key)}</FilterChip>)}
              <Input inputSize="sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search provider" className="ml-auto w-[260px]" />
            </div>
            <Card styleVariant="outlined" className="overflow-hidden p-0">
              {rows.length === 0 ? <EmptyState size="compact" title="Nothing in this view" description="No open items match the filter." /> : (
                <table className="w-full text-[13px]">
                  <thead className="bg-surface-secondary text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">
                    <tr>{['Item', 'Provider', 'Status', 'Detail', 'Since / due', 'Risk', ''].map((h) => <th key={h} className="px-4 py-2.5 text-left font-semibold">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rows.map((r: QueueRow) => {
                      const Icon = KIND[r.kind].icon;
                      const lc = LIFECYCLE[r.lifecycle_status] ?? { label: r.lifecycle_status, tone: 'neutral' as BadgeTone };
                      const primary = r.kind === 'application' && (r.lifecycle_status === 'submitted' || r.lifecycle_status === 'more_info_required');
                      return (
                        <tr key={`${r.kind}-${r.provider_key}-${r.ref_id ?? ''}`} className="border-t border-stroke-subtle">
                          <td className="px-4 py-3"><span className="flex items-center gap-2 text-fg"><Icon size={15} className="text-fg-tertiary" />{KIND[r.kind].label}</span></td>
                          <td className="px-4 py-3"><p className="font-medium text-fg">{r.provider_name}</p><p className="text-[12px] text-fg-tertiary">{r.provider_key}</p></td>
                          <td className="px-4 py-3"><Badge tone={lc.tone} size="sm">{lc.label}</Badge></td>
                          <td className="px-4 py-3 text-fg-secondary">{r.detail ?? '—'}</td>
                          <td className="px-4 py-3 text-fg-secondary">{r.due_at ? `due ${relative(r.due_at, locale)}` : relative(r.since, locale)}</td>
                          <td className="px-4 py-3"><Badge tone={RISK[r.risk].tone} appearance={RISK[r.risk].appearance} size="sm">{RISK[r.risk].label}</Badge></td>
                          <td className="px-4 py-3 text-right"><Link to={`${base}/${r.provider_key}`}><Button size="sm" variant={primary ? 'primary' : 'secondary'}>{primary ? 'Review' : 'Open'}</Button></Link></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              <div className="flex items-center justify-between border-t border-stroke-subtle px-4 py-3 text-[12px] text-fg-tertiary">
                <span>Order: risk, then deadline. High = regulated area or suspension · Medium = new application or change · Low = expiry.</span>
                <span>{rows.length} items</span>
              </div>
            </Card>
          </>
        )}
      </div>
    </AdminShell>
  );
}
