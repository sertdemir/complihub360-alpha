import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Moon, ChevronDown } from 'lucide-react';
import { ProviderShell } from '../../components/provider/ProviderShell';
import { Banner } from '../../components/ui/Banner';
import { FilterChip } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { RequestCard, type RequestStatus } from '../../components/ui/RequestCard';
import { useRequestContext } from '../../lib/requestContext';
import { ThreadDrawer } from '../../components/shared/ThreadDrawer';
import { useWorkspaceData } from '../../lib/useWorkspaceData';
import { LoadFailedState, ReadinessEmpty, useReadiness } from '../../components/provider/WorkspaceStates';
import { fetchProviderRequests } from '../../api/requests';
import { fetchLastSeen, markSeen, isUnread } from '../../api/reads';
import { fetchCoverage, setAvailability, AVAILABILITY_EVENT } from '../../api/provider';

const REQUESTS_VIEWER = 'provider-requests';

// ─── Provider /requests ───────────────────────────────────────────────────────
// Mirrors the Figma screen "Provider Dashboard v1 · /requests (Desktop)"
// (0tJtkBs5… 1908:16): new-requests banner · header with OOO link · filter
// chips + SLA sort · request list built from <RequestCard>. Seit TKT-PROV-12
// ohne Fixture: leer heisst B3, ein Fehler heisst A2.

const FILTERS = [
  { key: 'confirm', labelKey: 'requests.filterAwaitingConfirmation', match: 'awaiting-confirm' },
  { key: 'reply', labelKey: 'requests.filterAwaitingReply', match: 'awaiting-reply' },
  { key: 'active', labelKey: 'requests.filterActive', match: 'active' },
] as const;

// status → localized status label (defaultValue = raw label from the api).
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
  const { kontext } = useRequestContext();
  const [filter, setFilter] = useState<string>('confirm');
  const [threadFor, setThreadFor] = useState<string | null>(null);
  // Deep-link support (search drawer, notification links): ?thread=<uuid>
  const [searchParams, setSearchParams] = useSearchParams();
  const deepThread = searchParams.get('thread');
  if (deepThread && threadFor !== deepThread) setThreadFor(deepThread);
  const { data, state, error, reload } = useWorkspaceData(fetchProviderRequests);
  const requests = data ?? [];
  const readiness = useReadiness(state === 'ready' && requests.length === 0);
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
  const liveBanner = state === 'ready' && seenLoaded;
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
        {ooo && (
          <Banner
            status="brand"
            title={t('requests.oooBannerTitle')}
            action={<Button size="sm" variant="secondary" onClick={() => setAvailability('available').catch(() => {})}>{t('requests.oooEndEarly')}</Button>}
          >
            {t('requests.oooBannerBody')}
          </Banner>
        )}
        {liveBanner && newCount > 0 && !ooo && (
          <Banner
            status="info"
            title={t('requests.newBannerTitle', { count: newCount })}
            action={<Button size="sm" variant="secondary" onClick={markRequestsSeen}>{t('requests.markAllSeen')}</Button>}
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

        {state === 'loading' && <div aria-busy="true" className="h-24 animate-pulse rounded-xl bg-surface-secondary/60 motion-reduce:animate-none" />}
        {state === 'error' && <LoadFailedState surface="requests" error={error} onRetry={reload} section />}
        {state === 'ready' && (requests.length === 0 ? (
          <ReadinessEmpty kind="requests" items={readiness} />
        ) : (
        <div className="space-y-2.5">
          {list.map((r) => (
            <RequestCard
              key={r.id}
              context={kontext({ category: r.category, country: r.country, createdAt: r.createdAt, ref: r.ref })}
              status={r.status}
              statusLabel={t(STATUS_LABEL_KEY[r.status], { defaultValue: r.statusLabel })}
              company={r.company === ANON_COMPANY ? t('requests.companyAnonymized', { defaultValue: r.company }) : r.company}
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
        ))}
      </div>
      <ThreadDrawer open={!!threadFor} engagementId={threadFor} viewer="provider" onClose={() => { setThreadFor(null); if (deepThread) setSearchParams({}, { replace: true }); }} />
    </ProviderShell>
  );
}
