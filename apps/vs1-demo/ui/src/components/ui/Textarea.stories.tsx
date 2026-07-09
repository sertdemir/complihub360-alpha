import type { Meta, StoryObj } from '@storybook/react';
import { Textarea } from './Textarea';

const DESCRIPTION = `
**Textarea** — multi-line text input with sizes sm·md·lg, styles outlined / filled,
and error + disabled states, all driven by mode-aware tokens. Ships **light + dark**.
`;

const meta = {
  title: 'Atoms/Textarea',
  component: Textarea,
  parameters: { layout: 'padded', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof Textarea>;

const Demo = () => (
  <div className="max-w-md space-y-5">
    <div className="space-y-1.5">
      <label htmlFor="notes" className="text-[13px] font-medium text-fg">Notes</label>
      <Textarea id="notes" placeholder="Anything the provider should know…" />
    </div>
    <div className="space-y-1.5">
      <label htmlFor="ctx" className="text-[13px] font-medium text-fg">Context (filled)</label>
      <Textarea id="ctx" variant="filled" placeholder="Add additional context…" />
    </div>
    <div className="space-y-1.5">
      <label htmlFor="ro" className="text-[13px] font-medium text-fg">Locked</label>
      <Textarea id="ro" disabled defaultValue="This field is currently unavailable." />
    </div>
  </div>
);

export const Light: Story = { render: () => <div className="bg-neutral-50 p-6">{Demo()}</div> };
export const Dark: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <div className="dark min-h-screen bg-[#1F2937] p-8">{Demo()}</div>,
};
