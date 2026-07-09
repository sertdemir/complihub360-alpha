import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Slider } from './Slider';

const DESCRIPTION = `
**Slider** — petrol-filled track with a white surface thumb, mirroring Compass
\`539:110\`. Single + range modes, sizes sm·md·lg, keyboard (arrows / Home / End)
and pointer dragging, optional value label, disabled state. Ships **light + dark**.
`;

const meta = {
  title: 'Atoms/Slider',
  component: Slider,
  parameters: { layout: 'padded', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof Slider>;

function SingleDemo({ size }: { size: 'sm' | 'md' | 'lg' }) {
  const [v, setV] = useState<number>(60);
  return (
    <div className="w-[280px]">
      <div className="mb-1 text-[12px] uppercase tracking-wide text-fg-secondary">{size}</div>
      <Slider
        size={size}
        value={v}
        onChange={(n) => setV(n as number)}
        aria-label={`${size} slider`}
      />
    </div>
  );
}

function RangeDemo() {
  const [v, setV] = useState<[number, number]>([25, 75]);
  return (
    <div className="w-[280px]">
      <div className="mb-1 text-[12px] uppercase tracking-wide text-fg-secondary">Range</div>
      <Slider range value={v} onChange={(n) => setV(n as [number, number])} aria-label="range" />
    </div>
  );
}

function ShowValueDemo() {
  const [v, setV] = useState<number>(40);
  return (
    <div className="w-[280px]">
      <Slider showValue value={v} onChange={(n) => setV(n as number)} aria-label="with value" />
    </div>
  );
}

const Demo = () => (
  <div className="flex flex-col gap-7">
    <SingleDemo size="sm" />
    <SingleDemo size="md" />
    <SingleDemo size="lg" />
    <RangeDemo />
    <ShowValueDemo />
    <div className="w-[280px]">
      <div className="mb-1 text-[12px] uppercase tracking-wide text-fg-secondary">Disabled</div>
      <Slider disabled defaultValue={50} aria-label="disabled" />
    </div>
  </div>
);

export const Light: Story = { render: () => <div className="bg-neutral-50 p-6">{Demo()}</div> };
export const Dark: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <div className="dark min-h-screen bg-[#1F2937] p-8">{Demo()}</div>,
};
