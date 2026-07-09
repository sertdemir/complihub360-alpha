import type { Meta, StoryObj } from '@storybook/react';
import { KPICircleCard } from './KPICircleCard';

const DESCRIPTION = `
**KPI Circle Card** — a single compliance KPI carried by a circular progress ring,
with an eyebrow \`label\` and an optional colored \`trend\` pill (▲ up · ▼ down · – neutral).
Mirrors the Compass set 680:415 (Cards page): **Layout** (Horizontal · Centered)
× **Color** (Brand · Success · Warning · Error · Info) × **State** (Default · Disabled).

- \`horizontal\` — ring left, label + trend right (compact tile for KPI rows).
- \`centered\` — label top, big ring center, trend bottom (hero card).

Reuses \`CircleProgress\` for the ring. Error is the **one** place red is sanctioned;
all other risk signalling stays on the petrol scale ("Niemals rot.").
`;

const meta = {
  title: 'Molecules/KPI Circle Card',
  component: KPICircleCard,
  parameters: {
    layout: 'centered',
    docs: { description: { component: DESCRIPTION } },
  },
  tags: ['autodocs'],
  argTypes: {
    layout: { control: 'radio', options: ['horizontal', 'centered'] },
    color: { control: 'radio', options: ['brand', 'success', 'warning', 'error', 'info'] },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof KPICircleCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  args: {
    label: 'Compliance score',
    value: 92,
    valueLabel: '92%',
    layout: 'horizontal',
    color: 'brand',
    trend: { value: '+4%', direction: 'up' },
  },
};

const HORIZONTAL = (
  <div className="grid grid-cols-2 gap-4">
    <KPICircleCard label="Compliance score" value={92} valueLabel="92%" color="brand" trend={{ value: '+4%', direction: 'up' }} />
    <KPICircleCard label="Audits closed" value={86} valueLabel="86%" color="success" trend={{ value: '+12', direction: 'up' }} />
    <KPICircleCard label="Open risks" value={48} valueLabel="48%" color="warning" trend={{ value: '-6', direction: 'down' }} />
    <KPICircleCard label="Critical findings" value={23} valueLabel="23%" color="error" trend={{ value: '+3', direction: 'up' }} />
    <KPICircleCard label="Avg. resolution" value={71} valueLabel="71%" color="info" trend={{ value: '0d', direction: 'neutral' }} />
    <KPICircleCard label="Policy coverage" value={64} valueLabel="64%" color="brand" disabled trend={{ value: '—', direction: 'neutral' }} />
  </div>
);

const CENTERED = (
  <div className="grid grid-cols-3 gap-4">
    <KPICircleCard layout="centered" label="Compliance score" value={92} valueLabel="92%" color="brand" trend={{ value: '+4% vs. Q3', direction: 'up' }} />
    <KPICircleCard layout="centered" label="Audits closed" value={86} valueLabel="86%" color="success" trend={{ value: '+12 this quarter', direction: 'up' }} />
    <KPICircleCard layout="centered" label="Open risks" value={48} valueLabel="48%" color="warning" trend={{ value: '-6 vs. last month', direction: 'down' }} />
    <KPICircleCard layout="centered" label="Critical findings" value={23} valueLabel="23%" color="error" trend={{ value: '+3 new', direction: 'up' }} />
    <KPICircleCard layout="centered" label="Avg. resolution" value={71} valueLabel="71%" color="info" trend={{ value: 'no change', direction: 'neutral' }} />
    <KPICircleCard layout="centered" label="Policy coverage" value={64} valueLabel="64%" color="brand" disabled trend={{ value: '— pending', direction: 'neutral' }} />
  </div>
);

export const Horizontal: Story = {
  args: { value: 0, label: '' },
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => HORIZONTAL,
};

export const Centered: Story = {
  args: { value: 0, label: '' },
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => CENTERED,
};

export const Dark: Story = {
  args: { value: 0, label: '' },
  parameters: { layout: 'fullscreen', controls: { disable: true } },
  render: () => (
    <div className="dark flex flex-col gap-8 bg-[#1F2937] p-8">
      {HORIZONTAL}
      {CENTERED}
    </div>
  ),
};
