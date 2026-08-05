import { useCallback, useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { UserShell } from '../../components/user/UserShell';
import { Button } from '../../components/ui/Button';
import { FilterChip } from '../../components/ui/Badge';
import { SessionRow, type SessionRisk } from '../../components/ui/SessionRow';
import { SessionActionsDrawer, type SessionActionsTarget } from '../../components/user/SessionActionsDrawer';
import { fetchSessions, type SessionRowData } from '../../api/sessions';
import { DOMAIN_I18N_KEY } from '../../lib/domains';

// ─── User Dashboard · Sessions ────────────────────────────────────────────────
// Mirrors "User Dashboard v1 · Sessions list (Desktop)" (2051:48): gold-word
// header · filter chips · Session Rows. Live sessions (guest_key anchor) when
// the API answers; the design fixture otherwise. "⋯" opens the B13 actions
// drawer (rename/duplicate/archive).

type Row = {
  id?: string;
  country: string; domain: string; needsRefresh?: boolean; updated: string;
  title: string; riskLine: string; risk: SessionRisk;
};

// Design fixture (demo data — stays in the original language).
const SESSIONS: Row[] = [
  { country: 'IT', domain: 'Tax & VAT', needsRefresh: true, updated: '· Updated 2h ago', title: 'VAT registration · Italy', riskLine: '● High risk · threshold reached · 1 markets', risk: 'high' },
  { country: 'FR', domain: 'Product & Packaging', updated: '· Updated 1d ago', title: 'EPR registration · France', riskLine: '● Medium risk · deadline Q3 2026 · 1 markets', risk: 'medium' },
  { country: 'UK', domain: 'Data & Privacy', needsRefresh: true, updated: '· Updated 3d ago', title: 'GDPR audit & DPA review', riskLine: '● High risk · cookie consent · 1 markets', risk: 'high' },
  { country: 'ES', domain: 'Tax & VAT', updated: '· Updated 7d ago', title: 'VAT thresholds · Spain', riskLine: '● Low risk · monitoring only · 1 markets', risk: 'low' },
  { country: 'DE', domain: 'Data & Privacy', updated: '· Updated 14d ago', title: 'Cookie consent setup', riskLine: '● Medium risk · review pending · 1 markets', risk: 'medium' },
  { country: 'DE', domain: 'Tax & VAT', updated: '· Updated 1mo ago', title: 'VAT roadmap · EU-wide', riskLine: '● Low risk · compliant · 4 markets', risk: 'low' },
];

const DOMAIN_LABEL: Record<string, string> = {
  vat: 'Tax & VAT', tax: 'Tax & VAT',
  privacy: 'Data & Privacy', gdpr: 'Data & Privacy', data: 'Data & Privacy',
  epr: 'Product & Packaging', packaging: 'Product & Packaging',
};

// Canonical English domain label → userws translation key (display only).
const DOMAIN_KEY = DOMAIN_I18N_KEY;

function relTime(iso: string, t: TFunction): string {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (h < 1) return t('sessions.updatedJustNow');
  if (h < 24) return t('sessions.updatedHoursAgo', { count: h });
  const d = Math.floor(h / 24);
  return t('sessions.updatedDaysAgo', { count: d });
}

function toRow(s: SessionRowData, t: TFunction): Row {
  const cat = s.categories?.[0] ?? 'compliance';
  const domain = DOMAIN_LABEL[cat.toLowerCase()] ?? cat.replace(/^./, (c) => c.toUpperCase());
  const level = (s.risk_summary?.level ?? 'low').toLowerCase();
  const risk: SessionRisk = level === 'high' ? 'high' : level === 'medium' ? 'medium' : 'low';
  const markets = s.markets?.length || 1;
  const riskKey = risk === 'high' ? 'riskLineHigh' : risk === 'medium' ? 'riskLineMedium' : 'riskLineLow';
  return {
    id: s.id,
    country: (s.country ?? '—').toUpperCase(),
    domain,
    updated: relTime(s.updated_at, t),
    title: s.label || `${cat} · ${(s.country ?? '').toUpperCase()}`,
    riskLine: t(`sessions.${riskKey}`, { count: markets }),
    risk,
  };
}

export function SessionsPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('userws');
  const locale = i18n.resolvedLanguage || 'en';
  const [filter, setFilter] = useState('all');
  const [live, setLive] = useState<Row[] | null>(null);
  const [actionsFor, setActionsFor] = useState<SessionActionsTarget | null>(null);

  const tDomain = (label: string) => (DOMAIN_KEY[label] ? t(`domain.${DOMAIN_KEY[label]}`) : label);

  const reload = useCallback(() => {
    fetchSessions()
      .then((rows) => setLive(rows.filter((r) => r.status === 'active').map((r) => toRow(r, t))))
      .catch(() => { /* keep fixture */ });
  }, [t]);
  useEffect(() => { reload(); }, [reload]);

  const rows = live && live.length > 0 ? live : SESSIONS;
  const isLive = live !== null && live.length > 0;

  const FILTERS = [
    { key: 'all', label: t('sessions.filterAll', { count: rows.length }), match: (_s: Row) => true },
    ...['Tax & VAT', 'Data & Privacy', 'Product & Packaging']
      .filter((d) => rows.some((s) => s.domain === d))
      .map((d) => ({ key: d, label: `${tDomain(d)} · ${rows.filter((s) => s.domain === d).length}`, match: (s: Row) => s.domain === d })),
  ];
  const match = FILTERS.find((f) => f.key === filter)?.match ?? (() => true);
  // v2 polish: the sort control is a real toggle (newest ↔ oldest).
  const [sortDesc, setSortDesc] = useState(true);
  const filtered = rows.filter(match);
  const list = sortDesc ? filtered : [...filtered].reverse();

  return (
    <UserShell>
      <div className="mx-auto max-w-[1140px] space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-[32px] font-bold leading-tight text-fg">
              <Trans t={t} i18nKey="sessions.title" components={{ accent: <span className="text-fg-accent" /> }} />
            </h1>
            <p className="mt-1 text-body-sm text-fg-secondary">
              {t('sessions.subSaved', { count: rows.length })}{isLive ? '' : t('sessions.subFixtureSuffix')}
            </p>
          </div>
          <Button className="mt-1 shrink-0" onClick={() => navigate(`/${locale}/wizard`)}>{t('shared.startNewSearch')}</Button>
        </div>

        <div className="flex items-center gap-2">
          {FILTERS.map((f) => (
            <FilterChip key={f.key} size="sm" selected={filter === f.key} onClick={() => setFilter(f.key)}>
              {f.label}
            </FilterChip>
          ))}
          <button
            type="button"
            aria-pressed={!sortDesc}
            onClick={() => setSortDesc((s) => !s)}
            className="ml-auto flex items-center gap-1 text-[12px] text-fg-tertiary transition-colors hover:text-fg"
          >
            {t('shared.sortLastUpdated')} <ChevronDown size={12} className={sortDesc ? '' : 'rotate-180'} />
          </button>
        </div>

        <div className="space-y-2.5">
          {list.map((s) => (
            <SessionRow
              key={s.id ?? s.title}
              country={s.country}
              domain={tDomain(s.domain)}
              status={s.needsRefresh ? t('sessions.needsRefresh') : undefined}
              updated={s.updated}
              title={s.title}
              riskLine={s.riskLine}
              risk={s.risk}
              onMenu={s.id ? () => setActionsFor({ id: s.id!, title: s.title, domain: s.domain, country: s.country }) : () => {}}
              action={<Button size="sm" variant="accent" onClick={() => navigate(`/${locale}/results${s.id && !s.id.startsWith('fx') ? `?session=${s.id}` : ''}`)}>{t('shared.open')}</Button>}
            />
          ))}
        </div>
      </div>
      <SessionActionsDrawer target={actionsFor} onClose={() => setActionsFor(null)} onChanged={reload} />
    </UserShell>
  );
}
