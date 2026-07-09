import type { Meta, StoryObj } from '@storybook/react';
import { Skeleton } from './Skeleton';

const DESCRIPTION = `**Skeleton** — pulsing loading placeholder in \`text\`, \`rect\`, and \`circle\` variants. Ships **light + dark** (neutral fill flips on dark surfaces).`;

const meta = {
  title: 'Atoms/Skeleton',
  component: Skeleton,
  parameters: { layout: 'padded', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof Skeleton>;

function Demo() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <span className="text-body-sm text-fg-secondary">Text (3 lines)</span>
        <div className="max-w-[280px]">
          <Skeleton variant="text" lines={3} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-body-sm text-fg-secondary">Rect</span>
        <Skeleton variant="rect" width={200} height={120} />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-body-sm text-fg-secondary">Circle</span>
        <Skeleton variant="circle" width={48} />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-body-sm text-fg-secondary">Card skeleton</span>
        <div className="flex max-w-[280px] flex-col gap-3 rounded-xl border border-stroke p-4">
          <div className="flex items-center gap-3">
            <Skeleton variant="circle" width={40} />
            <div className="flex-1">
              <Skeleton variant="text" lines={2} />
            </div>
          </div>
          <Skeleton variant="rect" height={100} />
        </div>
      </div>
    </div>
  );
}

export const Light: Story = {
  render: () => <div className="bg-neutral-50 p-6">{Demo()}</div>,
};

export const Dark: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div className="dark min-h-screen bg-[#1F2937] p-8">{Demo()}</div>
  ),
};
