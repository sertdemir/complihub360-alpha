import type { Meta, StoryObj } from '@storybook/react';
import { Tag } from './Tag';

const DESCRIPTION = `
The Compass **Tag** (Badge page, 516:2). A pill label — like Badge but always
\`rounded-full\`, with an optional leading node and a removable ✕. Six tones
(neutral · brand · success · warning · error · info). Light + dark.
`;

const meta = {
  title: 'Atoms/Tag',
  component: Tag,
  parameters: { layout: 'padded', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
} satisfies Meta<typeof Tag>;
export default meta;
type Story = StoryObj<typeof Tag>;

const Demo = () => (
  <div className="flex flex-wrap gap-2">
    <Tag>Default</Tag>
    <Tag tone="brand">Tax &amp; VAT</Tag>
    <Tag tone="success">94% match</Tag>
    <Tag tone="warning">Action needed</Tag>
    <Tag tone="error">Overdue</Tag>
    <Tag tone="info">Beta</Tag>
    <Tag tone="brand" onRemove={() => {}}>Removable</Tag>
  </div>
);

export const Light: Story = { render: () => <div className="bg-neutral-50 p-6">{Demo()}</div> };
export const Dark: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <div className="dark min-h-screen bg-[#1F2937] p-8">{Demo()}</div>,
};
