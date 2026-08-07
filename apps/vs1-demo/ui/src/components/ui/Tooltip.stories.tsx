import type { Meta, StoryObj } from '@storybook/react';
import { Info } from 'lucide-react';
import { Tooltip } from './Tooltip';
import { Button } from './Button';

const DESCRIPTION = `
**Tooltip** — inverse bubble (dark on light, light on dark) plus a small arrow,
shown on hover / focus. Sides top·bottom·left·right, sizes \`sm·md·lg\`, and an
optional bold \`title\` for the "With Title" / "Rich" type. Ships **light + dark**.
`;

const meta = {
  title: 'Atoms/Tooltip',
  component: Tooltip,
  parameters: { layout: 'padded', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof Tooltip>;

const Demo = () => (
  <div className="flex flex-col gap-10">
    <div className="flex flex-col gap-2">
      <span className="text-body-sm text-fg-secondary">Sides</span>
      <div className="flex gap-6">
        <Tooltip content="Top tooltip" side="top"><Button variant="secondary">Top</Button></Tooltip>
        <Tooltip content="Right tooltip" side="right"><Button variant="secondary">Right</Button></Tooltip>
        <Tooltip content="Saved 2h ago" side="bottom">
          <span className="inline-flex items-center gap-1 text-body-sm text-fg-secondary"><Info size={15} /> Hover me</span>
        </Tooltip>
      </div>
    </div>

    <div className="flex flex-col gap-2">
      <span className="text-body-sm text-fg-secondary">Sizes</span>
      <div className="flex gap-6">
        <Tooltip content="Small" size="sm"><Button variant="secondary">SM</Button></Tooltip>
        <Tooltip content="Medium" size="md"><Button variant="secondary">MD</Button></Tooltip>
        <Tooltip content="Large" size="lg"><Button variant="secondary">LG</Button></Tooltip>
      </div>
    </div>

    <div className="flex flex-col gap-2">
      <span className="text-body-sm text-fg-secondary">With Title / Rich</span>
      <div className="flex gap-6">
        <Tooltip title="Keyboard shortcut" content="Press ⌘K to open the command palette." side="bottom">
          <Button variant="secondary">With Title</Button>
        </Tooltip>
        <Tooltip
          title="Audit retention"
          content="Records are kept for 7 years to satisfy GDPR Art. 5(1)(e) storage-limitation requirements."
          side="right"
          size="lg"
        >
          <Button variant="secondary">Rich</Button>
        </Tooltip>
      </div>
    </div>
  </div>
);

export const Light: Story = { render: () => <div className="bg-neutral-50 p-6">{Demo()}</div> };
export const Dark: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <div className="dark min-h-screen bg-[#1F2937] p-8">{Demo()}</div>,
};
