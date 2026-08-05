import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserShell } from '../../components/user/UserShell';
import { FilterChip } from '../../components/ui/Badge';
import { Tag } from '../../components/ui/Tag';
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table';

// ─── User Dashboard · Exports ─────────────────────────────────────────────────
// Mirrors "User · Exports (Desktop)" (2675:681): filter chips + file table with
// READY / GENERATING statuses. Fixture data (file rows stay untranslated).

const FILTER_KEYS = ['filterAll', 'filterPdfs', 'filterData', 'filterReports', 'filterPending'];

const FILES = [
  { name: 'VAT-roadmap-EU.pdf', meta: 'PDF · 2026-05-17 · 1.2 MB', status: 'ready', tone: 'success' as const },
  { name: 'risk-map-italy.pdf', meta: 'PDF · 2026-05-12 · 840 KB', status: 'ready', tone: 'success' as const },
  { name: 'workspace-data.zip', meta: 'ZIP · GDPR Art.20 · 2026-05-01', status: 'ready', tone: 'success' as const },
  { name: 'gdpr-audit-full.pdf', meta: 'PDF · 2026-05-18 · —', status: 'generating', tone: 'warning' as const },
];

export function ExportsPage() {
  const { t } = useTranslation('userws');
  const [filter, setFilter] = useState('filterAll');
  return (
    <UserShell>
      <div className="mx-auto max-w-[1140px] space-y-5">
        <div>
          <h1 className="font-serif text-[32px] font-bold leading-tight text-fg">
            <span className="text-fg-accent">{t('exports.title')}</span>
          </h1>
          <p className="mt-1 text-body-sm text-fg-secondary">{t('exports.sub')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {FILTER_KEYS.map((f) => (
            <FilterChip key={f} size="sm" selected={filter === f} onClick={() => setFilter(f)}>{t(`exports.${f}`)}</FilterChip>
          ))}
        </div>

        <Table>
          <THead>
            <TR>
              <TH>{t('exports.colFile')}</TH>
              <TH>{t('exports.colDetails')}</TH>
              <TH>{t('exports.colStatus')}</TH>
              <TH>{t('exports.colActions')}</TH>
            </TR>
          </THead>
          <TBody>
            {FILES.map((f) => (
              <TR key={f.name}>
                <TD bold>{f.name}</TD>
                <TD className="text-fg-secondary">{f.meta}</TD>
                <TD><Tag tone={f.tone}>{f.status === 'ready' ? t('exports.statusReady') : t('exports.statusGenerating')}</Tag></TD>
                <TD className="text-fg-brand">{f.status === 'ready' ? t('exports.download') : '…'}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
    </UserShell>
  );
}
