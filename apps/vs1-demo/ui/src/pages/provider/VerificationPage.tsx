import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle2, Clock, Info, XCircle } from 'lucide-react';
import { ProviderShell } from '../../components/provider/ProviderShell';
import { Card } from '../../components/ui/Card';
import { Badge, type BadgeTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Banner } from '../../components/ui/Banner';
import { Tag } from '../../components/ui/Tag';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { fetchVerification, type ChecklistItem, type CoverageStatus, type LifecycleStatus, type MatrixCell, type Verification } from '../../api/application';

// ─── Provider · Verification Center ──────────────────────────────────────────
// Figma "Provider · Verification Center v2", Canvas-Wahl 5B: die Matrix
// Leistung × Land mit einem Zustand je Zelle, darueber die Nachfrage als
// Banner, darunter Checkliste und Historie. Alles kommt aus
// GET /provider/:key/verification; die Historie zeigt, WAS entschieden wurde
// und warum — nicht wer (die API liefert keine Reviewer-IDs).

type CellState = CoverageStatus | 'requested';
const CELL: Record<CellState, { tone: BadgeTone; icon: typeof CheckCircle2; color: string }> = {
  approved: { tone: 'success', icon: CheckCircle2, color: 'text-success-600' },
  limited: { tone: 'info', icon: Info, color: 'text-info-500' },
  pending: { tone: 'neutral', icon: Clock, color: 'text-fg-tertiary' },
  requested: { tone: 'warning', icon: AlertCircle, color: 'text-warning-600' },
  rejected: { tone: 'error', icon: XCircle, color: 'text-error-500' },
  suspended: { tone: 'neutral', icon: Clock, color: 'text-fg-tertiary' },
  expired: { tone: 'neutral', icon: Clock, color: 'text-fg-tertiary' },
};
const LIFECYCLE_TONE: Record<LifecycleStatus, BadgeTone> = {
  draft: 'neutral', submitted: 'info', more_info_required: 'warning', under_verification: 'brand', approved_pending_activation: 'info',
  active: 'success', limited: 'info', reverification_due: 'warning', paused: 'neutral', suspended: 'error', terminated: 'neutral',
};
const STATE_TONE: Record<ChecklistItem['state'], BadgeTone> = { missing: 'warning', uploading: 'info', received: 'info', reviewed: 'success', rejected: 'error', expired: 'error' };

function fmtDate(iso: string | null | undefined, locale: string, withTime = false): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return withTime ? d.toLocaleString(locale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Eine Nachfrage gilt fuer ihre Leistung × Land — oder fuer das ganze Konto,
// wenn sie keine Leistung nennt. Sonst faerbte eine Nachfrage zur Zulassung AT
// auch die Datenschutz-Zelle AT gelb.
function cellState(cell: MatrixCell & { service_id: string }, requested: Set<string>): CellState {
  return cell.status === 'pending' && (requested.has(`${cell.service_id}:${cell.country_code}`) || requested.has(`*:${cell.country_code}`)) ? 'requested' : cell.status;
}

function Stat({ label, value, hint, badge }: { label: string; value: React.ReactNode; hint?: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <Card styleVariant="outlined" className="p-4">
      <div className="flex items-center justify-between gap-2"><span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-tertiary">{label}</span>{badge}</div>
      <p className="mt-1 font-serif text-[22px] font-semibold leading-tight text-fg">{value}</p>
      {hint && <p className="mt-1 text-[12px] leading-relaxed text-fg-tertiary">{hint}</p>}
    </Card>
  );
}

export function VerificationPage() {
  const { t, i18n } = useTranslation('providerws');
  const locale = i18n.resolvedLanguage || 'en';
  const base = `/${locale}/partner-dashboard`;
  const [v, setV] = useState<Verification | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { fetchVerification().then(setV).catch(() => setError(t('verification.loadError'))); }, [t]);

  const countries = v ? Array.from(new Set(v.matrix.flatMap((r) => r.cells.map((c) => c.country_code)))).sort() : [];
  const requested = new Set((v?.open_requests ?? []).filter((r) => r.country_code).map((r) => `${r.service_id ?? '*'}:${r.country_code}`));
  const cells = v ? v.matrix.flatMap((r) => r.cells) : [];
  const approved = cells.filter((c) => c.status === 'approved' || c.status === 'limited').length;
  const reviewed = v ? v.checklist.filter((c) => c.state === 'reviewed').length : 0;
  const firstRequest = v?.open_requests[0];

  return (
    <ProviderShell>
      <div className="mx-auto max-w-[1140px] space-y-5">
        <div>
          <h1 className="font-serif text-[30px] font-bold leading-tight text-fg">{t('verification.title')}</h1>
          <p className="mt-1 max-w-4xl text-body-sm leading-relaxed text-fg-secondary">{t('verification.subtitle')}</p>
        </div>
        {error && <Banner status="warning" title={error} />}
        {!v && !error && <div className="space-y-4"><Skeleton variant="rect" height={90} /><Skeleton variant="rect" height={120} /><Skeleton variant="rect" height={260} /></div>}

        {v && (
          <>
            {firstRequest && (
              <Banner status="warning" title={t('verification.banner.title')} action={<Link to={`${base}/application`}><Button size="sm">{t('verification.banner.cta')}</Button></Link>}>
                {firstRequest.country_code ? `${t('verification.requestFor', { country: firstRequest.country_code })}: ` : ''}{firstRequest.message}
              </Banner>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Stat label={t('verification.stat.status')} value={t(`verification.lifecycle.${v.lifecycle.status}`)}
                badge={<Badge tone={LIFECYCLE_TONE[v.lifecycle.status]} size="sm" dot>{' '}</Badge>}
                hint={<>{v.lifecycle.since ? t('verification.stat.since', { date: fmtDate(v.lifecycle.since, locale) }) : ''}{i18n.exists(`providerws:verification.lifecycleHint.${v.lifecycle.status}`) ? ` · ${t(`verification.lifecycleHint.${v.lifecycle.status}`, { date: fmtDate(v.lifecycle.grace_until, locale) })}` : ''}</>} />
              <Stat label={t('verification.stat.approvals')} value={`${approved} / ${cells.length}`} hint={t('verification.stat.approvalsHint')} />
              <Stat label={t('verification.stat.evidence')} value={`${reviewed} / ${v.checklist.length}`} hint={t('verification.stat.evidenceHint')} />
              <Stat label={t('verification.stat.requests')} value={v.open_requests.length} hint={v.open_requests.map((r) => `${t(`application.evidence.type.${r.evidence_type}`, { defaultValue: r.evidence_type })}${r.country_code ? ` · ${r.country_code}` : ''}`).join(', ') || '—'} />
            </div>

            {/* Matrix (5B) */}
            <Card styleVariant="outlined" className="space-y-4 p-5">
              <h2 className="text-[15px] font-semibold text-fg">{t('verification.matrix.title')}</h2>
              <p className="max-w-3xl text-[12px] leading-relaxed text-fg-tertiary">{t('verification.matrix.intro')}</p>
              {v.matrix.length === 0 ? <EmptyState size="compact" title={t('verification.matrix.empty')} /> : (
                <div className="overflow-x-auto rounded-md border border-stroke-subtle">
                  <table className="w-full text-[13px]">
                    <thead className="bg-surface-secondary text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">{t('verification.matrix.service')}</th>
                        {countries.map((c) => <th key={c} className="w-[220px] px-3 py-2 text-left font-semibold"><span className="flex items-center gap-2"><Tag tone="neutral">{c}</Tag></span></th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {v.matrix.map((row) => (
                        <tr key={row.service_id} className="border-t border-stroke-subtle align-top">
                          <td className="px-3 py-3"><p className="font-medium text-fg">{row.service_name}</p><p className="text-[12px] text-fg-tertiary">{row.service_code}</p></td>
                          {countries.map((c) => {
                            const cell = row.cells.find((x) => x.country_code === c);
                            if (!cell) return <td key={c} className="px-3 py-3 text-fg-tertiary">—</td>;
                            const st = cellState({ ...cell, service_id: row.service_id } as MatrixCell & { service_id: string }, requested);
                            const Icon = CELL[st].icon;
                            return (
                              <td key={c} className="px-3 py-3">
                                <span className="flex items-center gap-2"><Icon size={16} className={CELL[st].color} /><Badge tone={CELL[st].tone} size="sm">{t(`verification.cell.${st}`)}</Badge></span>
                                <p className="mt-1 text-[12px] text-fg-tertiary">{cell.limitations ?? (cell.status === 'approved' && cell.approved_at ? t('verification.cell.sinceDate', { date: fmtDate(cell.approved_at, locale) }) : cell.status === 'pending' ? t('verification.cell.inReview') : '')}</p>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="flex flex-wrap gap-4 text-[12px] text-fg-tertiary">
                {(['approved', 'limited', 'pending', 'requested', 'rejected'] as CellState[]).map((k) => { const Icon = CELL[k].icon; return <span key={k} className="flex items-center gap-1.5"><Icon size={14} className={CELL[k].color} />{t(`verification.cell.${k}`)}</span>; })}
              </div>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card styleVariant="outlined" className="space-y-3 p-5">
                <div className="flex items-center justify-between"><h2 className="text-[15px] font-semibold text-fg">{t('verification.checklist.title')}</h2><Badge tone={reviewed === v.checklist.length ? 'success' : 'warning'} size="sm">{reviewed} / {v.checklist.length}</Badge></div>
                {v.checklist.map((item) => (
                  <div key={item.type + (item.country_code ?? '')} className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="text-fg">{t(`application.evidence.type.${item.type}`)}{item.country_code ? ` · ${item.country_code}` : ''}</span>
                    <Badge tone={STATE_TONE[item.state]} size="sm">{t(`application.evidence.state.${item.state}`)}</Badge>
                  </div>
                ))}
              </Card>
              <Card styleVariant="outlined" className="space-y-3 p-5">
                <h2 className="text-[15px] font-semibold text-fg">{t('verification.history.title')}</h2>
                <p className="text-[12px] text-fg-tertiary">{t('verification.history.intro')}</p>
                {v.history.length === 0 && <p className="text-[12px] text-fg-tertiary">{t('verification.history.empty')}</p>}
                {v.history.map((h) => (
                  <div key={h.id} className="flex gap-3 text-[13px]">
                    <span className="w-[120px] shrink-0 text-[12px] text-fg-tertiary">{fmtDate(h.created_at, locale, true)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-fg">{t(`verification.action.${h.action}`, { defaultValue: h.action })}{h.to && h.subject === 'lifecycle' ? ` · ${t(`verification.lifecycle.${h.to}`, { defaultValue: h.to })}` : ''}</span>
                      {h.reason && <span className="block text-[12px] text-fg-tertiary">{h.reason}</span>}
                    </span>
                    <span className="w-[80px] shrink-0 text-right text-[12px] text-fg-tertiary">{t(`verification.history.actor.${h.actor_kind}`)}</span>
                  </div>
                ))}
              </Card>
            </div>
          </>
        )}
      </div>
    </ProviderShell>
  );
}
