import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Inbox } from 'lucide-react';
import { Moon, ChevronDown } from 'lucide-react';
import { ProviderShell } from '../../components/provider/ProviderShell';
import { Banner } from '../../components/ui/Banner';
import { FilterChip } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { RequestCard, type RequestStatus } from '../../components/ui/RequestCard';
import { ThreadDrawer } from '../../components/shared/ThreadDrawer';
import { EmptyState } from '../../components/ui/EmptyState';
import { useApiData } from '../../lib/useApiData';
import { fetchProviderRequests } from '../../api/requests';
import { fetchLastSeen, markSeen, isUnread } from '../../api/reads';
import { fetchCoverage, setAvailability, AVAILABILITY_EVENT } from '../../api/provider';

const REQUESTS_VIEWER = 'provider-requests';

// ─── Provider /requests ───────────────────────────────────────────────────────
// Mirrors the Figma screen "Provider Dashboard v1 · /requests (Desktop)"
// (0tJtkBs5… 1908:16): new-requests banner · header with OOO link · filter
// chips + SLA sort · request list built from <RequestCard>. Data is the design
// fixture until the requests API lands.

type Fixture = {
  id: string;
  status: RequestStatus;
  statusLabel: string;
  company: string;
  tag?: string;
  meta: string;
  sla?: string;
  action: { label: string; variant: 'accent' | 'primary' | 'ghost' };
};

// Fixture rows: company names, RQ-IDs, tags and meta descriptions are request
// data and stay verbatim. statusLabel / action.label are re-mapped to localized
// strings at render (also covers api-delivered rows via defaultValue).
const REQUESTS: Fixture[] = [
  {
    id: 'RQ-0234 · 12 min ago', status: 'awaiting-confirm', statusLabel: 'Awaiting confirm',
    company: 'Möbel-Berater Müller GmbH', tag: 'DE · EPR',
    meta: 'D2C · €4.2M revenue · target launch Q3 · sells furniture cross-border via own webshop + Amazon DE/AT marketplaces',
    sla: '23h 48m', action: { label: 'Open · confirm', variant: 'accent' },
  },
  {
    id: 'RQ-0233 · 2h ago', status: 'awaiting-confirm', statusLabel: 'Awaiting confirm',
    company: 'TexTec OÜ (Estonia)', tag: 'DE+AT · VAT',
    meta: 'B2B · €1.8M revenue · OSS registered DE only · expanding into AT under reverse-charge regime',
    sla: '21h 40m', action: { label: 'Open · confirm', variant: 'accent' },
  },
  {
    id: 'RQ-0232 · 8h ago', status: 'awaiting-confirm', statusLabel: 'Awaiting confirm',
    company: 'Smart-Stage UG', tag: 'DE · Data Privacy',
    meta: 'SaaS · €600k revenue · processes EU resident data · needs DPIA + GDPR Art. 30 records',
    sla: '14h 12m', action: { label: 'Open · confirm', variant: 'accent' },
  },
  {
    id: 'RQ-0228 · Yesterday', status: 'awaiting-reply', statusLabel: 'Awaiting reply',
    company: 'Brunnen Living Ltd.', tag: 'DE+UK · VAT',
    meta: 'D2C + Marketplace · €12M revenue · renewing annual VAT advisory retainer · prior engagements 2023+2024',
    sla: '36h 18m', action: { label: 'Reply', variant: 'primary' },
  },
  {
    id: 'RQ-0227 · 2 days ago', status: 'awaiting-reply', statusLabel: 'Awaiting reply',
    company: 'Nordic Decor AS', tag: 'NO · VAT',
    meta: 'D2C · €3M revenue · expanding to Norway · needs VOEC scheme guidance + cross-border invoicing',
    sla: '11h 04m', action: { label: 'Reply', variant: 'primary' },
  },
  {
    id: 'RQ-0225 · 4 days ago', status: 'active', statusLabel: 'Active',
    company: 'KraftKaffee GmbH', tag: 'DE · VAT',
    meta: 'D2C · €2.4M revenue · quarterly OSS filing in progress · Q2 deadline 2026-07-31',
    action: { label: 'View', variant: 'ghost' },
  },
];

const FILTERS = [
  { key: 'confirm', labelKey: 'requests.filterAwaitingConfirmation', match: 'awaiting-confirm' },
  { key: 'reply', labelKey: 'requests.filterAwaitingReply', match: 'awaiting-reply' },
  { key: 'active', labelKey: 'requests.filterActive', match: 'active' },
] as const;

// status → localized status label (defaultValue = raw label from fixture/api).
const STATUS_LABEL_KEY: Record<RequestStatus, string> = {
  'awaiting-confirm': 'requests.statusAwaitingConfirm',
  'awaiting-reply': 'requests.statusAwaitingReply',
  'active': 'requests.statusActive',
  'closed': 'requests.statusClosed',
};

// action label → localized button label (defaultValue = raw label).
// api ships the dossier-anonymized company as a fixed English label.
const ANON_COMPANY = '\u{1F512} Anonymized \u00b7 unlocks on confirm';

const ACTION_LABEL_KEY: Record<string, string> = {
  'Open · confirm': 'requests.actionOpenConfirm',
  'Reply': 'requests.actionReply',
  'View': 'requests.actionView',
};

export function RequestsPage() {
  const { t } = useTranslation('providerws');
  // Demo states (Figma: OOO + First-Request-empty): append ?state=ooo | empty.
  const [params] = useSearchParams();
  const demoState = params.get('state');
  const [filter, setFilter] = useState<string>('confirm');
  const [bannerOpen, setBannerOpen] = useState(true);
  const [threadFor, setThreadFor] = useState<string | null>(null);
  // Deep-link support (search drawer, notification links): ?thread=<uuid>
  const [searchParams, setSearchParams] = useSearchParams();
  const deepThread = searchParams.get('thread');
  if (deepThread && threadFor !== deepThread) setThreadFor(deepThread);
  // Live data when the compliance-api answers; the design fixture otherwise.
  const { data: requests, source, loading } = useApiData(fetchProviderRequests, REQUESTS);
  const activeMatch = FILTERS.find((f) => f.key === filter)?.match;
  const list = requests.filter((r) => !activeMatch || r.status === activeMatch);

  // C1: the "new requests" banner counts rows newer than the seen-watermark.
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [seenLoaded, setSeenLoaded] = useState(false);
  useEffect(() => {
    fetchLastSeen(REQUESTS_VIEWER)
      .then((v) => { setLastSeen(v); setSeenLoaded(true); })
      .catch(() => {});
  }, []);
  const liveBanner = source === 'api' && seenLoaded;
  const newCount = liveBanner
    ? requests.filter((r) => 'createdAt' in r && isUnread((r as { createdAt?: string }).createdAt, lastSeen)).length
    : 0;
  const markRequestsSeen = async () => {
    try { setLastSeen(await markSeen(REQUESTS_VIEWER)); } catch { /* keep banner */ }
  };

  // C2: real OOO state — banner + "End early" wired to the availability PATCH.
  const [ooo, setOoo] = useState(false);
  useEffect(() => {
    fetchCoverage().then((c) => setOoo(c.availability === 'ooo')).catch(() => {});
    const onSync = (e: Event) => setOoo((e as CustomEvent<'available' | 'ooo'>).detail === 'ooo');
    window.addEventListener(AVAILABILITY_EVENT, onSync);
    return () => window.removeEventListener(AVAILABILITY_EVENT, onSync);
  }, []);

  return (
    <ProviderShell>
      <div className="mx-auto max-w-[1140px] space-y-5">
        {(ooo || demoState === 'ooo') && (
          <Banner
            status="brand"
            title={t('requests.oooBannerTitle')}
            action={<Button size="sm" variant="secondary" onClick={() => setAvailability('available').catch(() => {})}>{t('requests.oooEndEarly')}</Button>}
          >
            {t('requests.oooBannerBody')}
          </Banner>
        )}
        {liveBanner && newCount > 0 && demoState !== 'ooo' && (
          <Banner
            status="info"
            title={t('requests.newBannerTitle', { count: newCount })}
            action={<Button size="sm" variant="secondary" onClick={markRequestsSeen}>{t('requests.markAllSeen')}</Button>}
          >
            {t('requests.newBannerBody')}
          </Banner>
        )}
        {!loading && source === 'fixture' && bannerOpen && demoState !== 'ooo' && (
          <Banner
            status="info"
            title={t('requests.fixtureBannerTitle')}
            action={<Button size="sm" variant="secondary" onClick={() => setBannerOpen(false)}>{t('requests.markAllSeen')}</Button>}
          >
            {t('requests.newBannerBody')}
          </Banner>
        )}

        <div className="flex items-start justify-between gap-4">
          <h1 className="font-serif text-[30px] font-bold leading-tight text-fg">{t('requests.title')}</h1>
          {!ooo && (
            <button
              type="button"
              onClick={() => setAvailability('ooo').catch(() => {})}
              className="mt-2 flex shrink-0 items-center gap-1.5 text-[12px] text-fg-secondary transition-colors hover:text-fg"
            >
              <Moon size={13} /> {t('requests.outOfOffice')}
            </button>
          )}
        </div>
        <p className="-mt-3 max-w-3xl text-body-sm leading-relaxed text-fg-secondary">
          {t('requests.subtitle')}
        </p>

        <div className="flex items-center gap-2">
          {FILTERS.map((f) => (
            <FilterChip key={f.key} selected={filter === f.key} onClick={() => setFilter(f.key)}>
              {t(f.labelKey)} · {requests.filter((r) => r.status === f.match).length}
            </FilterChip>
          ))}
          <button type="button" className="ml-auto flex items-center gap-1 text-[12px] text-fg-tertiary transition-colors hover:text-fg">
            {t('requests.sortSla')} <ChevronDown size={12} />
          </button>
        </div>

        {demoState === 'empty' ? (
          <EmptyState
            icon={<Inbox size={28} />}
            title={t('requests.emptyTitle')}
            description={t('requests.emptyDescription')}
            action={<Button size="sm" variant="secondary">{t('requests.previewProfile')}</Button>}
          />
        ) : (
        <div className="space-y-2.5">
          {list.map((r) => (
            <RequestCard
              key={r.id}
              idLine={'idLine' in r ? (r as { idLine: string }).idLine : r.id}
              status={r.status}
              statusLabel={t(STATUS_LABEL_KEY[r.status], { defaultValue: r.statusLabel })}
              company={r.company === ANON_COMPANY ? t('requests.companyAnonymized', { defaultValue: r.company }) : r.company}
              tag={r.tag}
              meta={r.meta}
              slaValue={r.sla}
              action={
                <Button size="sm" variant={r.action.variant} onClick={() => setThreadFor(r.id)}>
                  {ACTION_LABEL_KEY[r.action.label] ? t(ACTION_LABEL_KEY[r.action.label], { defaultValue: r.action.label }) : r.action.label}
                </Button>
              }
            />
          ))}
        </div>
        )}
      </div>
      <ThreadDrawer open={!!threadFor} engagementId={threadFor} viewer="provider" onClose={() => { setThreadFor(null); if (deepThread) setSearchParams({}, { replace: true }); }} />
    </ProviderShell>
  );
}
