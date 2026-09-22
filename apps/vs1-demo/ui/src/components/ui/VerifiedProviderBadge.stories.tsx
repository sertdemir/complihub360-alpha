import type { Meta, StoryObj } from '@storybook/react';
import { VerifiedProviderBadge } from './VerifiedProviderBadge';

const DESCRIPTION = `
A brand trust badge for **verified providers** (Molecule). A thin wrapper around
**PartnerStatusBadge** (\`status="verified"\` → the gold mark is the trust signal),
There is exactly one tier — verification is a fact, not a purchasable level
(ADR-0003). Pass \`label\` to override. Light + dark.
`;

const meta = {
  title: 'Molecules/Verified Provider Badge',
  component: VerifiedProviderBadge,
  parameters: { layout: 'padded', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
} satisfies Meta<typeof VerifiedProviderBadge>;
export default meta;
type Story = StoryObj<typeof VerifiedProviderBadge>;

const Demo = () => (
  <div className="flex flex-wrap items-center gap-3">
    <VerifiedProviderBadge />
    <VerifiedProviderBadge label="Verified Provider · DE" />
  </div>
);

export const Light: Story = { render: () => <div className="bg-neutral-50 p-6">{Demo()}</div> };
export const Dark: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <div className="dark min-h-screen bg-[#1F2937] p-8">{Demo()}</div>,
};
