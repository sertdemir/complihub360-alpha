import { useTranslation } from 'react-i18next';
import { AdminShell } from '../../components/admin/AdminShell';
import { KPICircleCard, type KPIColor } from '../../components/ui/KPICircleCard';
import { KPICard, EntityCard } from '../../components/ui/Cards';
import { MetricCard } from '../../components/ui/MetricCard';
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table';
import { Tag, type TagProps } from '../../components/ui/Tag';
import { FailureNote } from '../../components/ui/FailureNote';
import { useApiData } from '../../lib/useApiData';
import { referenceOf } from '../../api/client';
import { fetchAdminStats, type AdminStats, type AdminWatchFlag } from '../../api/admin';

// ─── Admin · Control Center ──────────────────────────────────────────────────
// Operational overview composed from Compass components: KPICircleCard gauges,
// MetricCard trends, KPICard tiles, watchlist Table, audit stream.
// Light/dark via design tokens. Data via GET /api/v1/admin/stats with a fixture.
//
// 20.10.2026: Bis hierher kamen Funnel, Privacy und Security aus Tabellen, in
// die nichts mehr schreibt — die Seite zeigte Nullen und 0 %, die wie „alles
// im Plan" aussahen. Jetzt Buchungen, echte Grenzuebertritte und Betriebs-
// signale. Was keine Grundlage hat, steht als „—" mit Hinweis, nie als 0 %.

const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString();
const FIXTURE: AdminStats = {
  generatedAt: new Date().toISOString(),
  truncated: [],
  bookings: { today: 3, last7: 14, total: 62, upcoming7: 9, cancelled7: 2, noShows7: 1, disputesOpen: 1, unreported: 2, heldRate: 0.91, disclosureAuditedRate: 1, reminderRate: 0.96 },
  watchlist: [
    { id: 'b7f2c1a0-dispute', provider_key: 'meridian-legal', slot_start: day(-2), flag: 'dispute', msUntil: -2 * 86_400_000 },
    { id: 'c13e9b44-soon', provider_key: 'dahlmann-cpa', slot_start: day(0.2), flag: 'soon', msUntil: 0.2 * 86_400_000 },
    { id: 'a90d77e2-missing', provider_key: 'baltika-tax', slot_start: day(0.5), flag: 'reminder_missing', msUntil: 0.5 * 86_400_000 },
    { id: 'f4482d10-later', provider_key: 'nova-compliance', slot_start: day(3), flag: 'upcoming', msUntil: 3 * 86_400_000 },
  ],
  privacy: { aiRequests7: 38, aiRedacted7: 6, reveals7: 14, evidenceStored: 41, evidenceToReview: 3, customerUploads: null },
  security: { rateLimitPerMinute: 100, accessEvents7: 2, errorEvents7: 4 },
  events: [
    { type: 'scheduling_confirmed', payload: { providerKey: 'dahlmann-cpa' }, created_at: new Date(Date.now() - 2 * 3_600_000).toISOString() },
    { type: 'lead.revealed', payload: { providerKey: 'dahlmann-cpa' }, created_at: new Date(Date.now() - 2 * 3_600_000).toISOString() },
    { type: 'assistant_chat', payload: { redacted: true }, created_at: new Date(Date.now() - 5 * 3_600_000).toISOString() },
    { type: 'api_key_issued', payload: {}, created_at: new Date(Date.now() - 26 * 3_600_000).toISOString() },
  ],
  series: {
    dates: [6, 5, 4, 3, 2, 1, 0].map((n) => { const d = new Date(Date.now() - n * 86_400_000); return `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}`; }),
    bookings: [1, 2, 1, 3, 2, 2, 3], cancelled: [0, 1, 0, 0, 1, 0, 0], noShows: [0, 0, 0, 1, 0, 0, 0],
    aiRequests: [4, 6, 5, 7, 4, 6, 6], aiRedacted: [1, 1, 0, 2, 0, 1, 1], reveals: [1, 2, 1, 3, 2, 2, 3],
  },
};

type Lang = 'de' | 'en';
const STR: Record<Lang, Record<string, string>> = {
  en: {
    subtitle: 'Bookings, privacy boundary crossings and operating signals — live from bookings and the audit log. Admin only.',
    demo: 'demo data', allClear: 'All on track', dispute1: 'open dispute', disputes: 'open disputes', reminderMissing1: 'reminder missing', remindersMissing: 'reminders missing',
    held: 'Appointments held', disclosure: 'Disclosure audited', reminder: 'Reminder sent', noBasis: 'no basis yet',
    bookings: 'Bookings', newToday: 'New today', in7: 'in 7 days', total: 'total', cancelled: 'Cancellations', noShows: 'No-shows', last7: 'last 7 days', unreported: 'not yet reported',
    privacy: 'Privacy & disclosure', ai: 'Sent to AI (sanitized)', withRedaction: 'with redaction', reveals: 'Identity shared with provider',
    evidence: 'Evidence in protected storage', toReview: 'awaiting review', customerUploads: 'Customer document uploads', notLive: 'Not live',
    notLiveNote: 'The upload pipeline for customer documents is not active in the product. Nothing is counted here until it goes live.',
    security: 'Security & audit', rateLimit: 'Rate limit', perMin: 'req/min per IP', access: 'API access events', errors: 'Error events', auditStream: 'Audit stream',
    details: 'More details', justNow: 'updated just now', noneIn7: 'None in the last 7 days',
    watchlist: 'Appointments & open cases', booking: 'Booking', provider: 'Provider', state: 'State', when: 'Appointment',
    flagDispute: 'dispute open', flagReminder: 'reminder missing', flagSoon: 'within 24h', flagUpcoming: 'scheduled', none: 'No upcoming appointments or open cases',
    truncated: 'Not every row could be read ({sources}) — the numbers are a lower bound.', incomplete: 'Read incomplete',
    errorEvent1: 'error event', errorEvents: 'error events', unreportedTag: 'not yet reported',
    loading: 'Loading figures…', failedHeading: 'Figures could not be loaded', failedMessage: 'We show no numbers rather than example numbers. Please reload the page; if it keeps failing, share the reference under “Technical details”.',
  },
  de: {
    subtitle: 'Buchungen, Datenschutz-Grenzübertritte und Betriebssignale — live aus Buchungen und Audit-Log. Nur für Admins.',
    demo: 'Demo-Daten', allClear: 'Alles im Plan', dispute1: 'offener Einspruch', disputes: 'offene Einsprüche', reminderMissing1: 'Erinnerung fehlt', remindersMissing: 'Erinnerungen fehlen',
    held: 'Termine wahrgenommen', disclosure: 'Offenlegung auditiert', reminder: 'Erinnerung versendet', noBasis: 'noch keine Grundlage',
    bookings: 'Buchungen', newToday: 'Heute neu', in7: 'in 7 Tagen', total: 'gesamt', cancelled: 'Stornierungen', noShows: 'No-Shows', last7: 'letzte 7 Tage', unreported: 'noch nicht gemeldet',
    privacy: 'Datenschutz & Offenlegung', ai: 'An die KI (bereinigt)', withRedaction: 'mit Schwärzung', reveals: 'Identität an Anbieter freigegeben',
    evidence: 'Nachweise im geschützten Speicher', toReview: 'zur Prüfung offen', customerUploads: 'Kunden-Uploads', notLive: 'Nicht live',
    notLiveNote: 'Die Upload-Pipeline für Kundendokumente ist im Produkt nicht aktiv. Gezählt wird hier erst, wenn sie live geht.',
    security: 'Sicherheit & Audit', rateLimit: 'Rate-Limit', perMin: 'Anfragen/Min je IP', access: 'API-Zugangs-Ereignisse', errors: 'Fehler-Ereignisse', auditStream: 'Audit-Stream',
    details: 'Weitere Details', justNow: 'gerade aktualisiert', noneIn7: 'Keine in den letzten 7 Tagen',
    watchlist: 'Termine & offene Fälle', booking: 'Buchung', provider: 'Anbieter', state: 'Status', when: 'Termin',
    flagDispute: 'Einspruch offen', flagReminder: 'Erinnerung fehlt', flagSoon: 'in 24 h', flagUpcoming: 'geplant', none: 'Keine anstehenden Termine oder offenen Fälle',
    truncated: 'Nicht alle Zeilen konnten gelesen werden ({sources}) — die Zahlen sind eine Untergrenze.', incomplete: 'Lesung unvollständig',
    errorEvent1: 'Fehler-Ereignis', errorEvents: 'Fehler-Ereignisse', unreportedTag: 'noch nicht gemeldet',
    loading: 'Kennzahlen werden geladen …', failedHeading: 'Kennzahlen konnten nicht geladen werden', failedMessage: 'Wir zeigen lieber keine Zahlen als Beispielzahlen. Bitte lade die Seite neu; bleibt es dabei, nenne die Referenz unter „Technische Details“.'
  },
};

const FLAG: Record<AdminWatchFlag, { tone: TagProps['tone']; key: string }> = {
  dispute: { tone: 'error', key: 'flagDispute' },
  reminder_missing: { tone: 'warning', key: 'flagReminder' },
  soon: { tone: 'info', key: 'flagSoon' },
  upcoming: { tone: 'success', key: 'flagUpcoming' },
};

const kpiColor = (frac: number): KPIColor => (frac >= 0.9 ? 'success' : frac >= 0.7 ? 'warning' : 'error');

function relTime(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  const fmt = (n: number, u: string) => (lang === 'de' ? `vor ${n}${u}` : `${n}${u} ago`);
  if (h < 1) return fmt(Math.max(1, Math.floor(diff / 60_000)), 'm');
  if (h < 24) return fmt(h, 'h');
  return fmt(Math.floor(h / 24), 'd');
}

function untilText(ms: number, lang: Lang): string {
  const h = Math.round(Math.abs(ms) / 3_600_000);
  const unit = h < 48 ? `${h}h` : `${Math.round(h / 24)}d`;
  if (ms < 0) return lang === 'de' ? `vor ${unit}` : `${unit} ago`;
  return `in ${unit}`;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[15px] font-semibold text-fg">{children}</h2>;
}

export function AdminOverviewPage() {
  const { i18n } = useTranslation();
  const { data, source, loading, error } = useApiData(fetchAdminStats, FIXTURE);
  const lang: Lang = i18n.resolvedLanguage === 'de' ? 'de' : 'en';
  const t = (k: string) => STR[lang][k] ?? k;

  const { bookings: b, watchlist, privacy, security, events, series } = data;
  const dates = series.dates;
  const updated = t('justNow');
  // Sieben gemessene Nullen sind keine fehlenden Daten — MetricCard zeigt dann
  // seinen Leerzustand, hier mit dem Satz, der stimmt.
  const card = { xLabels: dates, updated, detailsLabel: t('details'), emptyLabel: t('noneIn7') };
  const missing = watchlist.filter((w) => w.flag === 'reminder_missing').length;
  // „Alles im Plan" nur, wenn wirklich nichts offen ist und alles gelesen wurde.
  const status = b.disputesOpen
    ? { tone: 'error' as const, text: `${b.disputesOpen} ${t(b.disputesOpen === 1 ? 'dispute1' : 'disputes')}` }
    : missing
      ? { tone: 'warning' as const, text: `${missing} ${t(missing === 1 ? 'reminderMissing1' : 'remindersMissing')}` }
      : security.errorEvents7
        ? { tone: 'warning' as const, text: `${security.errorEvents7} ${t(security.errorEvents7 === 1 ? 'errorEvent1' : 'errorEvents')}` }
        : b.unreported
          ? { tone: 'neutral' as const, text: `${b.unreported} ${t('unreportedTag')}` }
          : data.truncated.length
            ? { tone: 'neutral' as const, text: t('incomplete') }
            : { tone: 'success' as const, text: t('allClear') };
  // Beim Laden und nach einem Fehler steht sonst die Fixture da — Beispielzahlen,
  // die wie echte aussehen. Dann lieber keine Zahlen.
  const blocked = source === 'fixture' && (loading || !!error);

  // Eine Quote ohne Grundlage ist kein 0 % — der Ring bleibt grau mit Hinweis.
  const gauges = [
    { label: t('held'), rate: b.heldRate },
    { label: t('disclosure'), rate: b.disclosureAuditedRate },
    { label: t('reminder'), rate: b.reminderRate },
  ];

  return (
    <AdminShell>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-serif text-[32px] font-semibold text-fg">
              <span className="text-fg-accent-emphasis">Control</span> Center
            </h1>
            <p className="mt-1 text-[13px] text-fg-secondary">
              {t('subtitle')}
              {source === 'fixture' && !blocked && <span className="ml-1 text-fg-tertiary">· {t('demo')}</span>}
            </p>
          </div>
          {!blocked && <Tag tone={status.tone}>{status.text}</Tag>}
        </div>

        {blocked ? (
          error
            ? <FailureNote heading={t('failedHeading')} message={t('failedMessage')} reference={referenceOf(error)} className="max-w-2xl" />
            : <p role="status" className="text-[13px] text-fg-tertiary">{t('loading')}</p>
        ) : (<>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {gauges.map((g) => g.rate === null
            ? <KPICircleCard key={g.label} layout="centered" label={g.label} value={0} valueLabel="—" disabled trend={{ value: t('noBasis'), direction: 'neutral' }} />
            : <KPICircleCard key={g.label} layout="centered" color={kpiColor(g.rate)} label={g.label} value={Math.round(g.rate * 100)} animate />)}
        </div>

        <section className="flex flex-col gap-4">
          <SectionHeading>{t('bookings')}</SectionHeading>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            <MetricCard label={t('newToday')} value={String(b.today)} compare={`${b.last7} ${t('in7')} · ${b.total}${data.truncated.includes('scheduling') ? '+' : ''} ${t('total')}`} series={series.bookings} {...card} />
            <MetricCard label={t('cancelled')} value={String(b.cancelled7)} compare={t('last7')} color="#C59E38" series={series.cancelled} {...card} />
            <MetricCard label={t('noShows')} value={String(b.noShows7)} compare={`${b.unreported} ${t('unreported')}`} color="#B55353" series={series.noShows} {...card} />
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeading>{t('privacy')}</SectionHeading>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <MetricCard label={t('ai')} value={String(privacy.aiRequests7)} compare={`${privacy.aiRedacted7} ${t('withRedaction')} · ${t('last7')}`} color="#3C8C7A" series={series.aiRequests} {...card} />
            <MetricCard label={t('reveals')} value={String(privacy.reveals7)} compare={t('last7')} series={series.reveals} {...card} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <KPICard label={t('evidence')} value={<>{privacy.evidenceStored} <span className="text-[13px] font-normal text-fg-tertiary">· {privacy.evidenceToReview} {t('toReview')}</span></>} />
            <KPICard label={t('customerUploads')} value={<span className="text-fg-tertiary">{t('notLive')}</span>} />
          </div>
          <p className="max-w-3xl text-[12px] leading-relaxed text-fg-tertiary">{t('notLiveNote')}</p>
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeading>{t('security')}</SectionHeading>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KPICard label={t('rateLimit')} value={<>{security.rateLimitPerMinute} <span className="text-[13px] font-normal text-fg-tertiary">{t('perMin')}</span></>} />
            <KPICard label={t('access')} value={<>{security.accessEvents7} <span className="text-[13px] font-normal text-fg-tertiary">{t('last7')}</span></>} />
            <KPICard label={t('errors')} value={<>{security.errorEvents7} <span className="text-[13px] font-normal text-fg-tertiary">{t('last7')}</span></>} />
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {events.slice(0, 4).map((e, i) => (
              <EntityCard
                key={i}
                name={e.type.replace(/[_.]/g, ' ').replace(/^./, (c) => c.toUpperCase())}
                meta={e.payload && Object.keys(e.payload).length ? Object.entries(e.payload).slice(0, 2).map(([k, v]) => `${k}: ${String(v)}`).join(' · ') : t('auditStream')}
                trailing={<span className="text-[11px] text-fg-tertiary">{relTime(e.created_at, lang)}</span>}
                unread={i === 0}
              />
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeading>{t('watchlist')}</SectionHeading>
          {/* Mobil: vier Spalten brauchen ~560 px — die Tabelle scrollt im Kasten. */}
          <div className="overflow-x-auto">
            <div className="min-w-[560px]">
            <Table density="default">
              <THead>
                <TR>
                  <TH>{t('booking')}</TH>
                  <TH>{t('provider')}</TH>
                  <TH>{t('state')}</TH>
                  <TH numeric>{t('when')}</TH>
                </TR>
              </THead>
              <TBody>
                {watchlist.map((w) => (
                  <TR key={w.id}>
                    <TD bold>{w.id.slice(0, 8).toUpperCase()}</TD>
                    <TD>{w.provider_key}</TD>
                    <TD><Tag tone={FLAG[w.flag].tone} className="whitespace-nowrap">{t(FLAG[w.flag].key)}</Tag></TD>
                    <TD numeric>{untilText(w.msUntil, lang)}</TD>
                  </TR>
                ))}
                {watchlist.length === 0 && <TR><TD bold>—</TD><TD>{t('none')}</TD><TD>—</TD><TD numeric>—</TD></TR>}
              </TBody>
            </Table>
            </div>
          </div>
          {data.truncated.length > 0 && <p className="text-[12px] text-fg-tertiary">{t('truncated').replace('{sources}', data.truncated.join(', '))}</p>}
        </section>
        </>)}
      </div>
    </AdminShell>
  );
}
