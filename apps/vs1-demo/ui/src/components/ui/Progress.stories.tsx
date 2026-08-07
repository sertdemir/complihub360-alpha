import type { Meta, StoryObj } from '@storybook/react';
import { ProgressBar, Spinner, CircleProgress } from './Progress';

const DESCRIPTION = `
The Compass **Progress** indicators (536:2): **ProgressBar** (petrol fill on a neutral
track), **Spinner** and **CircleProgress**. (Stepper and Pagination have their own
Molecule stories.) All **light + dark**.
`;

const meta = {
  title: 'Atoms/Progress',
  parameters: { layout: 'padded', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
} satisfies Meta;
export default meta;
type Story = StoryObj;

const Demo = () => (
  <div className="max-w-2xl space-y-10">
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-tertiary">Progress bar — sizes</p>
      <ProgressBar value={35} size="sm" />
      <ProgressBar value={70} size="md" />
      <ProgressBar value={90} size="lg" />
    </div>
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-tertiary">Colors</p>
      <ProgressBar value={60} color="brand" />
      <ProgressBar value={60} color="success" />
      <ProgressBar value={60} color="warning" />
      <ProgressBar value={60} color="error" />
      <ProgressBar value={60} color="info" />
    </div>
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-tertiary">Indeterminate</p>
      <ProgressBar indeterminate color="brand" />
      <ProgressBar indeterminate color="info" size="lg" />
    </div>
    <div className="flex items-center gap-10">
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-fg-tertiary">Spinner</p>
        <div className="flex items-center gap-4">
          <Spinner size={16} />
          <Spinner size={24} />
          <Spinner size={32} />
        </div>
      </div>
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-fg-tertiary">Circle</p>
        <div className="flex items-center gap-4">
          <CircleProgress value={72} />
          <CircleProgress value={40} size={56} label="40%" />
        </div>
      </div>
    </div>
  </div>
);

export const Light: Story = { render: () => <div className="bg-neutral-50 p-6">{Demo()}</div> };
export const Dark: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <div className="dark min-h-screen bg-[#1F2937] p-8">{Demo()}</div>,
};
