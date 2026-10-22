import { useTranslation } from 'react-i18next';
import { AdminShell } from '../../components/admin/AdminShell';
import { KPICircleCard, type KPIColor } from '../../components/ui/KPICircleCard';
import { KPICard, EntityCard } from '../../components/ui/Cards';
import { MetricCard } from '../../components/ui/MetricCard';
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table';
import { Tag, type TagProps } from '../../components/ui/Tag';
import { Banner } from '../../components/ui/Banner';
import { FailureNote } from '../../components/ui/FailureNote';
import { useApiData } from '../../lib/useApiData';
import { referenceOf } from '../../api/client';
import { fetchCockpit, type Cockpit, type AttentionReason, type Amounts } from '../../api/cockpit';

// ─── Admin · Founder Cockpit ─────────────────────────────────────────────────
// Five lenses across the live systems, composed from Compass components:
// KPICircleCard hero gauges + KPICard tiles + MetricCard trends + Table + stream.
// Light/dark comes from the design tokens (global theme, AdminShell header).
// Data via GET /api/v1/admin/cockpit with a design fixture fallback.
//
// 22.10.2026: Produkt, Kundenstimme und SLA kamen aus dem alten Anfragemodell
// (tot seit 01.09.), der MRR aus angenommenen 12 $ je Assistant-Abo. Jetzt
// Buchungen, Tarife aus dem Katalog, Lead-Gebuehren, Bewertungen und der
// Lebenszyklus der Anbieter. Was keine Grundlage hat oder nicht gelesen werden
// konnte, steht als „—" — nie als 0 (wie im Control Center).

const ago = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const FIXTURE: Cockpit = {
  generatedAt: new Date().toISOString(),
  watchersShadow: true,
  unavailable: [],
  truncated: [],
  platformHealth: { api: 'up', db: 'reachable', errorEvents7: 2, latestEventAt: ago(0.2) },
  product: { bookingsToday: 3, bookings7: 14, bookingsTotal: 62, heldRate: 0.91, sessionsActive: 48, sessions7: 21 },
  money: {
    baseCurrency: 'USD', mrr: { USD: 61200 }, unpriced: 0, subscriptions: { active: 9, pastDue: 1 },
    invoices: { open: 3, paid: 17, failed: 1, overdue: 1, openAmounts: { USD: 24700 }, paidAmounts: { USD: 98400, EUR: 34200 } },
    leadFees7: { charges: 11, collected: { USD: 41500 }, pending: 2, failed: 0 }, credits7: { USD: 1200 }, assistantActive: 4,
  },
  voice: { reviews: { count: 23, avgRating: 4.6, fromUsers: 15, fromProviders: 8 }, userCancellations7: 2, disputesOpen: 1 },
  trust: {
    providers: { live: 10, onboarding: 4, paused: 1, suspended: 0, reverification: 1, ended: 0 },
    providerNoShows30: 1, incidents30: 1, enforcementOpen: 0, appealsPending: 0, attentionTotal: 4,
    attention: [
      { provider_key: 'meridian-legal', reason: 'past_due', since: null },
      { provider_key: 'baltika-tax', reason: 'incident', since: ago(52) },
      { provider_key: 'nova-compliance', reason: 'billing_blocked', since: null },
      { provider_key: 'lex-partners', reason: 'reverification_due', since: ago(-96) },
    ],
  },
  rates: { heldRate: 0.91, invoicesPaid: 0.81, billingReady: 0.9, subscriptionsCurrent: 0.9 },
  events: [
    { type: 'scheduling_confirmed', payload: { providerKey: 'dahlmann-cpa' }, created_at: ago(2) },
    { type: 'provider_lead_charged', payload: { providerKey: 'dahlmann-cpa', band: 2 }, created_at: ago(2) },
    { type: 'invoice_issued', payload: {}, created_at: ago(20) },
    { type: 'review_submitted', payload: {}, created_at: ago(26) },
  ],
  series: {
    dates: [6, 5, 4, 3, 2, 1, 0].map((n) => { const d = new Date(Date.now() - n * 86_400_000); return `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}`; }),
    bookings: [1, 2, 1, 3, 2, 2, 3], sessions: [2, 4, 3, 3, 2, 4, 3], leadFeeCents: [4000, 7500, 2500, 9900, 5000, 4100, 8500],
  },
};

type Lang = 'de' | 'en';
const STR: Record<Lang, Record<string, string>> = {
  en: {
    subtitle: 'Five lenses across the live systems — platform, product, money, customer voice and trust.',
    demo: 'demo data', updated: 'updated', shadow: 'Watchers · shadow', live: 'Watchers · live',
    held: 'Appointments held', invoicesPaid: 'Invoices paid', billingReady: 'Ready to bill', subsCurrent: 'Plans paid up', noBasis: 'no basis yet',
    money: 'Money', mrr: 'MRR', mrrNote: 'from the plan catalogue', active: 'active', pastDue: 'past due', unpriced: 'without catalogue price',
    invoicesOpen: 'Open invoices', overdue: 'overdue', paid: 'Paid', invoices: 'invoices', leadFees: 'Lead fees', leads: 'leads', pending: 'pending',
    leadFeeTrend: 'Lead fees per day', credits: 'Credits issued', assistant: 'Assistant subscriptions active', last7: 'last 7 days',
    product: 'Product', bookingsToday: 'Bookings today', in7: 'in 7 days', total: 'total', sessions: 'New wizard sessions', sessionsActive: 'active',
    trust: 'Trust', providersLive: 'Providers live', onboarding: 'in onboarding', paused: 'paused', suspended: 'suspended',
    providerNoShows: 'Provider no-shows', incidents: 'Incidents', enforcement: 'Open measures', last30: 'last 30 days',
    attention: 'Providers needing attention', provider: 'Provider', reason: 'Reason', since: 'Since', noAttention: 'No provider needs attention',
    rsuspended: 'suspended', renforcement: 'measure open', rpast_due: 'payment overdue', rincident: 'incident', rbilling_blocked: 'billing blocked', rreverification_due: 'reverification due',
    voice: 'Customer voice & operations', reviews: 'Reviews', avg: 'Ø', fromUsers: 'from users', fromProviders: 'from providers',
    userCancellations: 'Cancelled by users', disputes: 'Open disputes', errors: 'Error events', latest: 'latest event', none: 'None in the last 7 days',
    details: 'More details', justNow: 'updated just now',
    appeals: 'appeals pending', more: '+{n} more', attentionIncomplete: 'Could not be fully checked — a source is missing (see above).',
    unavailableTitle: 'Not every source could be read', unavailableBody: 'Figures from these sources show “—”: {sources}.',
    truncated: 'Not every row could be read ({sources}) — the numbers are a lower bound.',
    loading: 'Loading figures…', failedHeading: 'Figures could not be loaded', failedMessage: 'We show no numbers rather than example numbers. Please reload the page; if it keeps failing, share the reference under “Technical details”.',
  },
  de: {
    subtitle: 'Fünf Blickwinkel auf die Live-Systeme — Plattform, Produkt, Umsatz, Kundenstimme und Vertrauen.',
    demo: 'Demo-Daten', updated: 'aktualisiert', shadow: 'Wächter · Shadow', live: 'Wächter · live',
    held: 'Termine wahrgenommen', invoicesPaid: 'Rechnungen bezahlt', billingReady: 'Abrechnungsbereit', subsCurrent: 'Tarife ohne Rückstand', noBasis: 'noch keine Grundlage',
    money: 'Umsatz', mrr: 'MRR', mrrNote: 'aus dem Tarifkatalog', active: 'aktiv', pastDue: 'im Rückstand', unpriced: 'ohne Katalogpreis',
    invoicesOpen: 'Offene Rechnungen', overdue: 'überfällig', paid: 'Bezahlt', invoices: 'Rechnungen', leadFees: 'Lead-Gebühren', leads: 'Leads', pending: 'offen',
    leadFeeTrend: 'Lead-Gebühren je Tag', credits: 'Guthaben ausgegeben', assistant: 'Assistant-Abos aktiv', last7: 'letzte 7 Tage',
    product: 'Produkt', bookingsToday: 'Buchungen heute', in7: 'in 7 Tagen', total: 'gesamt', sessions: 'Neue Wizard-Sessions', sessionsActive: 'aktiv',
    trust: 'Vertrauen', providersLive: 'Anbieter live', onboarding: 'im Onboarding', paused: 'pausiert', suspended: 'gesperrt',
    providerNoShows: 'No-Shows von Anbietern', incidents: 'Vorfälle', enforcement: 'Offene Maßnahmen', last30: 'letzte 30 Tage',
    attention: 'Anbieter mit Handlungsbedarf', provider: 'Anbieter', reason: 'Grund', since: 'Seit', noAttention: 'Kein Anbieter mit Handlungsbedarf',
    rsuspended: 'gesperrt', renforcement: 'Maßnahme offen', rpast_due: 'Zahlung überfällig', rincident: 'Vorfall', rbilling_blocked: 'Abrechnung blockiert', rreverification_due: 'Reverifizierung fällig',
    voice: 'Kundenstimme & Betrieb', reviews: 'Bewertungen', avg: 'Ø', fromUsers: 'von Nutzern', fromProviders: 'von Anbietern',
    userCancellations: 'Von Nutzern storniert', disputes: 'Offene Einsprüche', errors: 'Fehler-Ereignisse', latest: 'letztes Ereignis', none: 'Keine in den letzten 7 Tagen',
    details: 'Weitere Details', justNow: 'gerade aktualisiert',
    appeals: 'Einsprüche offen', more: '+{n} weitere', attentionIncomplete: 'Nicht vollständig prüfbar — eine Quelle fehlt (siehe oben).',
    unavailableTitle: 'Nicht alle Quellen konnten gelesen werden', unavailableBody: 'Zahlen aus diesen Quellen stehen als „—“: {sources}.',
    truncated: 'Nicht alle Zeilen konnten gelesen werden ({sources}) — die Zahlen sind eine Untergrenze.',
    loading: 'Kennzahlen werden geladen …', failedHeading: 'Kennzahlen konnten nicht geladen werden', failedMessage: 'Wir zeigen lieber keine Zahlen als Beispielzahlen. Bitte lade die Seite neu; bleibt es dabei, nenne die Referenz unter „Technische Details“.',
  },
};

const REASON_TONE: Record<AttentionReason, TagProps['tone']> = {
  suspended: 'error', enforcement: 'error', past_due: 'warning', incident: 'warning', billing_blocked: 'warning', reverification_due: 'info',
};

const money = (cents: number, currency: string, lang: Lang): string =>
  (cents / 100).toLocaleString(lang === 'de' ? 'de-DE' : 'en-US', { style: 'currency', currency, maximumFractionDigits: 0 });
/** Betraege je Waehrung nebeneinander — nie ueber Waehrungen summiert. Leer: 0 in der Katalogwaehrung. */
const amounts = (a: Amounts, base: string, lang: Lang): string => {
  const entries = Object.entries(a).filter(([, c]) => c !== 0);
  return entries.length ? entries.map(([cur, c]) => money(c, cur, lang)).join(' · ') : money(0, base, lang);
};
const kpiColor = (frac: number): KPIColor => (frac >= 0.9 ? 'success' : frac >= 0.7 ? 'warning' : 'error');
/** Ein Wert, der fehlen kann — „—" statt 0. */
const n = (v: number | null | undefined): string => (v === null || v === undefined ? '—' : String(v));
const dash = <T,>(v: T | null, f: (v: T) => string): string => (v === null ? '—' : f(v));

function relTime(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(Math.abs(diff) / 3_600_000);
  const unit = h < 1 ? `${Math.max(1, Math.floor(Math.abs(diff) / 60_000))}m` : h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`;
  if (diff < 0) return `in ${unit}`;
  return lang === 'de' ? `vor ${unit}` : `${unit} ago`;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[15px] font-semibold text-fg">{children}</h2>;
}

export function CockpitPage() {
  const { i18n } = useTranslation();
  const { data, source, loading, error } = useApiData(fetchCockpit, FIXTURE);
  const lang: Lang = i18n.resolvedLanguage === 'de' ? 'de' : 'en';
  const t = (k: string) => STR[lang][k] ?? k;

  const { product: pr, money: mo, voice: vo, trust: tr, rates, series } = data;
  // Beim Laden und nach einem Fehler steht sonst die Fixture da — Beispielzahlen,
  // die wie echte aussehen. Dann lieber keine Zahlen.
  const blocked = source === 'fixture' && (loading || !!error);
  const card = { xLabels: series.dates, updated: t('justNow'), detailsLabel: t('details'), emptyLabel: t('none') };
  const fmt = (a: Amounts) => amounts(a, mo.baseCurrency, lang);

  const gauges = [
    { label: t('held'), rate: rates.heldRate },
    { label: t('invoicesPaid'), rate: rates.invoicesPaid },
    { label: t('billingReady'), rate: rates.billingReady },
    { label: t('subsCurrent'), rate: rates.subscriptionsCurrent },
  ];

  return (
    <AdminShell>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-serif text-[32px] font-semibold text-fg">
              <span className="text-fg-accent-emphasis">Founder</span> Cockpit
            </h1>
            <p className="mt-1 text-[13px] text-fg-secondary">
              {t('subtitle')}
              {source === 'fixture' && !blocked && <span className="ml-1 text-fg-tertiary">· {t('demo')}</span>}
              {!blocked && <span className="ml-1 text-fg-tertiary">· {t('updated')} {relTime(data.generatedAt, lang)}</span>}
            </p>
          </div>
          {!blocked && <Tag tone={data.watchersShadow ? 'warning' : 'success'}>{data.watchersShadow ? t('shadow') : t('live')}</Tag>}
        </div>

        {blocked ? (
          error
            ? <FailureNote heading={t('failedHeading')} message={t('failedMessage')} reference={referenceOf(error)} className="max-w-2xl" />
            : <p role="status" className="text-[13px] text-fg-tertiary">{t('loading')}</p>
        ) : (<>
        {data.unavailable.length > 0 && (
          <Banner status="warning" title={t('unavailableTitle')}>
            {t('unavailableBody').replace('{sources}', data.unavailable.join(', '))}
          </Banner>
        )}

        <div className="grid grid-cols-2 gap-4 sm:gap-5 xl:grid-cols-4">
          {gauges.map((g) => g.rate === null
            ? <KPICircleCard key={g.label} layout="centered" label={g.label} value={0} valueLabel="—" disabled trend={{ value: t('noBasis'), direction: 'neutral' }} />
            : <KPICircleCard key={g.label} layout="centered" color={kpiColor(g.rate)} label={g.label} value={Math.round(g.rate * 100)} animate />)}
        </div>

        <section className="flex flex-col gap-4">
          <SectionHeading>{t('money')}</SectionHeading>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KPICard
              label={t('mrr')}
              value={dash(mo.mrr, fmt)}
              trend={{ value: mo.subscriptions ? `${mo.subscriptions.active} ${t('active')} · ${mo.subscriptions.pastDue} ${t('pastDue')}${mo.unpriced ? ` · ${mo.unpriced} ${t('unpriced')}` : ''}` : t('mrrNote'), direction: mo.subscriptions?.pastDue || mo.unpriced ? 'down' : 'neutral' }}
            />
            <KPICard
              label={t('invoicesOpen')}
              value={dash(mo.invoices, (i) => String(i.open))}
              trend={mo.invoices ? { value: `${fmt(mo.invoices.openAmounts)}${mo.invoices.overdue ? ` · ${mo.invoices.overdue} ${t('overdue')}` : ''}`, direction: mo.invoices.overdue ? 'down' : 'neutral' } : undefined}
            />
            <KPICard
              label={t('paid')}
              value={dash(mo.invoices, (i) => fmt(i.paidAmounts))}
              trend={mo.invoices ? { value: `${mo.invoices.paid} ${t('invoices')}`, direction: 'neutral' } : undefined}
            />
            <KPICard
              label={`${t('leadFees')} · ${t('last7')}`}
              value={dash(mo.leadFees7, (l) => fmt(l.collected))}
              trend={mo.leadFees7 ? { value: `${mo.leadFees7.charges} ${t('leads')}${mo.leadFees7.pending ? ` · ${mo.leadFees7.pending} ${t('pending')}` : ''}`, direction: mo.leadFees7.failed ? 'down' : 'neutral' } : undefined}
            />
          </div>
          {/* Die Tagesreihe gibt es nur bei genau einer Waehrung (series.leadFeeCents sonst null). */}
          <MetricCard label={t('leadFeeTrend')} value={dash(mo.leadFees7, (l) => fmt(l.collected))} compare={t('last7')} color="#C59E38" series={series.leadFeeCents ? series.leadFeeCents.map((c) => Math.round(c / 100)) : undefined} {...card} />
          <p className="text-[12px] text-fg-tertiary">
            {t('credits')} · {t('last7')}: {dash(mo.credits7, fmt)} · {t('assistant')}: {n(mo.assistantActive)}
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeading>{t('product')}</SectionHeading>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <MetricCard label={t('bookingsToday')} value={n(pr.bookingsToday)} compare={`${n(pr.bookings7)} ${t('in7')} · ${n(pr.bookingsTotal)}${data.truncated.includes('scheduling') ? '+' : ''} ${t('total')}`} series={pr.bookings7 === null ? undefined : series.bookings} {...card} />
            <MetricCard label={t('sessions')} value={n(pr.sessions7)} compare={`${n(pr.sessionsActive)} ${t('sessionsActive')} · ${t('last7')}`} color="#3C8C7A" series={pr.sessions7 === null ? undefined : series.sessions} {...card} />
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeading>{t('trust')}</SectionHeading>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KPICard
              label={t('providersLive')}
              value={dash(tr.providers, (p) => String(p.live))}
              trend={tr.providers ? { value: `${tr.providers.onboarding} ${t('onboarding')} · ${tr.providers.paused} ${t('paused')} · ${tr.providers.suspended} ${t('suspended')}`, direction: tr.providers.suspended ? 'down' : 'neutral' } : undefined}
            />
            <KPICard label={t('providerNoShows')} value={n(tr.providerNoShows30)} trend={{ value: t('last30'), direction: tr.providerNoShows30 ? 'down' : 'neutral' }} />
            <KPICard label={t('incidents')} value={n(tr.incidents30)} trend={{ value: t('last30'), direction: tr.incidents30 ? 'down' : 'neutral' }} />
            <KPICard label={t('enforcement')} value={n(tr.enforcementOpen)} trend={tr.appealsPending ? { value: `${tr.appealsPending} ${t('appeals')}`, direction: 'neutral' } : undefined} />
          </div>
          {/* Mobil: drei Spalten brauchen ~480 px — die Tabelle scrollt im Kasten. */}
          <div className="overflow-x-auto">
            <div className="min-w-[480px]">
            <p className="mb-3 text-[12px] text-fg-tertiary">{t('attention')}</p>
            <Table density="default">
              <THead>
                <TR>
                  <TH>{t('provider')}</TH>
                  <TH>{t('reason')}</TH>
                  <TH numeric>{t('since')}</TH>
                </TR>
              </THead>
              <TBody>
                {(tr.attention ?? []).map((a) => (
                  <TR key={`${a.provider_key}-${a.reason}`}>
                    <TD bold>{a.provider_key}</TD>
                    <TD><Tag tone={REASON_TONE[a.reason]} className="whitespace-nowrap">{t(`r${a.reason}`)}</Tag></TD>
                    <TD numeric>{relTime(a.since, lang)}</TD>
                  </TR>
                ))}
                {tr.attention === null && <TR><TD bold>—</TD><TD>{t('attentionIncomplete')}</TD><TD numeric>—</TD></TR>}
                {tr.attention?.length === 0 && <TR><TD bold>—</TD><TD>{t('noAttention')}</TD><TD numeric>—</TD></TR>}
              </TBody>
            </Table>
            {tr.attention && tr.attentionTotal > tr.attention.length && (
              <p className="mt-2 text-[12px] text-fg-tertiary">{t('more').replace('{n}', String(tr.attentionTotal - tr.attention.length))}</p>
            )}
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeading>{t('voice')}</SectionHeading>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KPICard
              label={t('reviews')}
              value={dash(vo.reviews, (r) => String(r.count))}
              trend={vo.reviews ? { value: `${t('avg')} ${vo.reviews.avgRating ?? '—'} · ${vo.reviews.fromUsers} ${t('fromUsers')} · ${vo.reviews.fromProviders} ${t('fromProviders')}`, direction: 'neutral' } : undefined}
            />
            <KPICard label={t('userCancellations')} value={n(vo.userCancellations7)} trend={{ value: t('last7'), direction: 'neutral' }} />
            <KPICard label={t('disputes')} value={n(vo.disputesOpen)} />
            <KPICard label={t('errors')} value={n(data.platformHealth.errorEvents7)} trend={{ value: `${t('latest')} ${relTime(data.platformHealth.latestEventAt, lang)}`, direction: data.platformHealth.errorEvents7 ? 'down' : 'neutral' }} />
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {data.events.slice(0, 4).map((e, i) => (
              <EntityCard
                key={i}
                name={e.type.replace(/[_.]/g, ' ').replace(/^./, (c) => c.toUpperCase())}
                meta={Object.keys(e.payload).length ? Object.entries(e.payload).slice(0, 2).map(([k, v]) => `${k}: ${String(v)}`).join(' · ') : 'event'}
                trailing={<span className="text-[11px] text-fg-tertiary">{relTime(e.created_at, lang)}</span>}
                unread={i === 0}
              />
            ))}
          </div>
          {data.truncated.length > 0 && <p className="text-[12px] text-fg-tertiary">{t('truncated').replace('{sources}', data.truncated.join(', '))}</p>}
        </section>
        </>)}
      </div>
    </AdminShell>
  );
}
