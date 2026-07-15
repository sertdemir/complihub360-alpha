import { useTranslation } from 'react-i18next';
import { AdminShell } from '../../components/admin/AdminShell';
import { RadialGauge } from '../../components/ui/RadialGauge';
import { useApiData } from '../../lib/useApiData';
import { useTheme } from '../../lib/theme';
import { fetchAdminStats, type AdminStats } from '../../api/admin';
import { palette, pct, relTime, toneColor, OpsSurface, OpsHeader, Card, Lens, Stat, Pill, type Lang } from '../../components/admin/opsSurface';

// ─── Admin · Control Center ──────────────────────────────────────────────────
// The operational overview: funnel + privacy + security gauges, an SLA watchlist
// and the live audit stream — same animated, themeable surface as the Founder
// Cockpit. Data via GET /api/v1/admin/stats with a design fixture fallback.

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

const STR: Record<Lang, Record<string, string>> = {
  en: {
    subtitle: 'Platform health, funnel and compliance signals — aggregated live from the audit log. Admin only.',
    demo: 'demo data', allClear: 'All on track', breaches: 'SLA breaches',
    confirmRate: 'Confirm rate', replyRate: 'Reply rate', consentRate: 'AI consent', slaOnTrack: 'SLA on-track',
    funnel: 'Funnel', newToday: 'New today', total: 'total', avgConfirm: 'Ø confirm', breachesLabel: 'SLA breaches',
    privacy: 'Privacy & AI Gate', uploads: 'Document uploads', pii: 'PII redacted', consent: 'AI consent rate', aiBlocks: 'AI gate blocks',
    security: 'Security & Audit', tokenBlocks: 'Blocked magic-links', gateBlocks: 'AI gate denials', rateLimit: 'Rate limiting', rateOn: '100 req/min · on',
    watchlist: 'SLA watchlist', request: 'Request', providerScope: 'Provider · Scope', state: 'State', timeLeft: 'Time left',
    onTrack: 'on track', atRisk: 'at risk', breached: 'breached', awaitingReply: 'awaiting reply', overdue: 'overdue', noOpen: 'No open requests',
    feed: 'Audit stream',
  },
  de: {
    subtitle: 'Plattform-Gesundheit, Funnel und Compliance-Signale — live aus dem Audit-Log. Nur für Admins.',
    demo: 'Demo-Daten', allClear: 'Alles im Plan', breaches: 'SLA-Verletzungen',
    confirmRate: 'Bestätigungsrate', replyRate: 'Antwortrate', consentRate: 'KI-Einwilligung', slaOnTrack: 'SLA im Plan',
    funnel: 'Funnel', newToday: 'Heute neu', total: 'gesamt', avgConfirm: 'Ø Bestätigung', breachesLabel: 'SLA-Verletzungen',
    privacy: 'Privacy & AI Gate', uploads: 'Dokument-Uploads', pii: 'PII geschwärzt', consent: 'KI-Einwilligungsrate', aiBlocks: 'AI-Gate-Blocks',
    security: 'Security & Audit', tokenBlocks: 'Blockierte Magic-Links', gateBlocks: 'AI-Gate-Ablehnungen', rateLimit: 'Rate-Limiting', rateOn: '100 req/min · aktiv',
    watchlist: 'SLA-Watchlist', request: 'Anfrage', providerScope: 'Anbieter · Bereich', state: 'Status', timeLeft: 'Restzeit',
    onTrack: 'im Plan', atRisk: 'gefährdet', breached: 'verletzt', awaitingReply: 'wartet auf Antwort', overdue: 'überfällig', noOpen: 'Keine offenen Anfragen',
    feed: 'Audit-Stream',
  },
};

const SIX_H = 6 * 3_600_000;

export function AdminOverviewPage() {
  const { i18n } = useTranslation();
  const { theme } = useTheme();
  const { data, source } = useApiData(fetchAdminStats, FIXTURE);

  const lang: Lang = i18n.resolvedLanguage === 'de' ? 'de' : 'en';
  const t = (k: string) => STR[lang][k] ?? k;
  const pal = palette(theme);

  const { stats, watchlist, privacy, security, events } = data;
  const breachedCount = watchlist.filter((w) => w.msLeft !== null && w.msLeft < 0).length;
  const slaOnTrack = watchlist.length ? 1 - breachedCount / watchlist.length : 1;
  const avgConfirmH = stats.avgConfirmMs ? `${(stats.avgConfirmMs / 3_600_000).toFixed(1)}h` : '—';

  const gauges = [
    { value: stats.confirmRate ?? 0, percent: pct(stats.confirmRate), label: t('confirmRate'), color: toneColor(stats.confirmRate ?? 0, pal) },
    { value: stats.replyRate ?? 0, percent: pct(stats.replyRate), label: t('replyRate'), color: toneColor(stats.replyRate ?? 0, pal) },
    { value: privacy.consentRate ?? 0, percent: pct(privacy.consentRate), label: t('consentRate'), color: toneColor(privacy.consentRate ?? 0, pal) },
    { value: slaOnTrack, percent: Math.round(slaOnTrack * 100), label: t('slaOnTrack'), color: toneColor(slaOnTrack, pal) },
  ];

  return (
    <AdminShell>
      <OpsSurface pal={pal}>
        <OpsHeader
          pal={pal}
          accent="Control"
          title="Center"
          subtitle={<>
            {t('subtitle')}
            {source === 'fixture' && <span style={{ color: pal.faint }}> · {t('demo')}</span>}
          </>}
          right={<Pill pal={pal} tone={breachedCount ? pal.red : pal.green}>{breachedCount ? `${breachedCount} ${t('breaches')}` : t('allClear')}</Pill>}
        />

        <Card pal={pal} style={{ padding: '40px 28px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 28, justifyItems: 'center' }}>
            {gauges.map((g) => (
              <RadialGauge key={g.label} value={g.value} percent={g.percent} label={g.label} color={g.color} ink={pal.ink} muted={pal.muted} track={pal.track} size={152} />
            ))}
          </div>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20 }}>
          <Lens pal={pal} title={t('funnel')}>
            <Stat pal={pal} label={t('newToday')} value={stats.requestsToday} sub={`${stats.requestsTotal} ${t('total')}`} />
            <Stat pal={pal} label={t('confirmRate')} valueText={`${pct(stats.confirmRate)}%`} />
            <Stat pal={pal} label={t('avgConfirm')} valueText={avgConfirmH} />
            <Stat pal={pal} label={t('breachesLabel')} value={stats.breaches} valueTone={stats.breaches ? pal.red : pal.green} />
          </Lens>

          <Lens pal={pal} title={t('privacy')}>
            <Stat pal={pal} label={t('uploads')} value={privacy.uploads} />
            <Stat pal={pal} label={t('pii')} value={privacy.piiRedacted} />
            <Stat pal={pal} label={t('consent')} valueText={`${pct(privacy.consentRate)}%`} />
            <Stat pal={pal} label={t('aiBlocks')} value={privacy.aiBlocks} valueTone={privacy.aiBlocks ? pal.amber : pal.muted} />
          </Lens>

          <Lens pal={pal} title={t('security')}>
            <Stat pal={pal} label={t('tokenBlocks')} value={security.invalidTokenBlocks} valueTone={security.invalidTokenBlocks ? pal.amber : pal.muted} />
            <Stat pal={pal} label={t('gateBlocks')} value={security.aiGateBlocks} valueTone={security.aiGateBlocks ? pal.amber : pal.muted} />
            <Stat pal={pal} label={t('rateLimit')} valueText={t('rateOn')} />
          </Lens>
        </div>

        <Lens pal={pal} title={t('watchlist')}>
          <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 130px 110px', fontSize: 11, textTransform: 'uppercase', letterSpacing: .5, color: pal.faint, fontWeight: 600, padding: '0 0 14px' }}>
            <span>{t('request')}</span><span>{t('providerScope')}</span><span>{t('state')}</span><span style={{ textAlign: 'right' }}>{t('timeLeft')}</span>
          </div>
          {watchlist.map((w) => {
            const ms = w.msLeft;
            const overdue = ms !== null && ms < 0;
            const soon = ms !== null && ms >= 0 && ms < SIX_H;
            const stateLabel = w.status === 'confirmed' ? t('awaitingReply') : overdue ? t('breached') : soon ? t('atRisk') : t('onTrack');
            const stateColor = w.status === 'confirmed' ? pal.amber : overdue || soon ? pal.red : pal.green;
            const timeText = ms === null ? '—' : overdue ? t('overdue') : `in ${Math.round(ms / 3_600_000)}h`;
            return (
              <div key={w.id} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 130px 110px', alignItems: 'center', fontSize: 13, padding: '13px 0', borderTop: `1px solid ${pal.line}` }}>
                <span style={{ fontWeight: 600 }}>{w.id.slice(0, 8).toUpperCase()}</span>
                <span style={{ color: pal.muted }}>{w.provider_key} · {w.country} {w.category}</span>
                <span><span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20, color: stateColor, border: `1px solid ${stateColor}55` }}>{stateLabel}</span></span>
                <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: overdue ? pal.red : pal.ink }}>{timeText}</span>
              </div>
            );
          })}
          {watchlist.length === 0 && <div style={{ padding: '12px 0', color: pal.faint, fontSize: 13, borderTop: `1px solid ${pal.line}` }}>{t('noOpen')}</div>}
        </Lens>

        <Lens pal={pal} title={t('feed')}>
          {events.slice(0, 6).map((e, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderTop: i ? `1px solid ${pal.line}` : 'none', fontSize: 13 }}>
              <span>{e.type.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())}</span>
              <span style={{ color: pal.faint, fontVariantNumeric: 'tabular-nums' }}>{relTime(e.created_at, lang)}</span>
            </div>
          ))}
        </Lens>
      </OpsSurface>
    </AdminShell>
  );
}
