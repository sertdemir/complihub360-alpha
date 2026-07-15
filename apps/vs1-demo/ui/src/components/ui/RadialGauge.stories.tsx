import type { Meta, StoryObj } from '@storybook/react';
import { RadialGauge, type GaugeTone } from './RadialGauge';

const DESCRIPTION = `
**RadialGauge** — animated ring for live KPI values. The arc fills on mount / value
change (\`stroke-dashoffset\` transition) and the center number counts up.

- **\`value\`** (0..1) drives the arc fill.
- **\`percent\`** feeds the counted-up center number; pass **\`centerText\`** to show a
  custom label instead.
- **\`tone\`** picks a semantic default color (brand · success · warning · error ·
  neutral · gold); **\`color\`** overrides it with any hex / CSS var.
- **\`ink\` / \`muted\` / \`track\`** let the caller adapt the gauge to a light or dark
  surface — this is how the Founder Cockpit themes it.

Built for the cockpit; a DS-uptake candidate for Compass (variants: tone × size).
`;

const meta = {
  title: 'Data Display/RadialGauge',
  component: RadialGauge,
  parameters: {
    layout: 'centered',
    docs: { description: { component: DESCRIPTION } },
  },
  tags: ['autodocs'],
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 1, step: 0.01 } },
    percent: { control: { type: 'range', min: 0, max: 100, step: 1 } },
    tone: { control: 'select', options: ['brand', 'success', 'warning', 'error', 'neutral', 'gold'] },
    size: { control: { type: 'range', min: 88, max: 220, step: 4 } },
    stroke: { control: { type: 'range', min: 6, max: 20, step: 1 } },
  },
} satisfies Meta<typeof RadialGauge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  args: { value: 0.68, percent: 68, label: 'Confirm rate', tone: 'success', size: 152 },
};

const TONES: GaugeTone[] = ['brand', 'success', 'warning', 'error', 'neutral', 'gold'];

export const Tones: Story = {
  args: { value: 0, label: '' },
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-center gap-6 bg-surface p-8">
      {TONES.map((tone, i) => (
        <RadialGauge key={tone} value={0.3 + i * 0.12} percent={Math.round((0.3 + i * 0.12) * 100)} label={tone} tone={tone} />
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  args: { value: 0, label: '' },
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-end gap-6 bg-surface p-8">
      <RadialGauge value={0.72} percent={72} label="sm" tone="brand" size={104} stroke={9} />
      <RadialGauge value={0.72} percent={72} label="md" tone="brand" size={140} />
      <RadialGauge value={0.72} percent={72} label="lg" tone="brand" size={184} stroke={13} />
    </div>
  ),
};

export const CustomCenter: Story = {
  args: { value: 0, label: '' },
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-center gap-6 bg-surface p-8">
      <RadialGauge value={0.9} centerText="A+" label="Trust score" tone="gold" />
      <RadialGauge value={0.42} centerText="€55k" sublabel="open" label="Invoices" tone="warning" />
    </div>
  ),
};

export const OnDarkSurface: Story = {
  args: { value: 0, label: '' },
  parameters: { layout: 'fullscreen', controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-center gap-8 p-10" style={{ background: '#0b1620' }}>
      {['success', 'warning', 'error', 'brand'].map((tone, i) => (
        <RadialGauge
          key={tone}
          value={0.35 + i * 0.18}
          percent={Math.round((0.35 + i * 0.18) * 100)}
          label={tone}
          tone={tone as GaugeTone}
          ink="#e8edf2"
          muted="#8b98a6"
          track="rgba(255,255,255,0.09)"
        />
      ))}
    </div>
  ),
};
