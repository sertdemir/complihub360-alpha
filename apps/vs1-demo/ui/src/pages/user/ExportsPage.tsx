import { useState } from 'react';
import { UserShell } from '../../components/user/UserShell';
import { FilterChip } from '../../components/ui/Badge';
import { Tag } from '../../components/ui/Tag';
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table';

// ─── User Dashboard · Exports ─────────────────────────────────────────────────
// Mirrors "User · Exports (Desktop)" (2675:681): filter chips + file table with
// READY / GENERATING statuses. Fixture data.

const FILTERS = ['All · 24', 'PDFs · 14', 'Data · 6', 'Reports · 3', 'Pending · 1'];

const FILES = [
  { name: 'VAT-roadmap-EU.pdf', meta: 'PDF · 2026-05-17 · 1.2 MB', status: 'ready', tone: 'success' as const, action: 'Download' },
  { name: 'risk-map-italy.pdf', meta: 'PDF · 2026-05-12 · 840 KB', status: 'ready', tone: 'success' as const, action: 'Download' },
  { name: 'workspace-data.zip', meta: 'ZIP · GDPR Art.20 · 2026-05-01', status: 'ready', tone: 'success' as const, action: 'Download' },
  { name: 'gdpr-audit-full.pdf', meta: 'PDF · 2026-05-18 · —', status: 'generating', tone: 'warning' as const, action: '…' },
];

export function ExportsPage() {
  const [filter, setFilter] = useState('All · 24');
  return (
    <UserShell activeDomain="Tax & VAT">
      <div className="mx-auto max-w-[1140px] space-y-5">
        <div>
          <h1 className="font-serif text-[32px] font-bold leading-tight text-fg">
            <span className="text-fg-accent">Exports</span>
          </h1>
          <p className="mt-1 text-body-sm text-fg-secondary">Your generated PDFs and data exports · links sent to your email</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <FilterChip key={f} size="sm" selected={filter === f} onClick={() => setFilter(f)}>{f}</FilterChip>
          ))}
        </div>

        <Table>
          <THead>
            <TR>
              <TH>File</TH>
              <TH>Details</TH>
              <TH>Status</TH>
              <TH>Actions</TH>
            </TR>
          </THead>
          <TBody>
            {FILES.map((f) => (
              <TR key={f.name}>
                <TD bold>{f.name}</TD>
                <TD className="text-fg-secondary">{f.meta}</TD>
                <TD><Tag tone={f.tone}>{f.status}</Tag></TD>
                <TD className="text-fg-brand">{f.action}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
    </UserShell>
  );
}
