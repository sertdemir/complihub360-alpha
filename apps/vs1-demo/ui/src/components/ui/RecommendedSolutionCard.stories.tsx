import type { Meta, StoryObj } from '@storybook/react';
import { RecommendedSolutionCard } from './RecommendedSolutionCard';

const DESCRIPTION = `
The wizard **RESULT hero**. After the matching wizard runs, the single best-matched
provider/solution is surfaced in this elevated, gold-trimmed card: a "RECOMMENDED"
eyebrow, the provider identity (Avatar + name + verified badge), a large brand
**match %**, domain tags, a why-recommended rationale, a small facts row, and a
footer with primary **Request engagement** + ghost **View profile**.
Composes \`Card\`, \`Avatar\`, \`Badge\`, \`Tag\`, \`Button\`, \`PartnerStatusBadge\`. Light + dark.
`;

const meta = {
  title: 'Organisms/Recommended Solution Card',
  component: RecommendedSolutionCard,
  parameters: { layout: 'padded', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
} satisfies Meta<typeof RecommendedSolutionCard>;
export default meta;
type Story = StoryObj<typeof RecommendedSolutionCard>;

const Demo = () => (
  <div className="mx-auto max-w-lg">
    <RecommendedSolutionCard
      provider={{ name: 'Helios Tax Partners', initials: 'HT' }}
      matchRate={94}
      verified
      domains={['Tax & VAT', 'GDPR']}
      rationale="Strong fit for your tax & data-protection needs — Helios specialises in cross-border VAT for SaaS and holds an active GDPR mandate practice."
      facts={[
        { label: 'Response time', value: '~2h' },
        { label: 'Starting from', value: '€1,200/mo' },
        { label: 'Engagements', value: '120+' },
      ]}
      onRequest={() => {}}
      onViewProfile={() => {}}
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
