import type { Meta, StoryObj } from '@storybook/react';
import { Toggle } from './Toggle';

const DESCRIPTION = `
**Toggle** (Switch) — native checkbox with \`role="switch"\`: grey track off, petrol
on, white thumb. Sizes sm·md·lg, optional label, error + disabled states. Ships **light + dark**.
`;

const meta = {
  title: 'Atoms/Toggle',
  component: Toggle,
  parameters: { layout: 'padded', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof Toggle>;

const Demo = () => (
  <div className="flex flex-col gap-2">
    <Toggle defaultChecked label="Email notifications" />
    <Toggle label="Browser push" />
    <Toggle disabled label="SMS (coming soon)" />
  </div>
);

export const Light: Story = { render: () => <div className="bg-neutral-50 p-6">{Demo()}</div> };
export const Dark: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <div className="dark min-h-screen bg-[#1F2937] p-8">{Demo()}</div>,
};
