import { useTranslation } from 'react-i18next';
import { AdminShell } from '../../components/admin/AdminShell';
import { KPICircleCard, type KPIColor } from '../../components/ui/KPICircleCard';
import { KPICard, EntityCard } from '../../components/ui/Cards';
import { MetricCard } from '../../components/ui/MetricCard';
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table';
import { Tag, type TagProps } from '../../components/ui/Tag';
import { Banner } from '../../components/ui/Banner';
import { useApiData } from '../../lib/useApiData';
import { fetchCockpit, type Cockpit } from '../../api/cockpit';

// ─── Admin · Founder Cockpit ─────────────────────────────────────────────────
// Five lenses across the live systems, composed from Compass components:
// KPICircleCard hero gauges + KPICard tiles + Table watchlist + audit stream.
// Light/dark comes from the design tokens (global theme, AdminShell header).
// Data via GET /api/v1/admin/cockpit with a design fixture fallback.

const FIXTURE: Cockpit = {
  generatedAt: new Date().toISOString(),
  watchersShadow: true,
  platformHealth: { api: 'up', db: 'reachable', sources: { engagements: true, events: true, invoices: true, subscriptions: true, providers: true, sessions: true }, recentErrorEvents: 2, latestEventAt: new Date(Date.now() - 6e5).toISOString() },
  productEngagement: { engagementsTotal: 47, engagementsToday: 5, confirmRate: 0.68, replyRate: 0.72, sessionsActive: 12 },
  money: { currency: 'EUR', invoices: { open: 6, paid: 9, failed: 0, void: 1, overdue: 2, openCents: 55200, paidCents: 82800 }, subscriptions: { active: 14, trialing: 3, past_due: 1, canceled: 2, inactive: 0 }, mrrEstimateCents: 20400 },
  voiceOfCustomer: { note: '—', signals: { declined: 4, withdrawn: 2, remindersSent: 11 } },
  slaTrust: {
    breachedNow: 2, breachEvents: 5, autoReminders: 11, expiries: 3, downgrades: 1,
    providers: { active: 18, downgraded: 1, inactive: 4, totalBreachCount: 7 },
    atRisk: [
      { id: 'rq-8f2a', provider_key: 'mueller-cpa', country: 'DE', category: 'Tax & VAT', status: 'delivered', deadline: new Date(Date.now() - 3e6).toISOString(), hoursLeft: -1 },
      { id: 'rq-1b77', provider_key: 'dahlmann-cpa', country: 'AT', category: 'Data & Privacy', status: 'viewed', deadline: new Date(Date.now() - 6e5).toISOString(), hoursLeft: 0 },
      { id: 'rq-44c0', provider_key: 'lex-partners', country: 'ES', category: 'Corporate', status: 'confirmed', deadline: new Date(Date.now() + 72e5).toISOString(), hoursLeft: 2 },
      { id: 'rq-9d13', provider_key: 'mueller-cpa', country: 'DE', category: 'Marketing Compliance', status: 'delivered', deadline: new Date(Date.now() + 18e6).toISOString(), hoursLeft: 5 },
    ],
  },
  events: [
    { type: 'sla_breach', at: new Date(Date.now() - 3e6).toISOString(), payload: { stage: 'confirm' } },
    { type: 'sla_reminder_sent', at: new Date(Date.now() - 9e5).toISOString(), payload: { auto: true } },
    { type: 'invoice_issued', at: new Date(Date.now() - 12e5).toISOString(), payload: { total_cents: 9200 } },
    { type: 'engagement_expired', at: new Date(Date.now() - 15e5).toISOString(), payload: {} },
    { type: 'provider_downgraded', at: new Date(Date.now() - 2e6).toISOString(), payload: { provider_key: 'acme-x' } },
  ],
  series: {
    dates: ['10.07', '11.07', '12.07', '13.07', '14.07', '15.07', '16.07'],
    requests: [3, 5, 4, 8, 6, 9, 12],
    confirmRate: [58, 62, 60, 66, 64, 67, 68],
    breaches: [0, 1, 0, 2, 1, 1, 2],
  },
};

type Lang = 'de' | 'en';
const STR: Record<Lang, Record<string, string>> = {
  en: {
    subtitle: 'Five lenses across the live systems — platform, product, money, customer voice and the trust loop.',
    demo: 'demo data', updated: 'updated', shadow: 'Watchers · shadow', live: 'Watchers · live',
    confirmRate: 'Confirm rate', replyRate: 'Reply rate', slaOnTrack: 'SLA on-track', paidRatio: 'Invoices paid', providersActive: 'Providers active',
    money: 'Money', invoicesOpen: 'Open invoices', paid: 'Paid', subsActive: 'Subscriptions', mrr: 'MRR · est.', overdue: 'overdue', trialing: 'trialing', pastDue: 'past due', invoices: 'invoices',
    engagement: 'Product & Engagement', newToday: 'New today', total: 'total', activeSessions: 'Active sessions', wizardSessions: 'wizard sessions', ofConfirmed: 'of confirmed',
    sla: 'SLA & Trust', breachedNow: 'Breached now', breachEvents: 'breach events', downgrades: 'Downgrades', expiries: 'Expiries', reminders: 'Auto-reminders',
    atRiskTitle: 'At-risk watchlist', request: 'Request', providerScope: 'Provider · Scope', timeLeft: 'Time left', state: 'State',
    onTrack: 'on track', atRisk: 'at risk', breached: 'breached', awaitingReply: 'awaiting reply', noRisk: 'Nothing at risk',
    voc: 'Voice of Customer', vocNote: 'No dedicated feedback source yet — proxy signals from the engagement lifecycle.',
    declined: 'Declined', withdrawn: 'Withdrawn', remindersSent: 'Reminders sent', feed: 'Activity',
    prevPeriod: 'vs. previous period', details: 'More details', justNow: 'updated just now',
    breachBannerTitle: 'past SLA right now', breachBannerBody: 'The watchers flagged overdue confirmations — review the at-risk list. Escalation to downgrade fires automatically at threshold.',
  },
  de: {
    subtitle: 'Fünf Lenses über die Live-Systeme — Plattform, Produkt, Umsatz, Kundenstimme und die Vertrauensschleife.',
    demo: 'Demo-Daten', updated: 'aktualisiert', shadow: 'Wächter · Shadow', live: 'Wächter · live',
    confirmRate: 'Bestätigungsrate', replyRate: 'Antwortrate', slaOnTrack: 'SLA im Plan', paidRatio: 'Rechnungen bezahlt', providersActive: 'Anbieter aktiv',
    money: 'Umsatz', invoicesOpen: 'Offene Rechnungen', paid: 'Bezahlt', subsActive: 'Abos', mrr: 'MRR · geschätzt', overdue: 'überfällig', trialing: 'Testphase', pastDue: 'überfällig', invoices: 'Rechnungen',
    engagement: 'Produkt & Engagement', newToday: 'Heute neu', total: 'gesamt', activeSessions: 'Aktive Sessions', wizardSessions: 'Wizard-Sessions', ofConfirmed: 'der Bestätigten',
    sla: 'SLA & Trust', breachedNow: 'Akut verletzt', breachEvents: 'Breach-Events', downgrades: 'Downgrades', expiries: 'Abläufe', reminders: 'Auto-Reminder',
    atRiskTitle: 'At-Risk-Watchlist', request: 'Anfrage', providerScope: 'Anbieter · Bereich', timeLeft: 'Restzeit', state: 'Status',
    onTrack: 'im Plan', atRisk: 'gefährdet', breached: 'verletzt', awaitingReply: 'wartet auf Antwort', noRisk: 'Nichts gefährdet',
    voc: 'Voice of Customer', vocNote: 'Noch keine dedizierte Feedback-Quelle — Proxy-Signale aus dem Engagement-Lifecycle.',
    declined: 'Abgelehnt', withdrawn: 'Zurückgezogen', remindersSent: 'Reminder gesendet', feed: 'Aktivität',
    prevPeriod: 'vs. vorheriger Zeitraum', details: 'Weitere Details', justNow: 'gerade aktualisiert',
    breachBannerTitle: 'akut über SLA', breachBannerBody: 'Die Wächter melden überfällige Bestätigungen — prüfe die At-Risk-Liste. Eskalation zum Downgrade feuert ab Schwelle automatisch.',
  },
};

const pct = (v: number | null): number => (v === null ? 0 : Math.round(v * 100));
const eur = (cents: number): string => (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const kpiColor = (frac: number): KPIColor => (frac >= 0.6 ? 'success' : frac >= 0.4 ? 'warning' : 'error');

function relTime(iso: string | null | undefined, lang: Lang): string {
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

export function CockpitPage() {
  const { i18n } = useTranslation();
  const { data, source } = useApiData(fetchCockpit, FIXTURE);
  const lang: Lang = i18n.resolvedLanguage === 'de' ? 'de' : 'en';
  const t = (k: string) => STR[lang][k] ?? k;

  const { productEngagement: pe, money: mo, voiceOfCustomer: vo, slaTrust: sl } = data;
  const confirm = pe.confirmRate ?? 0;
  const reply = pe.replyRate ?? 0;
  const slaHealth = sl.atRisk.length ? 1 - sl.breachedNow / sl.atRisk.length : 1;
  const paidRatio = mo.invoices.paid + mo.invoices.open ? mo.invoices.paid / (mo.invoices.paid + mo.invoices.open) : 0;
  const provTotal = sl.providers.active + sl.providers.downgraded + sl.providers.inactive;
  const provActive = provTotal ? sl.providers.active / provTotal : 0;

  const gauges: Array<{ label: string; value: number; color: KPIColor }> = [
    { label: t('confirmRate'), value: pct(pe.confirmRate), color: kpiColor(confirm) },
    { label: t('replyRate'), value: pct(pe.replyRate), color: kpiColor(reply) },
    { label: t('slaOnTrack'), value: Math.round(slaHealth * 100), color: kpiColor(slaHealth) },
    { label: t('paidRatio'), value: Math.round(paidRatio * 100), color: 'brand' },
    { label: t('providersActive'), value: Math.round(provActive * 100), color: kpiColor(provActive) },
  ];

  return (
    <AdminShell>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-[32px] font-semibold text-fg">
              <span className="text-fg-accent-emphasis">Founder</span> Cockpit
            </h1>
            <p className="mt-1 text-[13px] text-fg-secondary">
              {t('subtitle')}
              {source === 'fixture' && <span className="ml-1 text-fg-tertiary">· {t('demo')}</span>}
              <span className="ml-1 text-fg-tertiary">· {t('updated')} {relTime(data.generatedAt, lang)}</span>
            </p>
          </div>
          <Tag tone={data.watchersShadow ? 'warning' : 'success'}>{data.watchersShadow ? t('shadow') : t('live')}</Tag>
        </div>

        {sl.breachedNow > 0 && (
          <Banner status="error" title={`${sl.breachedNow} ${lang === 'de' ? 'Engagements' : 'engagements'} ${t('breachBannerTitle')}`}>
            {t('breachBannerBody')}
          </Banner>
        )}

        <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-5">
          {gauges.map((g) => (
            <KPICircleCard key={g.label} layout="centered" color={g.color} label={g.label} value={g.value} animate />
          ))}
        </div>

        <section className="flex flex-col gap-4">
          <SectionHeading>{t('money')}</SectionHeading>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <KPICard label={t('invoicesOpen')} value={String(mo.invoices.open)} trend={{ value: `${eur(mo.invoices.openCents)}${mo.invoices.overdue ? ` · ${mo.invoices.overdue} ${t('overdue')}` : ''}`, direction: mo.invoices.overdue ? 'down' : 'neutral' }} />
            <KPICard label={t('paid')} value={eur(mo.invoices.paidCents)} trend={{ value: `${mo.invoices.paid} ${t('invoices')}`, direction: 'up' }} />
            <KPICard label={t('subsActive')} value={String(mo.subscriptions.active)} trend={{ value: mo.subscriptions.past_due ? `${mo.subscriptions.past_due} ${t('pastDue')}` : `${mo.subscriptions.trialing} ${t('trialing')}`, direction: mo.subscriptions.past_due ? 'down' : 'neutral' }} />
            <KPICard label={t('mrr')} value={eur(mo.mrrEstimateCents)} trend={{ value: 'plan est.', direction: 'neutral' }} />
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeading>{t('engagement')}</SectionHeading>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <MetricCard label={t('newToday')} value={String(pe.engagementsToday)} compare={`${pe.engagementsTotal} ${t('total')}`} series={data.series.requests} xLabels={data.series.dates} updated={t('justNow')} detailsLabel={t('details')} />
            <MetricCard label={t('confirmRate')} value={`${pct(pe.confirmRate)}%`} compare={t('prevPeriod')} color="#3C8C7A" series={data.series.confirmRate} xLabels={data.series.dates} updated={t('justNow')} detailsLabel={t('details')} />
          </div>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <KPICard label={t('replyRate')} value={`${pct(pe.replyRate)}%`} trend={{ value: t('ofConfirmed'), direction: 'neutral' }} />
            <KPICard label={t('activeSessions')} value={String(pe.sessionsActive)} trend={{ value: t('wizardSessions'), direction: 'neutral' }} />
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeading>{t('sla')}</SectionHeading>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <KPICard label={t('breachedNow')} value={String(sl.breachedNow)} trend={{ value: `${sl.breachEvents} ${t('breachEvents')}`, direction: sl.breachedNow ? 'down' : 'neutral' }} />
            <KPICard label={t('downgrades')} value={String(sl.downgrades)} trend={{ value: `${sl.providers.downgraded} providers`, direction: sl.downgrades ? 'down' : 'neutral' }} />
            <KPICard label={t('expiries')} value={String(sl.expiries)} />
            <KPICard label={t('reminders')} value={String(sl.autoReminders)} trend={{ value: 'sent', direction: 'neutral' }} />
          </div>
          <div>
            <p className="mb-3 text-[12px] text-fg-tertiary">{t('atRiskTitle')} · escalation at 24h/48h</p>
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
                {sl.atRisk.map((w) => {
                  const overdue = (w.hoursLeft ?? 1) < 0;
                  const soon = (w.hoursLeft ?? 99) >= 0 && (w.hoursLeft ?? 99) <= 4;
                  const tone: TagProps['tone'] = w.status === 'confirmed' ? 'warning' : overdue || soon ? 'error' : 'success';
                  const stateLabel = w.status === 'confirmed' ? t('awaitingReply') : overdue ? t('breached') : soon ? t('atRisk') : t('onTrack');
                  const timeText = w.hoursLeft === null ? '—' : overdue ? `${w.hoursLeft}h · ${t('breached')}` : `in ${w.hoursLeft}h`;
                  return (
                    <TR key={w.id}>
                      <TD bold>{w.id.slice(0, 8).toUpperCase()}</TD>
                      <TD>{w.provider_key} · {w.country} {w.category}</TD>
                      <TD><Tag tone={tone}>{stateLabel}</Tag></TD>
                      <TD numeric>{timeText}</TD>
                    </TR>
                  );
                })}
                {sl.atRisk.length === 0 && <TR><TD bold>—</TD><TD>{t('noRisk')}</TD><TD>—</TD><TD numeric>—</TD></TR>}
              </TBody>
            </Table>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeading>{t('voc')} &amp; {t('feed')}</SectionHeading>
          <p className="-mt-2 text-[12px] text-fg-tertiary">{t('vocNote')}</p>
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="grid grid-cols-3 gap-4">
              <KPICard label={t('declined')} value={String(vo.signals.declined)} />
              <KPICard label={t('withdrawn')} value={String(vo.signals.withdrawn)} />
              <KPICard label={t('remindersSent')} value={String(vo.signals.remindersSent)} />
            </div>
            <div className="flex flex-col gap-3">
              {data.events.slice(0, 5).map((e, i) => (
                <EntityCard
                  key={i}
                  name={e.type.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())}
                  meta={e.payload && Object.keys(e.payload).length ? Object.entries(e.payload).slice(0, 2).map(([k, v]) => `${k}: ${String(v)}`).join(' · ') : 'event'}
                  trailing={<span className="text-[11px] text-fg-tertiary">{relTime(e.at, lang)}</span>}
                  unread={i === 0}
                />
              ))}
            </div>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
