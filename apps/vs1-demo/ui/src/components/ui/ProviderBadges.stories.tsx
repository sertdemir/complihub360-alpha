import type { Meta, StoryObj } from '@storybook/react';
import { PartnerStatusBadge, AvailabilityPill } from './ProviderBadges';

const DESCRIPTION = `
The Compass **Provider AppShell extras**: **PartnerStatusBadge** (1014:285) —
Verified = **gold** (the gold mark is the trust signal) · Pending · Suspended —
and **AvailabilityPill** (1014:294) — a live dot status (Available · Busy ·
Offline). Used on provider/partner surfaces. Light + dark.
`;

const meta = {
  title: 'Molecules/Provider Badges',
  parameters: { layout: 'padded', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
} satisfies Meta;
export default meta;
type Story = StoryObj;

const Demo = () => (
  <div className="space-y-6">
    <div>
      <h3 className="mb-3 text-body-sm font-semibold text-fg-tertiary">Partner status</h3>
      <div className="flex flex-wrap items-center gap-3">
        <PartnerStatusBadge status="verified" />
        <PartnerStatusBadge status="pending" />
        <PartnerStatusBadge status="suspended" />
      </div>
    </div>
    <div>
      <h3 className="mb-3 text-body-sm font-semibold text-fg-tertiary">Availability</h3>
      <div className="flex flex-wrap items-center gap-3">
        <AvailabilityPill status="available" />
        <AvailabilityPill status="busy" />
        <AvailabilityPill status="offline" />
      </div>
    </div>
  </div>
);

export const Light: Story = { render: () => <div className="bg-neutral-50 p-6">{Demo()}</div> };
export const Dark: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <div className="dark min-h-screen bg-[#1F2937] p-8">{Demo()}</div>,
};
