import type { Meta, StoryObj } from '@storybook/react';
import { ChevronRight } from 'lucide-react';
import { KPICard, AuditCard, EntityCard } from './Cards';
import { Avatar } from './Avatar';
import { Badge } from './Badge';

const DESCRIPTION = `
The Compass **Cards** family (663:2): **KPICard** (metric tile), **AuditCard** (compliance
item — risk + status), **EntityCard** (provider/company row). Compositions over the base
\`Card\` + Stat / RiskBadge / Avatar / Badge. All **light + dark**.
`;

const meta = {
  title: 'Molecules/Cards',
  parameters: { layout: 'padded', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj;

const Demo = () => (
  <div className="max-w-4xl space-y-8">
    <div className="grid gap-4 sm:grid-cols-3">
      <KPICard label="Match rate" value="94%" trend={{ value: '+12%', direction: 'up', label: 'MoM' }} />
      <KPICard label="Active clients" value="37" trend={{ value: '+4', direction: 'up', label: 'this month' }} />
      <KPICard label="Avg. response" value="2.4h" trend={{ value: '-8%', direction: 'down', label: 'faster' }} />
      <KPICard label="Loading…" value="" loading />
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <AuditCard
        risk="high"
        status="Open"
        statusTone="warning"
        title="VAT registration · Italy"
        description="Distance-selling threshold reached. Registration required before next shipment."
        date="Updated 2h ago"
      />
      <AuditCard
        risk="low"
        status="Confirmed"
        statusTone="success"
        title="GDPR audit · Germany"
        description="Data-processing agreement in place. No action needed this quarter."
        date="Updated 3d ago"
      />
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <EntityCard
        interactive
        avatar={<Avatar size="md" initials="GD" />}
        name="Dahlmann CPA"
        meta="Tax & VAT · DE · 94% match"
        badge={<Badge tone="success" appearance="soft" size="sm">Verified</Badge>}
        trailing={<ChevronRight size={18} className="text-fg-tertiary" />}
      />
      <EntityCard
        interactive
        unread
        avatar={<Avatar size="md" initials="MP" />}
        name="Müller & Partner"
        meta="New message · EPR · DE"
        badge={<Badge tone="brand" appearance="soft" size="sm">Unread</Badge>}
        trailing={<ChevronRight size={18} className="text-fg-tertiary" />}
      />
    </div>
  </div>
);

export const Light: Story = { render: () => <div className="bg-neutral-50 p-6">{Demo()}</div> };
export const Dark: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <div className="dark min-h-screen bg-[#1F2937] p-8">{Demo()}</div>,
};
