import { useTranslation } from 'react-i18next';
import { ProviderShell } from '../../components/provider/ProviderShell';
import { LoadFailedState } from '../../components/provider/WorkspaceStates';
import { useWorkspaceData } from '../../lib/useWorkspaceData';
import { fetchMetrics, RATE_THRESHOLD, pct, dur, type Metrics } from '../../api/metrics';
import { fetchApplication } from '../../api/application';

// ─── Provider /performance ────────────────────────────────────────────────────
// TKT-PROV-12, Canvas-Wahl C3 (09.10.2026); Figma: Screens-Datei, Seite
// „Partner ohne Fixtures", 3628:931.
//
// Was es schon gibt, steht als Zahl: „Anfragen bisher". Quoten erscheinen erst
// ab RATE_THRESHOLD Anfragen — eine verpasste Frist bei zwei Anfragen waeren
// sonst „50 % SLA ueberschritten". Bis TKT-PROV-12 standen hier eine erfundene
// Bestaetigungsquote (87 %), ein erfundener Rang („#3"), Ranking-Bewegungen
// und eine Qualitaetsliste mit 4,7/5 — fuer jeden Anbieter dieselben.

/** KPI-Codes sind kanonische Kennungen und bleiben unuebersetzt. */
const RATES: Array<{ code: string; value: (m: Metrics) => string; noteKey?: string }> = [
  { code: 'CONFIRM_RATE', value: (m) => pct(m.confirm_rate), noteKey: 'performance.kpiConfirmRateNote' },
  { code: 'REPLY_RATE', value: (m) => pct(m.reply_rate), noteKey: 'performance.kpiReplyRateNote' },
  { code: 'AVG_CONFIRM_TIME', value: (m) => dur(m.avg_confirm_ms) },
  { code: 'AVG_REPLY_TIME', value: (m) => dur(m.avg_reply_ms) },
  { code: 'SLA_BREACH_RATE', value: (m) => pct(m.sla_breach_rate) },
];

export function PerformancePage() {
  const { t, i18n } = useTranslation('providerws');
  const locale = i18n.resolvedLanguage || 'en';
  const { data, state, error, reload } = useWorkspaceData(fetchMetrics);
  // „seit Freigabe am …" — ohne Datum steht die Zeile ohne Unterzeile.
  const app = useWorkspaceData(fetchApplication);
  const since = app.data?.provider.lifecycle_status === 'active' ? app.data.provider.lifecycle_status_since : null;
  const sinceLabel = since
    ? t('common:states.partner.performance.sinceApproval', {
        date: new Date(since).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }),
      })
    : null;

  return (
    <ProviderShell>
      <div className="mx-auto max-w-[1140px] space-y-6">
        <h1 className="font-serif text-[30px] font-bold leading-tight text-fg">{t('performance.title')}</h1>

        {state === 'loading' && <div aria-busy="true" className="h-40 animate-pulse rounded-xl bg-surface-secondary/60 motion-reduce:animate-none" />}
        {state === 'error' && <LoadFailedState surface="performance" error={error} onRetry={reload} section />}
        {data && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <Kpi label={t('common:states.partner.performance.requestsSoFar')} value={String(data.total)} note={sinceLabel} />
              {RATES.map((r) => data.total >= RATE_THRESHOLD
                ? <Kpi key={r.code} label={r.code} value={r.value(data)} note={r.noteKey ? t(r.noteKey) : null} />
                : <Kpi key={r.code} label={r.code} value="—" note={t('common:states.partner.performance.belowThreshold')} pending />)}
            </div>
            {data.total < RATE_THRESHOLD && (
              <p className="max-w-3xl text-body-sm leading-relaxed text-fg-secondary">{t('common:states.partner.performance.thresholdNote')}</p>
            )}
          </>
        )}
      </div>
    </ProviderShell>
  );
}

function Kpi({ label, value, note, pending = false }: { label: string; value: string; note: string | null; pending?: boolean }) {
  return (
    <div
      data-kpi={label}
      data-pending={pending}
      className={'space-y-1.5 rounded-xl border px-[18px] py-4 '
        + (pending ? 'border-dashed border-stroke bg-surface-secondary/60' : 'border-stroke bg-surface')}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">{label}</p>
      <p className={'font-serif text-[26px] font-bold leading-tight tabular-nums ' + (pending ? 'text-fg-tertiary' : 'text-fg')}>{value}</p>
      {note && <p className="text-[12px] text-fg-tertiary">{note}</p>}
    </div>
  );
}
