import type { Meta, StoryObj } from '@storybook/react';
import { SessionRow } from './SessionRow';
import { Button } from './Button';

// Compass "Session Row" (1450:693) — user session list row.
const meta = {
  title: 'Organisms/Session Row',
  component: SessionRow,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta<typeof SessionRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    country: 'IT', domain: 'Tax & VAT', status: 'Needs refresh',
    updated: '· Updated 2h ago', title: 'VAT registration · Italy',
    riskLine: '● High risk · threshold reached · 1 markets', risk: 'high',
    onMenu: () => {}, action: <Button variant="accent" size="sm">Open</Button>,
  },
};

export const ListDark: Story = {
  args: Default.args,
  parameters: { layout: 'fullscreen', controls: { disable: true } },
  render: () => (
    <div className="dark min-h-screen space-y-2.5 bg-[#1F2937] p-8">
      <SessionRow country="IT" domain="Tax & VAT" status="Needs refresh" updated="· Updated 2h ago"
        title="VAT registration · Italy" riskLine="● High risk · threshold reached · 1 markets" risk="high"
        onMenu={() => {}} action={<Button variant="accent" size="sm">Open</Button>} />
      <SessionRow country="FR" domain="Product & Packaging" updated="· Updated 1d ago"
        title="EPR registration · France" riskLine="● Medium risk · deadline Q3 2026 · 1 markets" risk="medium"
        onMenu={() => {}} action={<Button variant="accent" size="sm">Open</Button>} />
      <SessionRow country="ES" domain="Tax & VAT" updated="· Updated 7d ago"
        title="VAT thresholds · Spain" riskLine="● Low risk · monitoring only · 1 markets" risk="low"
        onMenu={() => {}} action={<Button variant="accent" size="sm">Open</Button>} />
    </div>
  ),
};
