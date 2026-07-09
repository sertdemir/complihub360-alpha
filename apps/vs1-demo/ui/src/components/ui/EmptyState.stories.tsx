import type { Meta, StoryObj } from '@storybook/react';
import { Inbox } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { Button } from './Button';

const DESCRIPTION = `
**EmptyState** centers an icon, a title, a description, and an optional action — the
canonical zero-data placeholder for lists and panels. Ships **light + dark**.
`;

const meta = {
  title: 'Molecules/EmptyState',
  component: EmptyState,
  parameters: { layout: 'padded', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof EmptyState>;

const Demo = () => (
  <div className="rounded-xl border border-stroke bg-surface">
    <EmptyState
      icon={<Inbox size={28} />}
      title="No requests yet"
      description="When a provider responds to your engagement, it shows up here."
      action={<Button>Start your assessment</Button>}
    />
  </div>
);

export const Light: Story = { render: () => <div className="bg-neutral-50 p-6">{Demo()}</div> };
export const Dark: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <div className="dark min-h-screen bg-[#1F2937] p-8">{Demo()}</div>,
};
