import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { DatePicker } from './DatePicker';

const DESCRIPTION = `
A **DatePicker** molecule — a trigger button (calendar icon + formatted date or
placeholder + chevron) that opens a floating month-grid popover. Reuses the
\`SelectMenu\` interaction model: floating popover, outside-click close, keyboard
nav (Enter/Space/↓ to open · arrows to move by day/week · Enter selects · Esc
closes) and ARIA. Selected day is a gold pill, today is ringed, out-of-month days
dim, and days outside \`min\`/\`max\` are disabled. Light + dark.
`;

const meta = {
  title: 'Molecules/DatePicker',
  component: DatePicker,
  parameters: { layout: 'padded', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
} satisfies Meta<typeof DatePicker>;
export default meta;
type Story = StoryObj<typeof DatePicker>;

const Demo = ({ open }: { open?: boolean }) => {
  const [date, setDate] = React.useState<Date | undefined>(undefined);
  const min = new Date();
  min.setMonth(min.getMonth() - 1);
  const max = new Date();
  max.setMonth(max.getMonth() + 3);
  return (
    <div className="max-w-sm space-y-6">
      <div className="space-y-1.5">
        <span className="block text-[14px] font-medium text-fg">Filing date</span>
        <DatePicker value={date} onChange={setDate} defaultOpen={open} placeholder="Select date" />
        <span className="block text-[12px] text-fg-tertiary">
          {date ? `Selected: ${date.toLocaleDateString()}` : 'No date selected yet.'}
        </span>
      </div>

      <div className="space-y-1.5">
        <span className="block text-[14px] font-medium text-fg">Bounded (±range)</span>
        <DatePicker defaultValue={new Date()} min={min} max={max} />
      </div>

      <div className="space-y-1.5">
        <span className="block text-[14px] font-medium text-fg">Sizes</span>
        <DatePicker inputSize="sm" placeholder="Small" />
        <DatePicker inputSize="md" placeholder="Medium" />
        <DatePicker inputSize="lg" placeholder="Large" />
      </div>

      <div className="space-y-1.5">
        <span className="block text-[14px] font-medium text-fg">Disabled</span>
        <DatePicker disabled defaultValue={new Date()} />
      </div>
    </div>
  );
};

export const Light: Story = { render: () => <div className="bg-neutral-50 p-6">{Demo({})}</div> };

export const Dark: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <div className="dark min-h-screen bg-[#1F2937] p-8">{Demo({})}</div>,
};

// defaultOpen variants so the calendar grid is visible in docs/screenshots.
export const OpenLight: Story = {
  render: () => <div className="min-h-[480px] bg-neutral-50 p-6">{Demo({ open: true })}</div>,
};

export const OpenDark: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <div className="dark min-h-[560px] bg-[#1F2937] p-8">{Demo({ open: true })}</div>,
};
