import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ProviderShell } from '../../components/provider/ProviderShell';
import { LoadFailedState } from '../../components/provider/WorkspaceStates';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Tag } from '../../components/ui/Tag';
import { Textarea } from '../../components/ui/Textarea';
import { useWorkspaceData } from '../../lib/useWorkspaceData';
import { useRequestContext } from '../../lib/requestContext';
import {
  fetchPerformance, fetchPerformanceCsv, appealEnforcement, countedLabel, ratePct,
  type PerformanceFacts, type PerformanceTrendRow, type ProviderEnforcement, type ProviderPerformanceResponse,
} from '../../api/performance';

// ─── Provider /performance ────────────────────────────────────────────────────
// Phase 6 (ADR-0009 Nr. 1 und 4, Canvas-Wahl 2A „Faktenkarten mit Stichprobe",
// 10.10.2026). Figma: Seite „Performance & Übersicht (Phase 6)", 3668:138.
//
// Sechs Faktenkarten aus den Buchungen der letzten 90 Tage, jede mit Zaehler,
// Basis und Zeitraum. Was unter der Mindeststichprobe liegt, zeigt „—" und
// sagt, wie viele fehlen (Spec A §17: keine Strafe, keine Note ohne Daten).
// Darunter der Verlauf nach Bereich, Land, Monat (ab Growth) und der Export
// (ab Global) — als Zusatz, nicht als Schloss vor den Fakten. Ein Satz nennt,
// was das Ranking sieht: dieselben Fakten, in jedem Tarif.
//
// Bis Phase 6 las die Seite GET /metrics: Quoten der stillgelegten Anfrage-
// Pipeline, fuer jeden Anbieter dieselben. Kein „Score", kein Rang.

type T = (k: string, o?: Record<string, unknown>) => string;
type TrendKey = 'area' | 'country' | 'month';

export function PerformancePage() {
  const { t: tRaw, i18n } = useTranslation('providerws');
  const t = tRaw as unknown as T;
  const locale = i18n.resolvedLanguage || 'en';
  const { data, state, error, reload } = useWorkspaceData(fetchPerformance);

  return (
    <ProviderShell>
      <div className="mx-auto max-w-[1140px] space-y-6">
        <div>
          <h1 className="font-serif text-[30px] font-bold leading-tight text-fg">{t('performance.title')}</h1>
          <p className="mt-1 max-w-3xl text-body-sm leading-relaxed text-fg-secondary">{t('performance.subtitle')}</p>
        </div>

        {state === 'loading' && <div aria-busy="true" className="h-40 animate-pulse rounded-xl bg-surface-secondary/60 motion-reduce:animate-none" />}
        {state === 'error' && <LoadFailedState surface="performance" error={error} onRetry={reload} section />}
        {data && (
          <>
            {data.enforcement && <EnforcementCard e={data.enforcement} t={t} locale={locale} onChanged={reload} />}
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">
              {t('performance.range', { days: data.performance.window_days, bookings: data.performance.bookings })} · {t('performance.policy', { version: data.performance.policy_version })}
            </p>
            <Facts f={data.performance} t={t} />
            {data.performance.bookings === 0 && (
              <p className="max-w-3xl text-body-sm leading-relaxed text-fg-secondary">{t('performance.noBookings')}</p>
            )}
            <Trends data={data} t={t} locale={locale} />
            <p className="max-w-3xl text-[12px] leading-relaxed text-fg-tertiary">{t('performance.rankingNote')}</p>
          </>
        )}
      </div>
    </ProviderShell>
  );
}

function Facts({ f, t }: { f: PerformanceFacts; t: T }) {
  const of = t('performance.of');
  const need = f.rate_min_bookings;
  const insufficient = (have: number) => t('performance.insufficient', { have, need });
  const rate = (c: PerformanceFacts['attended']) => ratePct(c) ?? insufficient(c.of);
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" data-facts>
      <Fact label={t('performance.fact.attended')} value={countedLabel(f.attended, of)} sub={f.rates_shown ? `${rate(f.attended)} · ${t('performance.attendedSub', { days: f.window_days })}` : insufficient(f.bookings)} pending={!f.rates_shown} />
      <Fact label={t('performance.fact.userNoShow')} value={String(f.user_no_show.count)} sub={f.disputes_open ? t('performance.userNoShowDisputes', { count: f.disputes_open }) : t('performance.userNoShowSub')} />
      <Fact label={t('performance.fact.providerNoShow')} value={String(f.provider_no_show.count)} sub={t('performance.providerNoShowSub', { alert: f.incidents.alert_at, pause: f.incidents.pause_at, days: f.incidents.window_days, count: f.incidents.count })} />
      <Fact label={t('performance.fact.cancelled')} value={t('performance.cancelledValue', { count: f.cancelled_by_provider.count })} sub={t('performance.cancelledSub', { count: f.cancelled_by_user.count })} />
      <Fact label={t('performance.fact.rating')} value={f.rating.average == null ? '—' : f.rating.average.toLocaleString(undefined, { maximumFractionDigits: 1 })} sub={f.rating.average == null ? t('performance.ratingInsufficient', { have: f.rating.count, need: f.rating.min_count }) : t('performance.ratingSub', { count: f.rating.count })} pending={f.rating.average == null} />
      <Fact label={t('performance.fact.wouldRebook')} value={f.would_use_again.rate == null ? '—' : `${Math.round(f.would_use_again.rate * 100)} %`} sub={f.would_use_again.rate == null ? insufficient(f.would_use_again.of) : t('performance.wouldRebookSub', { count: f.would_use_again.count, of: f.would_use_again.of })} pending={f.would_use_again.rate == null} />
    </div>
  );
}

function Fact({ label, value, sub, pending = false }: { label: string; value: string; sub: string; pending?: boolean }) {
  return (
    <div data-fact={label} data-pending={pending}
      className={'space-y-1.5 rounded-xl border px-[18px] py-4 ' + (pending ? 'border-dashed border-stroke bg-surface-secondary/60' : 'border-stroke bg-surface')}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">{label}</p>
      <p className={'font-serif text-[26px] font-bold leading-tight tabular-nums ' + (pending ? 'text-fg-tertiary' : 'text-fg')}>{value}</p>
      <p className="text-[12px] leading-relaxed text-fg-tertiary">{sub}</p>
    </div>
  );
}

function Trends({ data, t, locale }: { data: ProviderPerformanceResponse; t: T; locale: string }) {
  const [by, setBy] = useState<TrendKey>('area');
  const [csv, setCsv] = useState<'idle' | 'busy' | 'failed'>('idle');
  const rows: PerformanceTrendRow[] = data.trends?.[by] ?? [];
  const max = Math.max(1, ...rows.map((r) => r.bookings));
  // Bereich und Land wie ueberall im Arbeitsbereich benannt (Termine, Leads).
  const { bereich, markt } = useRequestContext();
  const label = (key: string) => by === 'month'
    ? new Date(`${key}-01T00:00:00Z`).toLocaleDateString(locale, { month: 'short', year: 'numeric' })
    : by === 'area' ? bereich(key) : markt(key);

  const download = async () => {
    setCsv('busy');
    try {
      const text = await fetchPerformanceCsv();
      const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
      const a = document.createElement('a'); a.href = url; a.download = 'complihub360-bookings.csv'; a.click();
      URL.revokeObjectURL(url);
      setCsv('idle');
    } catch { setCsv('failed'); }
  };

  return (
    <Card styleVariant="outlined" className="p-5" data-section="trends">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">
          {t('performance.trendsTitle')} · {t(`performance.level.${data.analytics.level}`)}
        </p>
        <div className="flex items-center gap-3">
          {data.analytics.trends && (['area', 'country', 'month'] as TrendKey[]).map((k) => (
            <button key={k} type="button" onClick={() => setBy(k)} className={'text-[12px] font-medium ' + (by === k ? 'text-fg-brand' : 'text-fg-tertiary hover:text-fg')}>{t(`performance.trendsBy.${k}`)}</button>
          ))}
          {data.analytics.export
            ? <Button size="sm" variant="secondary" onClick={download} loading={csv === 'busy'}>{t('performance.csvExport')}</Button>
            : <Tag tone="neutral">{t('performance.csvLocked')}</Tag>}
        </div>
      </div>
      {csv === 'failed' && <p className="mt-2 text-[12px] text-error-500">{t('performance.csvFailed')}</p>}
      {!data.analytics.trends ? (
        <p className="mt-3 text-[13px] leading-relaxed text-fg-secondary">{t('performance.trendsLocked')}</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-[13px] text-fg-tertiary">{t('performance.trendsEmpty')}</p>
      ) : (
        <ul className="mt-2 divide-y divide-stroke">
          {rows.map((r) => (
            <li key={r.key} className="flex items-center gap-4 py-2.5 text-[13px]">
              <span className="w-[220px] shrink-0 truncate text-fg-secondary" title={r.key}>{label(r.key)}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-secondary"><span className="block h-full rounded-full bg-brand" style={{ width: `${Math.round((r.bookings / max) * 100)}%` }} /></span>
              <span className="shrink-0 tabular-nums text-fg">{t('performance.trendRow', { bookings: r.bookings, attended: r.attended, noShow: r.user_no_show + r.provider_no_show, cancelled: r.cancelled })}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ─── Buchungspause (§24) mit Einspruch ───────────────────────────────────────
// Die Pause sperrt Buchungen, nie die Sichtbarkeit. Der Anbieter liest den
// Grund, die Belege (Zahl der Vorfaelle) und legt einmal Einspruch ein; der
// Admin entscheidet. Sachlich, ohne Verstoss-Sprache.
function EnforcementCard({ e, t, locale, onChanged }: { e: ProviderEnforcement; t: T; locale: string; onChanged: () => void }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const date = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
  const send = async () => {
    setBusy(true); setFailed(false);
    try { await appealEnforcement(e.id, note.trim()); onChanged(); }
    catch { setFailed(true); }
    setBusy(false);
  };
  return (
    <Card styleVariant="outlined" className="space-y-3 border-warning-500/40 p-5" data-enforcement={e.action}>
      <div>
        <p className="text-[14px] font-semibold text-fg">{t(`performance.enforcement.${e.action}`)}</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-fg-secondary">
          {t('performance.enforcementBody', { date: date(e.created_at), count: e.incident_count ?? 0 })}
        </p>
      </div>
      {e.decision ? (
        <p className="text-[13px] text-fg">{t(`performance.appealDecided.${e.decision}`, { date: e.decided_at ? date(e.decided_at) : '' })}</p>
      ) : e.appeal_at ? (
        <p className="text-[13px] text-fg">{t('performance.appealSent', { date: date(e.appeal_at) })}</p>
      ) : (
        <div className="space-y-2">
          <label className="block text-[12px] font-medium text-fg-secondary" htmlFor="appeal-note">{t('performance.appealLabel')}</label>
          <Textarea id="appeal-note" rows={3} value={note} onChange={(ev) => setNote(ev.target.value)} placeholder={t('performance.appealPlaceholder')} />
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={send} disabled={note.trim().length < 10} loading={busy}>{t('performance.appealSend')}</Button>
            {failed && <span className="text-[12px] text-error-500">{t('performance.appealFailed')}</span>}
          </div>
        </div>
      )}
    </Card>
  );
}
