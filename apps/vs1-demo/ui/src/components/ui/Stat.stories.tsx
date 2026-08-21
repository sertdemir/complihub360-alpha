import type { Meta, StoryObj } from '@storybook/react';
import { Stat } from './Stat';
import { Card } from './Card';

const DESCRIPTION = `
**Stat / Metric** — a single KPI: eyebrow \`label\`, a large tabular \`value\`, and an
optional \`trend\` chip (▲ success · ▼ error · – neutral) with a caption, or a plain
\`hint\`. Layout-only, so it composes into Cards (metric tiles) or rows (performance
strips). \`size\` = sm · md · lg.

This is a **neutral metric**, not a risk signal — risk stays on the RiskBadge
\`RiskBadge\` traffic light.
`;

const meta = {
  title: 'Molecules/Stat',
  component: Stat,
  parameters: {
    layout: 'centered',
    docs: { description: { component: DESCRIPTION } },
  },
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'radio', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof Stat>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  args: {
    label: 'Match rate',
    value: '94%',
    trend: { value: '+12%', direction: 'up', label: 'vs. last month' },
    size: 'md',
  },
};

export const TrendDirections: Story = {
  args: { value: '', label: '' },
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap gap-12">
      <Stat label="Match rate" value="94%" trend={{ value: '+12%', direction: 'up', label: 'vs. last month' }} />
      <Stat label="Avg. response" value="2.4h" trend={{ value: '-8%', direction: 'down', label: 'vs. last month' }} />
      <Stat label="Open leads" value="18" trend={{ value: '0%', direction: 'neutral', label: 'no change' }} />
    </div>
  ),
};

export const Sizes: Story = {
  args: { value: '', label: '' },
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-end gap-12">
      <Stat size="sm" label="Sessions" value="1,204" hint="last 30 days" />
      <Stat size="md" label="Sessions" value="1,204" hint="last 30 days" />
      <Stat size="lg" label="Sessions" value="1,204" hint="last 30 days" />
    </div>
  ),
};

export const MetricTiles: Story = {
  args: { value: '', label: '' },
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => (
    <div className="grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
      {[
        { label: 'Match rate', value: '94%', trend: { value: '+12%', direction: 'up' as const, label: 'MoM' } },
        { label: 'Active clients', value: '37', trend: { value: '+4', direction: 'up' as const, label: 'this month' } },
        { label: 'Avg. response', value: '2.4h', trend: { value: '-8%', direction: 'down' as const, label: 'faster' } },
      ].map((m) => (
        <Card key={m.label} className="p-5">
          <Stat {...m} />
        </Card>
      ))}
    </div>
  ),
};

export const Dark: Story = {
  args: { value: '', label: '' },
  parameters: { layout: 'fullscreen', controls: { disable: true } },
  render: () => (
    <div className="dark flex flex-wrap gap-12 bg-[#1F2937] p-8">
      <Stat label="Match rate" value="94%" trend={{ value: '+12%', direction: 'up', label: 'vs. last month' }} />
      <Stat label="Avg. response" value="2.4h" trend={{ value: '-8%', direction: 'down', label: 'vs. last month' }} />
      <Stat label="Open leads" value="18" trend={{ value: '0%', direction: 'neutral', label: 'no change' }} />
    </div>
  ),
};
