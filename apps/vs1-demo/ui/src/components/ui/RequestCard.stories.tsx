import type { Meta, StoryObj } from '@storybook/react';
import { RequestCard } from './RequestCard';
import { Button } from './Button';

// Compass "Request Card" (1444:605) — provider request row: ID+time · status
// pill · company + domain tag + meta · SLA timer · action slot.
const meta = {
  title: 'Organisms/Request Card',
  component: RequestCard,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta<typeof RequestCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    idLine: 'RQ-0234 · 12 min ago',
    status: 'awaiting-confirm',
    company: 'Möbel-Berater Müller GmbH',
    tag: 'DE · EPR',
    meta: 'D2C · €4.2M revenue · target launch Q3 · sells furniture cross-border via own webshop + Amazon DE/AT marketplaces',
    slaValue: '23h 48m',
    action: <Button variant="accent" size="sm">Open · confirm</Button>,
  },
};

export const StatesDark: Story = {
  args: Default.args,
  parameters: { layout: 'fullscreen', controls: { disable: true } },
  render: () => (
    <div className="dark min-h-screen space-y-2.5 bg-[#1F2937] p-8">
      <RequestCard
        idLine="RQ-0234 · 12 min ago" status="awaiting-confirm"
        company="Möbel-Berater Müller GmbH" tag="DE · EPR"
        meta="D2C · €4.2M revenue · target launch Q3 · sells furniture cross-border via own webshop + Amazon DE/AT marketplaces"
        slaValue="23h 48m"
        action={<Button variant="accent" size="sm">Open · confirm</Button>}
      />
      <RequestCard
        idLine="RQ-0228 · Yesterday" status="awaiting-reply"
        company="Brunnen Living Ltd." tag="DE+UK · VAT"
        meta="D2C + Marketplace · €12M revenue · renewing annual VAT advisory retainer · prior engagements 2023+2024"
        slaValue="36h 18m"
        action={<Button size="sm">Reply</Button>}
      />
      <RequestCard
        idLine="RQ-0225 · 4 days ago" status="active"
        company="KraftKaffee GmbH" tag="DE · VAT"
        meta="D2C · €2.4M revenue · quarterly OSS filing in progress · Q2 deadline 2026-07-31"
        action={<Button variant="ghost" size="sm">View</Button>}
      />
    </div>
  ),
};
