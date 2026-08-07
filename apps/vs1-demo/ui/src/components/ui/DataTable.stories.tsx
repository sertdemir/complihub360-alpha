import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { DataTable, type DataTableColumn } from './DataTable';

const DESCRIPTION = `
**DataTable** — a generic, composed Organism built on the Compass *Table* primitives
(Table · THead · TBody · TR · TH · TD), wired to the existing *Pagination*, *Checkbox*
and *EmptyState* components. No table chrome is reinvented.

- **Generic \`DataTable<T>\`** — fully typed columns with optional \`render\`, \`sortable\`,
  \`align\` and \`numeric\` flags.
- **Client-side sort** — clicking a sortable header cycles asc → desc → none, with the
  primitive's chevron indicator.
- **\`pageSize\`** — paginates client-side using the existing *Pagination*.
- **\`selectable\`** — leading *Checkbox* column + indeterminate select-all; emits
  selected row keys via \`onSelectionChange\`.
- **\`loading\`** — five shimmer rows. **\`emptyState\`** — full-width *EmptyState* when
  there is no data.

Light + dark via the underlying primitives' semantic tokens.
`;

const meta: Meta<typeof DataTable> = {
  title: 'Organisms/DataTable',
  component: DataTable as never,
  parameters: {
    layout: 'padded',
    docs: { description: { component: DESCRIPTION } },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Sample compliance dataset ──────────────────────────────────────────────────
interface ProviderRow {
  id: string;
  provider: string;
  domain: string;
  jurisdiction: string;
  risk: 'Low' | 'Medium' | 'High';
  status: 'Active' | 'Pending' | 'Suspended';
  matchRate: number;
}

const ROWS: ProviderRow[] = [
  { id: 'p1', provider: 'Helios Tax Partners', domain: 'Tax & VAT', jurisdiction: 'DE', risk: 'Low', status: 'Active', matchRate: 96 },
  { id: 'p2', provider: 'Nordwind Audit GmbH', domain: 'Audit', jurisdiction: 'DE', risk: 'Medium', status: 'Active', matchRate: 88 },
  { id: 'p3', provider: 'Lex & Vogel Legal', domain: 'Data Privacy', jurisdiction: 'AT', risk: 'High', status: 'Pending', matchRate: 74 },
  { id: 'p4', provider: 'Atlas Compliance Co.', domain: 'AML / KYC', jurisdiction: 'CH', risk: 'Medium', status: 'Active', matchRate: 91 },
  { id: 'p5', provider: 'Brightline Advisory', domain: 'ESG', jurisdiction: 'UK', risk: 'Low', status: 'Suspended', matchRate: 63 },
  { id: 'p6', provider: 'Meridian Risk Group', domain: 'Tax & VAT', jurisdiction: 'FR', risk: 'High', status: 'Pending', matchRate: 70 },
  { id: 'p7', provider: 'Vector Assurance', domain: 'Audit', jurisdiction: 'NL', risk: 'Low', status: 'Active', matchRate: 84 },
  { id: 'p8', provider: 'Cobalt Privacy Ltd', domain: 'Data Privacy', jurisdiction: 'UK', risk: 'Medium', status: 'Active', matchRate: 79 },
  { id: 'p9', provider: 'Sentinel KYC Services', domain: 'AML / KYC', jurisdiction: 'DE', risk: 'Low', status: 'Active', matchRate: 93 },
  { id: 'p10', provider: 'Greenfield ESG', domain: 'ESG', jurisdiction: 'SE', risk: 'High', status: 'Suspended', matchRate: 58 },
  { id: 'p11', provider: 'Pinnacle Tax Bureau', domain: 'Tax & VAT', jurisdiction: 'IT', risk: 'Medium', status: 'Pending', matchRate: 81 },
  { id: 'p12', provider: 'Orion Audit & Co.', domain: 'Audit', jurisdiction: 'ES', risk: 'Low', status: 'Active', matchRate: 87 },
];

// Inline colored pills — deliberately not importing other components.
const RISK_PILL: Record<ProviderRow['risk'], string> = {
  Low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  Medium: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  High: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
};
const STATUS_PILL: Record<ProviderRow['status'], string> = {
  Active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  Pending: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  Suspended: 'bg-neutral-200 text-neutral-600 dark:bg-white/10 dark:text-neutral-300',
};
const pill = 'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold';

const columns: DataTableColumn<ProviderRow>[] = [
  { key: 'provider', header: 'Provider', sortable: true },
  { key: 'domain', header: 'Domain' },
  { key: 'jurisdiction', header: 'Jurisdiction', align: 'center' },
  {
    key: 'risk',
    header: 'Risk',
    render: (r) => <span className={`${pill} ${RISK_PILL[r.risk]}`}>{r.risk}</span>,
  },
  {
    key: 'status',
    header: 'Status',
    render: (r) => <span className={`${pill} ${STATUS_PILL[r.status]}`}>{r.status}</span>,
  },
  {
    key: 'matchRate',
    header: 'Match %',
    sortable: true,
    numeric: true,
    render: (r) => `${r.matchRate}%`,
  },
];

function Demo() {
  const [selection, setSelection] = useState<string[]>([]);
  return (
    <div className="space-y-3">
      <p className="text-[13px] text-fg-secondary">
        {selection.length > 0 ? `${selection.length} provider(s) selected` : 'No providers selected'}
      </p>
      <DataTable<ProviderRow>
        columns={columns}
        data={ROWS}
        rowKey={(r) => r.id}
        pageSize={5}
        selectable
        onSelectionChange={setSelection}
      />
    </div>
  );
}

export const Light: Story = {
  render: () => (
    <div className="bg-neutral-50 p-6">
      <Demo />
    </div>
  ),
};

export const Dark: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div className="dark min-h-screen bg-[#1F2937] p-8">
      <Demo />
    </div>
  ),
};

export const LoadingAndEmpty: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div className="space-y-10">
      <div className="bg-neutral-50 p-6">
        <p className="mb-3 text-[13px] font-semibold text-fg">Loading</p>
        <DataTable<ProviderRow> columns={columns} data={[]} rowKey={(r) => r.id} loading />
      </div>
      <div className="bg-neutral-50 p-6">
        <p className="mb-3 text-[13px] font-semibold text-fg">Empty</p>
        <DataTable<ProviderRow> columns={columns} data={[]} rowKey={(r) => r.id} />
      </div>
      <div className="dark bg-[#1F2937] p-8">
        <p className="mb-3 text-[13px] font-semibold text-fg">Loading (dark)</p>
        <DataTable<ProviderRow> columns={columns} data={[]} rowKey={(r) => r.id} loading />
      </div>
      <div className="dark bg-[#1F2937] p-8">
        <p className="mb-3 text-[13px] font-semibold text-fg">Empty (dark)</p>
        <DataTable<ProviderRow> columns={columns} data={[]} rowKey={(r) => r.id} />
      </div>
    </div>
  ),
};
