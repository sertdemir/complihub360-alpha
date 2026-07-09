import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { TableMobileCard } from './TableMobileCard';
import { TableMobileRow } from './TableMobileRow';
import { MobileSortBar } from './MobileSortBar';
import { RiskBadge, type RiskLevel } from './RiskBadge';

const DESCRIPTION = `
**Mobile Table** — the Compass mobile data-display doctrine (Figma *Table* page
786:2 → *Table Mobile Card* 804:504 + *Mobile Sort Bar* 805:508). On mobile there
is **no horizontal-scroll table**: every obligation row collapses into a stacked
\`TableMobileCard\` (bold title + label→value pairs, Risk rendered as a RiskBadge),
and sorting moves into a \`MobileSortBar\` of petrol-accented chips above the list.

- **TableMobileCard** — \`fields\` (label/value pairs), \`title\`, \`selected\`,
  \`selectable\` (leading checkbox), \`onSelect\`, \`onClick\`. Selected = petrol
  border + ring + brand-light tint (multi-select for bulk actions).
- **MobileSortBar** — \`options\`, \`active\`, \`direction\` (asc/desc),
  \`onChange\`, \`onDirectionToggle\`. Active chip shows the direction arrow in
  petrol; same sortability doctrine as desktop headers.
`;

const meta = {
  title: 'Molecules/Mobile Table',
  component: TableMobileCard,
  parameters: {
    layout: 'centered',
    docs: { description: { component: DESCRIPTION } },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof TableMobileCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const SORT_OPTIONS = [
  { key: 'name', label: 'Name' },
  { key: 'risk', label: 'Risk' },
  { key: 'owner', label: 'Owner' },
  { key: 'due', label: 'Due' },
];

interface Obligation {
  id: string;
  name: string;
  domain: string;
  jurisdiction: string;
  risk: RiskLevel;
  riskLabel: string;
  due: string;
}

const OBLIGATIONS: Obligation[] = [
  { id: 'o1', name: 'NIS2 Implementation Phase 2', domain: 'Cybersecurity', jurisdiction: 'EU', risk: 'critical', riskLabel: 'Critical', due: '15.05.2026' },
  { id: 'o2', name: 'VAT OSS Quarterly Filing', domain: 'Tax & VAT', jurisdiction: 'DE', risk: 'high', riskLabel: 'High', due: '30.06.2026' },
  { id: 'o3', name: 'GDPR Records of Processing', domain: 'Data Privacy', jurisdiction: 'EU', risk: 'medium', riskLabel: 'Medium', due: '12.07.2026' },
  { id: 'o4', name: 'EPR Packaging Registration', domain: 'EPR & Packaging', jurisdiction: 'FR', risk: 'low', riskLabel: 'Low', due: '01.09.2026' },
];

function MobileTableDemo() {
  const [active, setActive] = useState('risk');
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedId, setSelectedId] = useState<string | null>('o1');

  return (
    // 360px mobile device frame
    <div className="w-[360px] rounded-[28px] border border-stroke bg-surface-secondary p-3 shadow-lg">
      <div className="space-y-3">
        <MobileSortBar
          options={SORT_OPTIONS}
          active={active}
          direction={direction}
          onChange={setActive}
          onDirectionToggle={() => setDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
        />

        <div className="space-y-2.5">
          {OBLIGATIONS.map((o) => (
            <TableMobileCard
              key={o.id}
              selectable
              selected={selectedId === o.id}
              onSelect={(s) => setSelectedId(s ? o.id : null)}
              title={
                <span className="flex items-start justify-between gap-2">
                  <span className="min-w-0">{o.name}</span>
                  <MoreHorizontal size={18} className="mt-0.5 shrink-0 text-fg-tertiary" aria-hidden="true" />
                </span>
              }
              fields={[
                { label: 'Domain', value: o.domain },
                { label: 'Jurisdiction', value: o.jurisdiction },
                { label: 'Risk', value: <RiskBadge level={o.risk} styleVariant="soft" size="sm">{o.riskLabel}</RiskBadge> },
                { label: 'Due', value: <span className="tabular-nums">{o.due}</span> },
              ]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export const Light: Story = {
  args: { fields: [] },
  render: () => <MobileTableDemo />,
};

export const Dark: Story = {
  args: { fields: [] },
  parameters: { backgrounds: { default: 'dark' } },
  render: () => (
    <div className="dark rounded-2xl bg-[#0F172A] p-6">
      <MobileTableDemo />
    </div>
  ),
};

// Compact rows — Compass "Table Mobile Row" (1442:777): 44px invoice/list rows.
export const CompactRowsDark: Story = {
  name: 'Compact rows (dark)',
  args: { fields: [] },
  render: () => (
    <div className="dark mx-auto w-[390px] rounded-xl bg-[#1F2937] p-4">
      <p className="mb-1 text-[13px] font-semibold text-fg">Invoice history</p>
      <div className="divide-y divide-white/5">
        <TableMobileRow title="INV-026" sub="2026-05" value="€2,164" status="failed" statusTone="error" />
        <TableMobileRow title="INV-025" sub="2026-04" value="€1,892" status="paid" statusTone="success" />
        <TableMobileRow title="INV-024" sub="2026-03" value="€1,524" status="paid" statusTone="success" />
        <TableMobileRow title="INV-023" sub="2026-02" value="€1,732" status="paid" statusTone="success" />
      </div>
    </div>
  ),
};
