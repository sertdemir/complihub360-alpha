import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Table, THead, TBody, TR, TH, TD } from './Table';
import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { RiskBadge } from './RiskBadge';

const DESCRIPTION = `
**Table** — composable data table mirroring the Compass Table family (788/794/796/801):
\`Table · THead · TBody · TR · TH · TD\`. Header = secondary-bg 11px uppercase label; cells
= 13px. **Numeric** cells right-align with tabular figures. **Sortable** headers, \`striped\`
layout, \`density\` (default/compact), selectable rows. Composes Avatar · Badge · RiskBadge
for rich cells. Ships **light + dark** (dark uses static row tints over the app slate).
`;

const meta = {
  title: 'Organisms/Table',
  component: Table,
  parameters: { layout: 'padded', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
  argTypes: {
    density: { control: 'radio', options: ['default', 'compact'] },
    striped: { control: 'boolean' },
  },
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

const ROWS = [
  { id: 'p1', name: 'Dahlmann CPA', initials: 'GD', match: 94, risk: 'low', status: 'Active' },
  { id: 'p2', name: 'Müller & Partner', initials: 'MP', match: 88, risk: 'medium', status: 'Active' },
  { id: 'p3', name: 'Nordic Tax AB', initials: 'NT', match: 81, risk: 'medium', status: 'Pending' },
  { id: 'p4', name: 'Iberia Compliance', initials: 'IC', match: 76, risk: 'high', status: 'Paused' },
] as const;

const STATUS_TONE = { Active: 'success', Pending: 'info', Paused: 'warning' } as const;

function ProviderTable({ density = 'default', striped = false }: { density?: 'default' | 'compact'; striped?: boolean }) {
  const [selected, setSelected] = useState<string | null>('p1');
  const [sort, setSort] = useState<'asc' | 'desc'>('desc');
  const rows = [...ROWS].sort((a, b) => (sort === 'desc' ? b.match - a.match : a.match - b.match));
  return (
    <Table density={density} striped={striped}>
      <THead>
        <TR>
          <TH>Provider</TH>
          <TH numeric sort={sort} onSort={() => setSort((s) => (s === 'desc' ? 'asc' : 'desc'))}>
            Match
          </TH>
          <TH>Risk</TH>
          <TH>Status</TH>
        </TR>
      </THead>
      <TBody>
        {rows.map((r) => (
          <TR key={r.id} selected={selected === r.id} onClick={() => setSelected(r.id)} className="cursor-pointer">
            <TD>
              <span className="flex items-center gap-2.5">
                <Avatar size="sm" initials={r.initials} />
                <span className="font-medium">{r.name}</span>
              </span>
            </TD>
            <TD numeric bold>{r.match}%</TD>
            <TD>
              <RiskBadge level={r.risk} size="sm">
                {r.risk}
              </RiskBadge>
            </TD>
            <TD>
              <Badge tone={STATUS_TONE[r.status]} appearance="soft" size="sm" dot>
                {r.status}
              </Badge>
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

export const Default: Story = {
  args: { children: null as never },
  render: (args) => <ProviderTable density={args.density} striped={args.striped} />,
};

export const Striped: Story = {
  args: { children: null as never },
  parameters: { controls: { disable: true } },
  render: () => <ProviderTable striped />,
};

export const Compact: Story = {
  args: { children: null as never },
  parameters: { controls: { disable: true } },
  render: () => <ProviderTable density="compact" />,
};

export const Dark: Story = {
  args: { children: null as never },
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="dark rounded-xl bg-[#1F2937] p-6">
      <ProviderTable striped />
    </div>
  ),
};
