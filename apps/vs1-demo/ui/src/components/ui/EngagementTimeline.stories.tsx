import type { Meta, StoryObj } from '@storybook/react';
import { EngagementTimeline } from './EngagementTimeline';

const DESCRIPTION = `
**EngagementTimeline** is a vertical timeline of engagement / compliance events. It
shares the Compass Stepper indicator language: **done** = brand + white check,
**current** = brand + ring, **upcoming** = neutral outline. A vertical connector
links each item; the last item has no trailing connector. Ships **light + dark**.
`;

const meta = {
  title: 'Molecules/Engagement Timeline',
  component: EngagementTimeline,
  parameters: { layout: 'padded', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
} satisfies Meta<typeof EngagementTimeline>;

export default meta;
type Story = StoryObj<typeof EngagementTimeline>;

const ITEMS = [
  {
    title: 'Request sent',
    timestamp: 'Mar 12, 2026 · 09:14',
    description: 'Engagement request submitted to the matched VAT provider.',
    status: 'done' as const,
  },
  {
    title: 'Provider accepted',
    timestamp: 'Mar 12, 2026 · 14:02',
    description: 'Steuerkanzlei Berger confirmed availability and scope.',
    status: 'done' as const,
  },
  {
    title: 'Documents shared',
    timestamp: 'Mar 13, 2026 · 10:41',
    description: 'Prior-year filings and registration details exchanged securely.',
    status: 'done' as const,
  },
  {
    title: 'Kickoff call',
    timestamp: 'Mar 14, 2026 · 11:00',
    description: 'Scope, timeline and responsibilities aligned.',
    status: 'current' as const,
  },
  {
    title: 'Delivery',
    timestamp: 'Expected Mar 28, 2026',
    description: 'Final filing prepared and submitted.',
    status: 'upcoming' as const,
  },
];

const Demo = () => (
  <div className="max-w-md">
    <EngagementTimeline items={ITEMS} />
  </div>
);

export const Light: Story = { render: () => <div className="bg-neutral-50 p-6">{Demo()}</div> };
export const Dark: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <div className="dark min-h-screen bg-[#1F2937] p-8">{Demo()}</div>,
};
