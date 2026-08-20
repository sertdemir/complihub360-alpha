import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Badge, FilterChip, type BadgeTone, type BadgeAppearance } from './Badge';

const DESCRIPTION = `
**Badge / Chip** — small label, big meaning. Ported from the Compass *Badge* page.
Covers every non-risk badge family:

- **Status / label badge** — \`tone\` (neutral · brand · accent · success · warning · error · info)
  × \`appearance\` (solid · soft · outline) × \`size\` (sm · md · lg).
- **Dot badge** — \`dot\` adds a leading status dot in the tone colour.
- **Removable chip** — pass \`onDismiss\` to render a trailing ✕ (active, removable filter).
- **FilterChip** — the interactive, toggleable pill (a real button with a pressed state).

The **risk scale** (its own traffic-light tokens) is intentionally a separate, brand-critical
component — use \`RiskBadge\`, not a red \`error\` badge, for risk.
`;

const meta = {
  title: 'Atoms/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
    docs: { description: { component: DESCRIPTION } },
  },
  tags: ['autodocs'],
  argTypes: {
    tone: { control: 'select', options: ['neutral', 'brand', 'accent', 'success', 'warning', 'error', 'info'] },
    appearance: { control: 'radio', options: ['solid', 'soft', 'outline'] },
    size: { control: 'radio', options: ['sm', 'md', 'lg'] },
    dot: { control: 'boolean' },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

const TONES: BadgeTone[] = ['neutral', 'brand', 'accent', 'success', 'warning', 'error', 'info'];
const APPEARANCES: BadgeAppearance[] = ['solid', 'soft', 'outline'];

export const Playground: Story = {
  args: { tone: 'brand', appearance: 'soft', size: 'md', children: 'Badge' },
};

export const AllVariants: Story = {
  parameters: { layout: 'fullscreen', controls: { disable: true } },
  render: () => (
    <div className="min-h-screen space-y-8 bg-surface p-8">
      {APPEARANCES.map((ap) => (
        <section key={ap}>
          <h3 className="mb-3 text-body-sm font-semibold capitalize text-fg-secondary">{ap}</h3>
          <div className="flex flex-wrap items-center gap-3">
            {TONES.map((tone) => (
              <Badge key={tone} tone={tone} appearance={ap}>
                {tone}
              </Badge>
            ))}
          </div>
        </section>
      ))}

      <section>
        <h3 className="mb-3 text-body-sm font-semibold text-fg-secondary">Sizes</h3>
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="brand" size="sm">small</Badge>
          <Badge tone="brand" size="md">medium</Badge>
          <Badge tone="brand" size="lg">large</Badge>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-body-sm font-semibold text-fg-secondary">With dot</h3>
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="success" dot>Active</Badge>
          <Badge tone="warning" dot>Pending</Badge>
          <Badge tone="error" dot appearance="soft">Failed</Badge>
          <Badge tone="neutral" dot appearance="outline">Draft</Badge>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-body-sm font-semibold text-fg-secondary">Real labels</h3>
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="success" appearance="soft">94% match</Badge>
          <Badge tone="accent" appearance="solid" size="sm">SPONSORED</Badge>
          <Badge tone="brand" appearance="solid" size="sm">BETA</Badge>
          <Badge tone="info" appearance="soft" size="sm">NEW</Badge>
          <Badge tone="neutral" appearance="outline">Tier 2</Badge>
        </div>
      </section>
    </div>
  ),
};

export const RemovableChips: Story = {
  parameters: { layout: 'centered', controls: { disable: true } },
  render: () => {
    const [chips, setChips] = useState(['Germany', 'VAT', 'High risk', 'EPR']);
    return (
      <div className="flex flex-wrap items-center gap-2">
        {chips.map((c) => (
          <Badge key={c} tone="brand" appearance="soft" onDismiss={() => setChips((cs) => cs.filter((x) => x !== c))}>
            {c}
          </Badge>
        ))}
        {chips.length === 0 && <span className="text-body-sm text-fg-tertiary">All filters cleared</span>}
      </div>
    );
  },
};

export const FilterChips: Story = {
  parameters: { layout: 'centered', controls: { disable: true } },
  render: () => {
    const options = ['All', 'Tax & VAT', 'Data Privacy', 'EPR', 'Marketing', 'Corporate'];
    const [active, setActive] = useState('All');
    return (
      <div className="flex flex-wrap items-center gap-2">
        {options.map((o) => (
          <FilterChip key={o} selected={active === o} onClick={() => setActive(o)}>
            {o}
          </FilterChip>
        ))}
      </div>
    );
  },
};

export const Dark: Story = {
  args: { children: '' },
  parameters: { layout: 'fullscreen', controls: { disable: true } },
  render: () => (
    <div className="dark space-y-3 bg-[#1F2937] p-8">
      {APPEARANCES.map((ap) => (
        <div key={ap} className="flex flex-wrap items-center gap-3">
          {TONES.map((t) => (
            <Badge key={t} tone={t} appearance={ap}>
              {t}
            </Badge>
          ))}
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Badge tone="success" dot>Active</Badge>
        <Badge tone="warning" dot appearance="soft">Pending</Badge>
        <Badge tone="brand" appearance="solid" size="sm">BETA</Badge>
        <Badge tone="info" appearance="soft" size="sm">NEW</Badge>
      </div>
    </div>
  ),
};
