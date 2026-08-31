import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown, MoreHorizontal, Inbox } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import { UserShell } from '../../components/user/UserShell';
import { EmptyState } from '../../components/user/EmptyState';
import { Button } from '../../components/ui/Button';
import { FilterChip } from '../../components/ui/Badge';
import { RequestCard, type RequestStatus } from '../../components/ui/RequestCard';
import { ThreadDrawer } from '../../components/shared/ThreadDrawer';
import { RequestActionsDrawer, type RequestActionsTarget } from '../../components/user/RequestActionsDrawer';
import { fetchUserRequests } from '../../api/requests';

// ─── User Dashboard · Requests / Lead Center ──────────────────────────────────
// Mirrors "User Dashboard v1 · Requests / Lead Center (Desktop)" (2051:54):
// gold-word header · filter chips · Request Cards with PARTNER tag + session
// link meta. Design fixture data (rows stay untranslated; UI labels are keyed).

type Fixture = {
  uuid?: string;
  id: string; status: RequestStatus; statusLabel: string; company: string;
  partner?: boolean; meta: string; action: { label: string; variant: 'accent' | 'secondary' };
  bucket: 'confirm' | 'confirmed' | 'replied' | 'overdue' | 'active' | 'closed';
  rawStatus?: string;
};


const FILTERS = [
  { key: 'all', labelKey: 'filterAll' },
  { key: 'confirm', labelKey: 'filterAwaitingConfirmation' },
  { key: 'confirmed', labelKey: 'filterConfirmed' },
  { key: 'replied', labelKey: 'filterReplied' },
  { key: 'overdue', labelKey: 'filterOverdue' },
] as const;

// Live/fixture UI labels → userws keys (display only; raw values untouched).
const STATUS_KEY: Record<string, string> = {
  'Awaiting confirmation': 'awaitingConfirmation', 'Active': 'active',
  'Provider replied': 'providerReplied', 'Provider confirmed': 'providerConfirmed', 'Withdrawn': 'withdrawn',
};
const ACTION_KEY: Record<string, string> = {
  'Send reminder': 'sendReminder', 'Open thread': 'openThread', 'View thread': 'viewThread', 'View request': 'viewRequest',
};

export function UserRequestsPage() {
  const { t, i18n } = useTranslation('userws');
  const [filter, setFilter] = useState<string>('all');
  const navigate = useNavigate();
  const locale = i18n.resolvedLanguage || 'en';
  const [threadFor, setThreadFor] = useState<string | null>(null);
  const tStatus = (label: string) => (STATUS_KEY[label] ? t(`status.${STATUS_KEY[label]}`) : label);
  const tAction = (label: string) => (ACTION_KEY[label] ? t(`actions.${ACTION_KEY[label]}`) : label);
  // Deep-link support (user notifications feed, C12): ?thread=<uuid>
  const [searchParams, setSearchParams] = useSearchParams();
  const deepThread = searchParams.get('thread');
  if (deepThread && threadFor !== deepThread) setThreadFor(deepThread);
  // Kein Fixture-Rueckfall mehr (Befund 2026-08-30): useApiData behielt bei
  // einem leeren Ergebnis ausdruecklich die Fixture ("so demos stay
  // meaningful"), und ein neues Konto sah damit drei erfundene Anfragen.
  // `null` heisst laedt, `[]` heisst es gibt keine.
  const [rows, setRows] = useState<Fixture[] | null>(null);
  useEffect(() => {
    let alive = true;
    fetchUserRequests()
      .then((r) => { if (alive) setRows(r); })
      .catch(() => { if (alive) setRows([]); });
    return () => { alive = false; };
  }, []);
  // B14: "⋯" actions drawer + local override after a withdraw (no refetch API).
  const [actionsFor, setActionsFor] = useState<RequestActionsTarget | null>(null);
  const [withdrawnIds, setWithdrawnIds] = useState<Set<string>>(new Set());
  const effective = (rows ?? []).map((r) =>
    r.uuid && withdrawnIds.has(r.uuid)
      ? { ...r, status: 'active' as RequestStatus, statusLabel: 'Withdrawn', bucket: 'closed' as const, rawStatus: 'withdrawn' }
      : r,
  );
  const list = effective.filter((r) => filter === 'all' || r.bucket === filter);

  return (
    <UserShell>
      <div className="mx-auto max-w-[1140px] space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-[32px] font-bold leading-tight text-fg">
              <Trans t={t} i18nKey="requests.title" components={{ accent: <span className="text-fg-accent-emphasis" /> }} />
            </h1>
            <p className="mt-1 text-body-sm text-fg-secondary">
              {t('requests.sub')}
            </p>
          </div>
          <div className="mt-1 flex shrink-0 items-center gap-4">
            <a href="#" className="text-[12px] font-medium text-fg underline underline-offset-2">{t('requests.exportCsv')}</a>
            <Button size="sm">{t('requests.findProvider')}</Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {FILTERS.map((f) => (
            <FilterChip key={f.key} size="sm" selected={filter === f.key} onClick={() => setFilter(f.key)}>
              {t(`requests.${f.labelKey}`)}
            </FilterChip>
          ))}
          <button type="button" className="ml-auto flex items-center gap-1 text-[12px] text-fg-tertiary transition-colors hover:text-fg">
            {t('shared.sortLastUpdated')} <ChevronDown size={12} />
          </button>
        </div>

        {rows !== null && rows.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={t('requests.emptyTitle')}
            body={t('requests.emptyBody')}
            cta={{ label: t('requests.emptyCta'), onClick: () => navigate(`/${locale}/wizard`) }}
          />
        ) : null}

        <div className="space-y-2.5">
          {list.map((r) => (
            <RequestCard
              key={r.id}
              idLine={r.id}
              status={r.status}
              statusLabel={tStatus(r.statusLabel)}
              company={r.company}
              tag={r.partner ? 'PARTNER' : undefined}
              meta={r.meta}
              action={
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant={r.action.variant} onClick={() => r.uuid && setThreadFor(r.uuid)}>{tAction(r.action.label)}</Button>
                  {r.uuid && (
                    <button
                      type="button"
                      aria-label={t('requests.requestActionsAria')}
                      onClick={() => setActionsFor({ uuid: r.uuid!, idLine: r.id, company: r.company, statusLabel: String(r.statusLabel), rawStatus: r.rawStatus })}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-elevate/10 text-fg-tertiary transition-colors hover:border-elevate/25 hover:text-fg"
                    >
                      <MoreHorizontal size={15} />
                    </button>
                  )}
                </div>
              }
            />
          ))}
        </div>

        <p className="text-[11px] text-fg-tertiary">
          {t('requests.footerStats')}
        </p>
      </div>
      <ThreadDrawer open={!!threadFor} engagementId={threadFor} viewer="user" onClose={() => { setThreadFor(null); if (deepThread) setSearchParams({}, { replace: true }); }} />
      <RequestActionsDrawer
        target={actionsFor}
        onClose={() => setActionsFor(null)}
        onOpenThread={(uuid) => setThreadFor(uuid)}
        onWithdrawn={(uuid) => setWithdrawnIds((prev) => new Set(prev).add(uuid))}
      />
    </UserShell>
  );
}
