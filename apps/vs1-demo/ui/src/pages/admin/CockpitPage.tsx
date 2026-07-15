import { useTranslation } from 'react-i18next';
import { AdminShell } from '../../components/admin/AdminShell';
import { RadialGauge } from '../../components/ui/RadialGauge';
import { useApiData } from '../../lib/useApiData';
import { useTheme } from '../../lib/theme';
import { fetchCockpit, type Cockpit } from '../../api/cockpit';
import { palette, pct, eur, relTime, toneColor, OpsSurface, OpsHeader, Card, Lens, Stat, Pill, type Lang } from '../../components/admin/opsSurface';

// ─── Admin · Founder Cockpit ─────────────────────────────────────────────────
// Live command-center: five lenses with animated ring gauges + count-up values.
// Theme + language come from the global engine (AdminShell header controls).
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
      { id: 'rq-9d13', provider_key: 'mueller-cpa', country: 'DE', category: 'Marketing & SEO', status: 'delivered', deadline: new Date(Date.now() + 18e6).toISOString(), hoursLeft: 5 },
    ],
  },
  events: [
    { type: 'sla_breach', at: new Date(Date.now() - 3e6).toISOString(), payload: { stage: 'confirm' } },
    { type: 'sla_reminder_sent', at: new Date(Date.now() - 9e5).toISOString(), payload: { auto: true } },
    { type: 'invoice_issued', at: new Date(Date.now() - 12e5).toISOString(), payload: { total_cents: 9200 } },
    { type: 'engagement_expired', at: new Date(Date.now() - 15e5).toISOString(), payload: {} },
    { type: 'provider_downgraded', at: new Date(Date.now() - 2e6).toISOString(), payload: { provider_key: 'acme-x' } },
  ],
};

const STR: Record<Lang, Record<string, string>> = {
  en: {
    subtitle: 'Five lenses across the live systems — platform, product, money, customer voice and the trust loop.',
    demo: 'demo data', updated: 'updated', shadow: 'Watchers · shadow', live: 'Watchers · live',
    confirmRate: 'Confirm rate', replyRate: 'Reply rate', slaOnTrack: 'SLA on-track', paidRatio: 'Invoices paid', providersActive: 'Providers active',
    money: 'Money', invoicesOpen: 'Open invoices', paid: 'Paid', subsActive: 'Subscriptions', mrr: 'MRR · est.', overdue: 'overdue', trialing: 'trialing', pastDue: 'past due',
    engagement: 'Product & Engagement', newToday: 'New today', total: 'total', activeSessions: 'Active sessions',
    sla: 'SLA & Trust', breachedNow: 'Breached now', breachEvents: 'breach events', downgrades: 'downgrades', expiries: 'expiries', reminders: 'auto-reminders',
    atRiskTitle: 'At-risk watchlist', request: 'Request', providerScope: 'Provider · Scope', state: 'State', deadline: 'Deadline',
    onTrack: 'on track', atRisk: 'at risk', breached: 'breached', awaitingReply: 'awaiting reply', noRisk: 'Nothing at risk',
    voc: 'Voice of Customer', vocNote: 'No dedicated feedback source yet — proxy signals from the engagement lifecycle.',
    declined: 'Declined', withdrawn: 'Withdrawn', remindersSent: 'Reminders sent', feed: 'Activity',
  },
  de: {
    subtitle: 'Fünf Lenses über die Live-Systeme — Plattform, Produkt, Umsatz, Kundenstimme und die Vertrauensschleife.',
    demo: 'Demo-Daten', updated: 'aktualisiert', shadow: 'Wächter · Shadow', live: 'Wächter · live',
    confirmRate: 'Bestätigungsrate', replyRate: 'Antwortrate', slaOnTrack: 'SLA im Plan', paidRatio: 'Rechnungen bezahlt', providersActive: 'Anbieter aktiv',
    money: 'Umsatz', invoicesOpen: 'Offene Rechnungen', paid: 'Bezahlt', subsActive: 'Abos', mrr: 'MRR · geschätzt', overdue: 'überfällig', trialing: 'Testphase', pastDue: 'überfällig',
    engagement: 'Produkt & Engagement', newToday: 'Heute neu', total: 'gesamt', activeSessions: 'Aktive Sessions',
    sla: 'SLA & Trust', breachedNow: 'Akut verletzt', breachEvents: 'Breach-Events', downgrades: 'Downgrades', expiries: 'Abläufe', reminders: 'Auto-Reminder',
    atRiskTitle: 'At-Risk-Watchlist', request: 'Anfrage', providerScope: 'Anbieter · Bereich', state: 'Status', deadline: 'Frist',
    onTrack: 'im Plan', atRisk: 'gefährdet', breached: 'verletzt', awaitingReply: 'wartet auf Antwort', noRisk: 'Nichts gefährdet',
    voc: 'Voice of Customer', vocNote: 'Noch keine dedizierte Feedback-Quelle — Proxy-Signale aus dem Engagement-Lifecycle.',
    declined: 'Abgelehnt', withdrawn: 'Zurückgezogen', remindersSent: 'Reminder gesendet', feed: 'Aktivität',
  },
};

export function CockpitPage() {
  const { i18n } = useTranslation();
  const { theme } = useTheme();
  const { data, source } = useApiData(fetchCockpit, FIXTURE);

  const lang: Lang = i18n.resolvedLanguage === 'de' ? 'de' : 'en';
  const t = (k: string) => STR[lang][k] ?? k;
  const pal = palette(theme);

  const { productEngagement: pe, money: mo, voiceOfCustomer: vo, slaTrust: sl } = data;
  const confirm = pe.confirmRate ?? 0;
  const reply = pe.replyRate ?? 0;
  const slaHealth = sl.atRisk.length ? 1 - sl.breachedNow / sl.atRisk.length : 1;
  const paidRatio = mo.invoices.paid + mo.invoices.open ? mo.invoices.paid / (mo.invoices.paid + mo.invoices.open) : 0;
  const provTotal = sl.providers.active + sl.providers.downgraded + sl.providers.inactive;
  const provActive = provTotal ? sl.providers.active / provTotal : 0;

  const gauges = [
    { value: confirm, percent: pct(pe.confirmRate), label: t('confirmRate'), color: toneColor(confirm, pal) },
    { value: reply, percent: pct(pe.replyRate), label: t('replyRate'), color: toneColor(reply, pal) },
    { value: slaHealth, percent: Math.round(slaHealth * 100), label: t('slaOnTrack'), color: toneColor(slaHealth, pal) },
    { value: paidRatio, percent: Math.round(paidRatio * 100), label: t('paidRatio'), color: pal.petrol },
    { value: provActive, percent: Math.round(provActive * 100), label: t('providersActive'), color: toneColor(provActive, pal) },
  ];

  return (
    <AdminShell>
      <OpsSurface pal={pal}>
        <OpsHeader
          pal={pal}
          accent="Founder"
          title="Cockpit"
          subtitle={<>
            {t('subtitle')}
            {source === 'fixture' && <span style={{ color: pal.faint }}> · {t('demo')}</span>}
            <span style={{ color: pal.faint }}> · {t('updated')} {relTime(data.generatedAt, lang)}</span>
          </>}
          right={<Pill pal={pal} tone={data.watchersShadow ? pal.amber : pal.green}>{data.watchersShadow ? t('shadow') : t('live')}</Pill>}
        />

        <Card pal={pal} style={{ padding: '40px 28px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 28, justifyItems: 'center' }}>
            {gauges.map((g) => (
              <RadialGauge key={g.label} value={g.value} percent={g.percent} label={g.label} color={g.color} ink={pal.ink} muted={pal.muted} track={pal.track} size={152} />
            ))}
          </div>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20 }}>
          <Lens pal={pal} title={t('money')}>
            <Stat pal={pal} label={t('invoicesOpen')} value={mo.invoices.open} sub={`${eur(mo.invoices.openCents)}${mo.invoices.overdue ? ` · ${mo.invoices.overdue} ${t('overdue')}` : ''}`} subTone={mo.invoices.overdue ? pal.red : pal.muted} />
            <Stat pal={pal} label={t('paid')} valueText={eur(mo.invoices.paidCents)} sub={`${mo.invoices.paid} ×`} />
            <Stat pal={pal} label={t('subsActive')} value={mo.subscriptions.active} sub={mo.subscriptions.past_due ? `${mo.subscriptions.past_due} ${t('pastDue')}` : `${mo.subscriptions.trialing} ${t('trialing')}`} subTone={mo.subscriptions.past_due ? pal.red : pal.muted} />
            <Stat pal={pal} label={t('mrr')} valueText={eur(mo.mrrEstimateCents)} />
          </Lens>

          <Lens pal={pal} title={t('engagement')}>
            <Stat pal={pal} label={t('newToday')} value={pe.engagementsToday} sub={`${pe.engagementsTotal} ${t('total')}`} />
            <Stat pal={pal} label={t('confirmRate')} valueText={`${pct(pe.confirmRate)}%`} />
            <Stat pal={pal} label={t('replyRate')} valueText={`${pct(pe.replyRate)}%`} />
            <Stat pal={pal} label={t('activeSessions')} value={pe.sessionsActive} />
          </Lens>

          <Lens pal={pal} title={t('sla')}>
            <Stat pal={pal} label={t('breachedNow')} value={sl.breachedNow} valueTone={sl.breachedNow ? pal.red : pal.green} sub={`${sl.breachEvents} ${t('breachEvents')}`} />
            <Stat pal={pal} label={t('downgrades')} value={sl.downgrades} valueTone={sl.downgrades ? pal.red : pal.muted} />
            <Stat pal={pal} label={t('expiries')} value={sl.expiries} />
            <Stat pal={pal} label={t('reminders')} value={sl.autoReminders} />
          </Lens>

          <Lens pal={pal} title={t('voc')}>
            <Stat pal={pal} label={t('declined')} value={vo.signals.declined} />
            <Stat pal={pal} label={t('withdrawn')} value={vo.signals.withdrawn} />
            <Stat pal={pal} label={t('remindersSent')} value={vo.signals.remindersSent} />
            <p style={{ fontSize: 11, color: pal.faint, lineHeight: 1.45, margin: '10px 0 0' }}>{t('vocNote')}</p>
          </Lens>
        </div>

        <Lens pal={pal} title={t('atRiskTitle')}>
          <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 130px 110px', fontSize: 11, textTransform: 'uppercase', letterSpacing: .5, color: pal.faint, fontWeight: 600, padding: '0 0 14px' }}>
            <span>{t('request')}</span><span>{t('providerScope')}</span><span>{t('state')}</span><span style={{ textAlign: 'right' }}>{t('deadline')}</span>
          </div>
          {sl.atRisk.map((w) => {
            const overdue = (w.hoursLeft ?? 1) < 0;
            const soon = (w.hoursLeft ?? 99) >= 0 && (w.hoursLeft ?? 99) <= 4;
            const stateLabel = w.status === 'confirmed' ? t('awaitingReply') : overdue ? t('breached') : soon ? t('atRisk') : t('onTrack');
            const stateColor = w.status === 'confirmed' ? pal.amber : overdue || soon ? pal.red : pal.green;
            const dl = w.hoursLeft === null ? '—' : overdue ? `${w.hoursLeft}h · ${t('breached')}` : `in ${w.hoursLeft}h`;
            return (
              <div key={w.id} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 130px 110px', alignItems: 'center', fontSize: 13, padding: '13px 0', borderTop: `1px solid ${pal.line}` }}>
                <span style={{ fontWeight: 600 }}>{w.id.slice(0, 8).toUpperCase()}</span>
                <span style={{ color: pal.muted }}>{w.provider_key} · {w.country} {w.category}</span>
                <span><span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20, color: stateColor, border: `1px solid ${stateColor}55` }}>{stateLabel}</span></span>
                <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: overdue ? pal.red : pal.ink }}>{dl}</span>
              </div>
            );
          })}
          {sl.atRisk.length === 0 && <div style={{ padding: '12px 0', color: pal.faint, fontSize: 13, borderTop: `1px solid ${pal.line}` }}>{t('noRisk')}</div>}
        </Lens>

        <Lens pal={pal} title={t('feed')}>
          {data.events.slice(0, 6).map((e, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderTop: i ? `1px solid ${pal.line}` : 'none', fontSize: 13 }}>
              <span>{e.type.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())}</span>
              <span style={{ color: pal.faint, fontVariantNumeric: 'tabular-nums' }}>{relTime(e.at, lang)}</span>
            </div>
          ))}
        </Lens>
      </OpsSurface>
    </AdminShell>
  );
}
