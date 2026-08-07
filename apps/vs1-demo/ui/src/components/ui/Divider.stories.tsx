import type { Meta, StoryObj } from '@storybook/react';
import { Divider } from './Divider';

const DESCRIPTION = `
**Divider** — horizontal / vertical separator. Variants \`solid · dashed · dotted\`,
color axis \`default · subtle · strong · brand\`, with an optional centered label.
Uses the token borders (\`border-stroke*\`). Ships **light + dark**.
`;

const meta = {
  title: 'Atoms/Divider',
  component: Divider,
  parameters: { layout: 'padded', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
} satisfies Meta<typeof Divider>;

export default meta;
type Story = StoryObj<typeof Divider>;

const Demo = () => (
  <div className="max-w-xl space-y-5">
    <div className="space-y-3">
      <span className="text-body-sm text-fg-secondary">Variants</span>
      <Divider variant="solid" />
      <Divider variant="dashed" />
      <Divider variant="dotted" />
    </div>

    <div className="space-y-3">
      <span className="text-body-sm text-fg-secondary">Colors</span>
      <Divider color="default" />
      <Divider color="subtle" />
      <Divider color="strong" />
      <Divider color="brand" />
    </div>

    <Divider label="OR" />

    <div className="flex h-8 items-center gap-3 text-body-sm text-fg-secondary">
      <span>Left</span>
      <Divider orientation="vertical" />
      <span>Mid</span>
      <Divider orientation="vertical" variant="dotted" color="brand" />
      <span>Right</span>
    </div>
  </div>
);

export const Light: Story = { render: () => <div className="bg-neutral-50 p-6">{Demo()}</div> };
export const Dark: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <div className="dark min-h-screen bg-[#1F2937] p-8">{Demo()}</div>,
};
