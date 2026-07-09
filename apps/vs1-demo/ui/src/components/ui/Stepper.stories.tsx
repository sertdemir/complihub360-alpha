import type { Meta, StoryObj } from '@storybook/react';
import { Stepper } from './Stepper';

const DESCRIPTION = `
**Stepper** mirrors the Compass Wizard / Onboarding steps: completed = petrol + check,
active = petrol + number, upcoming = neutral outline. Supports **horizontal** and
**vertical** orientation. Ships **light + dark**.
`;

const meta = {
  title: 'Molecules/Stepper',
  component: Stepper,
  parameters: { layout: 'padded', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
} satisfies Meta<typeof Stepper>;

export default meta;
type Story = StoryObj<typeof Stepper>;

const STEPS = [
  { label: 'Markets' },
  { label: 'Operations' },
  { label: 'Domains' },
  { label: 'Risk' },
  { label: 'Review' },
];

// Step 2 (Domains) failed validation; step 5 (Review) is not yet available.
const STEPS_WITH_ERROR = [
  { label: 'Markets' },
  { label: 'Operations' },
  { label: 'Domains', state: 'error' as const },
  { label: 'Risk' },
  { label: 'Review', state: 'disabled' as const },
];

const Demo = () => (
  <div className="max-w-2xl space-y-10">
    <div>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-fg-tertiary">Horizontal</p>
      <Stepper steps={STEPS} current={2} />
    </div>
    <div>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-fg-tertiary">Error + disabled step</p>
      <Stepper steps={STEPS_WITH_ERROR} current={3} />
    </div>
    <div className="space-y-6">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-tertiary">Sizes (sm · md · lg)</p>
      {(['sm', 'md', 'lg'] as const).map((sz) => (
        <Stepper key={sz} steps={STEPS} current={2} size={sz} />
      ))}
    </div>
    <div>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-fg-tertiary">Vertical</p>
      <Stepper steps={STEPS} current={2} orientation="vertical" />
    </div>
  </div>
);

export const Light: Story = { render: () => <div className="bg-neutral-50 p-6">{Demo()}</div> };
export const Dark: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <div className="dark min-h-screen bg-[#1F2937] p-8">{Demo()}</div>,
};
