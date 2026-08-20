import { useTranslation } from 'react-i18next';
import { AdminShell } from '../../components/admin/AdminShell';
import { KPICircleCard, type KPIColor } from '../../components/ui/KPICircleCard';
import { KPICard, EntityCard } from '../../components/ui/Cards';
import { MetricCard } from '../../components/ui/MetricCard';
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table';
import { Tag, type TagProps } from '../../components/ui/Tag';
import { Banner } from '../../components/ui/Banner';
import { useApiData } from '../../lib/useApiData';
import { fetchAdminStats, type AdminStats } from '../../api/admin';

// ─── Admin · Control Center ──────────────────────────────────────────────────
// Operational overview composed from Compass components: KPICircleCard gauges
// (funnel + privacy + SLA), KPICard tiles, SLA watchlist Table, audit stream.
// Light/dark via design tokens. Data via GET /api/v1/admin/stats with a fixture.

const FIXTURE: AdminStats = {
  stats: { requestsToday: 12, requestsTotal: 87, confirmRate: 0.92, replyRate: 0.81, avgConfirmMs: 6.2 * 3_600_000, breaches: 1 },
  watchlist: [
    { id: 'RQ-313C', provider_key: 'dahlmann-cpa', country: 'DE', category: 'vat', status: 'created', msLeft: 4 * 3_600_000 + 2 * 60_000 },
    { id: 'RQ-778E', provider_key: 'dahlmann-cpa', country: 'NL', category: 'vat_oss', status: 'created', msLeft: 18.7 * 3_600_000 },
    { id: 'RQ-9F21', provider_key: 'meridian-legal', country: 'FR', category: 'corporate', status: 'created', msLeft: -1 * 3_600_000 },
    { id: 'RQ-4A07', provider_key: 'baltika-tax', country: 'DE', category: 'vat', status: 'confirmed', msLeft: 31 * 3_600_000 },
    { id: 'RQ-2C55', provider_key: 'nova-compliance', country: 'ES', category: 'privacy', status: 'confirmed', msLeft: 44 * 3_600_000 },
  ],
  privacy: { uploads: 24, piiRedacted: 61, consentRate: 0.78, aiBlocks: 5 },
  security: { invalidTokenBlocks: 3, aiGateBlocks: 5 },
  events: [
    { type: 'primary_request_submitted', payload: { provider: 'dahlmann-cpa' }, created_at: new Date(Date.now() - 2 * 3_600_000).toISOString() },
    { type: 'provider_confirmed_via_magic_link', payload: {}, created_at: new Date(Date.now() - 5 * 3_600_000).toISOString() },
    { type: 'document_uploaded', payload: {}, created_at: new Date(Date.now() - 8 * 3_600_000).toISOString() },
    { type: 'document_ai_blocked', payload: { reason: 'NO_CONSENT' }, created_at: new Date(Date.now() - 26 * 3_600_000).toISOString() },
  ],
};

type Lang = 'de' | 'en';
const STR: Record<Lang, Record<string, string>> = {
  en: {
    subtitle: 'Platform health, funnel and compliance signals — aggregated live from the audit log. Admin only.',
    demo: 'demo data', allClear: 'All on track', breaches: 'SLA breaches',
    confirmRate: 'Confirm rate', replyRate: 'Reply rate', consentRate: 'AI consent', slaOnTrack: 'SLA on-track',
    funnel: 'Funnel', newToday: 'New today', total: 'total', avgConfirm: 'Ø confirm', breachesLabel: 'SLA breaches', seeWatchlist: 'see watchlist',
    privacy: 'Privacy & AI Gate', uploads: 'Document uploads', pii: 'PII redacted', consent: 'AI consent rate', aiBlocks: 'AI gate blocks', sanitized: 'all sanitized', explicit: 'explicit opt-in',
    prevPeriod: 'vs. previous period', details: 'More details', justNow: 'updated just now', last7: 'last 7 days',
    security: 'Security & Audit', tokenBlocks: 'Blocked magic-links', gateBlocks: 'AI gate denials', rateLimit: 'Rate limiting', rateOn: '100 req/min · on', auditStream: 'Audit stream',
    watchlist: 'SLA watchlist', request: 'Request', providerScope: 'Provider · Scope', state: 'State', timeLeft: 'Time left',
    onTrack: 'on track', atRisk: 'at risk', breached: 'breached', awaitingReply: 'awaiting reply', overdue: 'overdue', noOpen: 'No open requests',
  },
  de: {
    subtitle: 'Plattform-Gesundheit, Funnel und Compliance-Signale — live aus dem Audit-Log. Nur für Admins.',
    demo: 'Demo-Daten', allClear: 'Alles im Plan', breaches: 'SLA-Verletzungen',
    confirmRate: 'Bestätigungsrate', replyRate: 'Antwortrate', consentRate: 'KI-Einwilligung', slaOnTrack: 'SLA im Plan',
    funnel: 'Funnel', newToday: 'Heute neu', total: 'gesamt', avgConfirm: 'Ø Bestätigung', breachesLabel: 'SLA-Verletzungen', seeWatchlist: 'siehe Watchlist',
    privacy: 'Privacy & AI Gate', uploads: 'Dokument-Uploads', pii: 'PII geschwärzt', consent: 'KI-Einwilligungsrate', aiBlocks: 'AI-Gate-Blocks', sanitized: 'alle bereinigt', explicit: 'explizites Opt-in',
    prevPeriod: 'vs. vorheriger Zeitraum', details: 'Weitere Details', justNow: 'gerade aktualisiert', last7: 'letzte 7 Tage',
    security: 'Security & Audit', tokenBlocks: 'Blockierte Magic-Links', gateBlocks: 'AI-Gate-Ablehnungen', rateLimit: 'Rate-Limiting', rateOn: '100 req/min · aktiv', auditStream: 'Audit-Stream',
    watchlist: 'SLA-Watchlist', request: 'Anfrage', providerScope: 'Anbieter · Bereich', state: 'Status', timeLeft: 'Restzeit',
    onTrack: 'im Plan', atRisk: 'gefährdet', breached: 'verletzt', awaitingReply: 'wartet auf Antwort', overdue: 'überfällig', noOpen: 'Keine offenen Anfragen',
  },
};

const SIX_H = 6 * 3_600_000;
const pct = (v: number | null): number => (v === null ? 0 : Math.round(v * 100));
const kpiColor = (frac: number): KPIColor => (frac >= 0.6 ? 'success' : frac >= 0.4 ? 'warning' : 'error');

// Demo 7-day series for the metric charts. Shown only with the design fixture;
// live data has no per-day series yet (the /admin/stats read-model returns point
// values), so live cards render the honest "no data" state until the backend
// aggregates event_log by day.
const DATES = ['10.07', '11.07', '12.07', '13.07', '14.07', '15.07', '16.07'];
const DEMO = {
  requests: [3, 5, 4, 8, 6, 9, 12],
  confirm: [88, 90, 89, 93, 91, 92, 92],
  avg: [7.1, 6.8, 6.5, 6.4, 6.3, 6.2, 6.2],
  breaches: [0, 1, 0, 2, 1, 1, 1],
  uploads: [10, 14, 12, 18, 20, 22, 24],
  pii: [30, 38, 42, 50, 55, 58, 61],
  consent: [70, 72, 74, 75, 76, 77, 78],
  aiBlocks: [2, 3, 2, 4, 3, 5, 5],
};

function relTime(iso: string | undefined, lang: Lang): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  const fmt = (n: number, u: string) => (lang === 'de' ? `vor ${n}${u}` : `${n}${u} ago`);
  if (h < 1) return fmt(Math.max(1, Math.floor(diff / 60_000)), 'm');
  if (h < 24) return fmt(h, 'h');
  return fmt(Math.floor(h / 24), 'd');
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[15px] font-semibold text-fg">{children}</h2>;
}

export function AdminOverviewPage() {
  const { i18n } = useTranslation();
  const { data, source } = useApiData(fetchAdminStats, FIXTURE);
  const lang: Lang = i18n.resolvedLanguage === 'de' ? 'de' : 'en';
  const t = (k: string) => STR[lang][k] ?? k;

  const { stats, watchlist, privacy, security, events } = data;
  const breachedCount = watchlist.filter((w) => w.msLeft !== null && w.msLeft < 0).length;
  const slaOnTrack = watchlist.length ? 1 - breachedCount / watchlist.length : 1;
  const avgConfirmH = stats.avgConfirmMs ? `${(stats.avgConfirmMs / 3_600_000).toFixed(1)}h` : '—';
  const demo = source === 'fixture' ? DEMO : undefined;
  const live = data.series;
  const dates = live?.dates ?? DATES;
  const updated = t('justNow');

  const gauges: Array<{ label: string; value: number; color: KPIColor }> = [
    { label: t('confirmRate'), value: pct(stats.confirmRate), color: kpiColor(stats.confirmRate ?? 0) },
    { label: t('replyRate'), value: pct(stats.replyRate), color: kpiColor(stats.replyRate ?? 0) },
    { label: t('consentRate'), value: pct(privacy.consentRate), color: kpiColor(privacy.consentRate ?? 0) },
    { label: t('slaOnTrack'), value: Math.round(slaOnTrack * 100), color: kpiColor(slaOnTrack) },
  ];

  return (
    <AdminShell>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-[32px] font-semibold text-fg">
              <span className="text-fg-accent-emphasis">Control</span> Center
            </h1>
            <p className="mt-1 text-[13px] text-fg-secondary">
              {t('subtitle')}
              {source === 'fixture' && <span className="ml-1 text-fg-tertiary">· {t('demo')}</span>}
            </p>
          </div>
          <Tag tone={breachedCount ? 'error' : 'success'}>{breachedCount ? `${breachedCount} ${t('breaches')}` : t('allClear')}</Tag>
        </div>

        <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
          {gauges.map((g) => (
            <KPICircleCard key={g.label} layout="centered" color={g.color} label={g.label} value={g.value} animate />
          ))}
        </div>

        <section className="flex flex-col gap-4">
          <SectionHeading>{t('funnel')}</SectionHeading>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            <MetricCard label={t('newToday')} value={String(stats.requestsToday)} compare={`${stats.requestsTotal} ${t('total')}`} series={live?.requests ?? demo?.requests} xLabels={dates} updated={updated} detailsLabel={t('details')} />
            <MetricCard label={t('confirmRate')} value={`${pct(stats.confirmRate)}%`} compare={t('prevPeriod')} color="#3C8C7A" series={live?.confirmRate ?? demo?.confirm} xLabels={dates} updated={updated} detailsLabel={t('details')} />
            <MetricCard label={t('avgConfirm')} value={avgConfirmH} compare={t('last7')} series={demo?.avg} xLabels={dates} updated={updated} detailsLabel={t('details')} />
            <MetricCard label={t('breachesLabel')} value={String(stats.breaches)} compare={t('seeWatchlist')} color="#B55353" series={live?.breaches ?? demo?.breaches} xLabels={dates} updated={updated} detailsLabel={t('details')} />
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeading>{t('privacy')}</SectionHeading>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            <MetricCard label={t('uploads')} value={String(privacy.uploads)} compare={t('sanitized')} series={live?.uploads ?? demo?.uploads} xLabels={dates} updated={updated} detailsLabel={t('details')} />
            <MetricCard label={t('pii')} value={String(privacy.piiRedacted)} compare="email · phone · IBAN" color="#3C8C7A" series={live?.pii ?? demo?.pii} xLabels={dates} updated={updated} detailsLabel={t('details')} />
            <MetricCard label={t('consent')} value={`${pct(privacy.consentRate)}%`} compare={t('explicit')} series={live?.consent ?? demo?.consent} xLabels={dates} updated={updated} detailsLabel={t('details')} />
            <MetricCard label={t('aiBlocks')} value={String(privacy.aiBlocks)} compare={t('prevPeriod')} color="#C59E38" series={live?.aiBlocks ?? demo?.aiBlocks} xLabels={dates} updated={updated} detailsLabel={t('details')} />
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeading>{t('security')}</SectionHeading>
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="grid grid-cols-3 gap-4">
              <KPICard label={t('tokenBlocks')} value={String(security.invalidTokenBlocks)} />
              <KPICard label={t('gateBlocks')} value={String(security.aiGateBlocks)} />
              <KPICard label={t('rateLimit')} value={t('rateOn')} />
            </div>
            <div className="flex flex-col gap-3">
              {events.slice(0, 4).map((e, i) => (
                <EntityCard
                  key={i}
                  name={e.type.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())}
                  meta={e.payload && Object.keys(e.payload).length ? Object.entries(e.payload).slice(0, 2).map(([k, v]) => `${k}: ${String(v)}`).join(' · ') : t('auditStream')}
                  trailing={<span className="text-[11px] text-fg-tertiary">{relTime(e.created_at, lang)}</span>}
                  unread={i === 0}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeading>{t('watchlist')}</SectionHeading>
          <Table density="default">
            <THead>
              <TR>
                <TH>{t('request')}</TH>
                <TH>{t('providerScope')}</TH>
                <TH>{t('state')}</TH>
                <TH numeric>{t('timeLeft')}</TH>
              </TR>
            </THead>
            <TBody>
              {watchlist.map((w) => {
                const ms = w.msLeft;
                const overdue = ms !== null && ms < 0;
                const soon = ms !== null && ms >= 0 && ms < SIX_H;
                const tone: TagProps['tone'] = w.status === 'confirmed' ? 'warning' : overdue || soon ? 'error' : 'success';
                const stateLabel = w.status === 'confirmed' ? t('awaitingReply') : overdue ? t('breached') : soon ? t('atRisk') : t('onTrack');
                const timeText = ms === null ? '—' : overdue ? t('overdue') : `in ${Math.round(ms / 3_600_000)}h`;
                return (
                  <TR key={w.id}>
                    <TD bold>{w.id.slice(0, 8).toUpperCase()}</TD>
                    <TD>{w.provider_key} · {w.country} {w.category}</TD>
                    <TD><Tag tone={tone}>{stateLabel}</Tag></TD>
                    <TD numeric>{timeText}</TD>
                  </TR>
                );
              })}
              {watchlist.length === 0 && <TR><TD bold>—</TD><TD>{t('noOpen')}</TD><TD>—</TD><TD numeric>—</TD></TR>}
            </TBody>
          </Table>
        </section>
      </div>
    </AdminShell>
  );
}
