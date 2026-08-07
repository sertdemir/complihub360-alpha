import type { Meta, StoryObj } from '@storybook/react';
import { AlternativeOptionCard } from './AlternativeOptionCard';
import { PartnerStatusBadge } from './ProviderBadges';

const DESCRIPTION = `
The lighter **"also consider"** row on the wizard RESULT screen. Sits in a list
under the \`RecommendedSolutionCard\` hero. Interactive (hover + click): provider
identity (Avatar + name + meta) on the left, **match %** + chevron on the right,
with an optional trailing badge slot. Composes \`Card\` + \`Avatar\`. Light + dark.
`;

const meta = {
  title: 'Organisms/Alternative Option Card',
  component: AlternativeOptionCard,
  parameters: { layout: 'padded', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
} satisfies Meta<typeof AlternativeOptionCard>;
export default meta;
type Story = StoryObj<typeof AlternativeOptionCard>;

const Demo = () => (
  <div className="mx-auto flex max-w-lg flex-col gap-3">
    <AlternativeOptionCard
      provider={{ name: 'Northgate Compliance', initials: 'NC' }}
      matchRate={88}
      meta="Tax & VAT · DE · responds in 4h"
      badge={<PartnerStatusBadge status="verified" />}
      onClick={() => {}}
    />
    <AlternativeOptionCard
      provider={{ name: 'Lumen Data Advisors', initials: 'LD' }}
      matchRate={81}
      meta="GDPR · EU-wide · responds in 1 day"
      onClick={() => {}}
    />
    <AlternativeOptionCard
      provider={{ name: 'Brückner & Co.', initials: 'BC' }}
      matchRate={76}
      meta="Tax & VAT · AT · responds in 6h"
      badge={<PartnerStatusBadge status="pending" />}
      onClick={() => {}}
    />
  </div>
);

export const Light: Story = {
  render: () => <div className="bg-neutral-50 p-6">{Demo()}</div>,
};

export const Dark: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <div className="dark min-h-screen bg-[#1F2937] p-8">{Demo()}</div>,
};
