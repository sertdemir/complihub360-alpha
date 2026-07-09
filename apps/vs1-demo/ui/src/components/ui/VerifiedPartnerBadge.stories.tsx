import type { Meta, StoryObj } from '@storybook/react';
import { VerifiedPartnerBadge } from './VerifiedPartnerBadge';

const DESCRIPTION = `
A brand trust badge for **verified partners** (Molecule). A thin wrapper around
**PartnerStatusBadge** (\`status="verified"\` → the gold mark is the trust signal),
adding tier-specific labels: **Verified** · **Gold** · **Platinum** partner.
Pass \`label\` to override. Light + dark.
`;

const meta = {
  title: 'Molecules/Verified Partner Badge',
  component: VerifiedPartnerBadge,
  parameters: { layout: 'padded', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
} satisfies Meta<typeof VerifiedPartnerBadge>;
export default meta;
type Story = StoryObj<typeof VerifiedPartnerBadge>;

const Demo = () => (
  <div className="flex flex-wrap items-center gap-3">
    <VerifiedPartnerBadge tier="verified" />
    <VerifiedPartnerBadge tier="gold" />
    <VerifiedPartnerBadge tier="platinum" />
  </div>
);

export const Light: Story = { render: () => <div className="bg-neutral-50 p-6">{Demo()}</div> };
export const Dark: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <div className="dark min-h-screen bg-[#1F2937] p-8">{Demo()}</div>,
};
