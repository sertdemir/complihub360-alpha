import type { Meta, StoryObj } from '@storybook/react';
import { RiskBadge, RiskDot, type RiskLevel, type RiskStyle, type RiskSize } from './RiskBadge';

const DESCRIPTION = `
**RiskBadge** — the brand-critical risk indicator, ported 1:1 from the Compass
*⚠️ Risk Badge* page (Figma \`726:2\`).

**Doctrine: risk is shown in _petrol_, never red.** Escalation happens through
**lightness on a single petrol hue** — \`low\` (lightest) → \`critical\` (deepest) —
so the system reads as calm and controllable even at critical severity. Red
triggers stress and blocks decisions; petrol signals control and overview.

- **\`level\`** — \`low\` · \`medium\` · \`high\` · \`critical\`
- **\`styleVariant\`** — \`solid\` (full fill, dashboards) · \`soft\` (tinted, the elegant
  default for detail views) · \`outline\` (inline / filter tags) · \`dot\` (dense tables)
- **\`size\`** — \`sm\` · \`md\` · \`lg\`

\`RiskDot\` is the minimal indicator — a single petrol dot for status strips and
very dense tables. Critical keeps a subtle petrol halo (never red).
`;

const meta = {
  title: 'Atoms/RiskBadge',
  component: RiskBadge,
  parameters: {
    layout: 'centered',
    docs: { description: { component: DESCRIPTION } },
  },
  tags: ['autodocs'],
  argTypes: {
    level: { control: 'radio', options: ['low', 'medium', 'high', 'critical'] },
    styleVariant: { control: 'radio', options: ['solid', 'soft', 'outline', 'dot'] },
    size: { control: 'radio', options: ['sm', 'md', 'lg'] },
    children: { control: 'text' },
  },
  args: { level: 'medium', styleVariant: 'soft', size: 'md', children: 'Medium' },
} satisfies Meta<typeof RiskBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

const LEVELS: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
const STYLES: RiskStyle[] = ['solid', 'soft', 'outline', 'dot'];
const SIZES: RiskSize[] = ['sm', 'md', 'lg'];
const LABEL: Record<RiskLevel, string> = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };

export const Playground: Story = {};

// Mirrors the Compass 4 Risk × 4 Style grid (MD).
export const AllVariants: Story = {
  parameters: { layout: 'fullscreen', controls: { disable: true } },
  render: () => (
    <div className="min-h-screen bg-surface p-8">
      <div
        className="grid items-center gap-x-8 gap-y-4"
        style={{ gridTemplateColumns: 'repeat(4, max-content)' }}
      >
        {STYLES.map((st) => (
          <div key={`h-${st}`} className="text-[11px] font-semibold uppercase tracking-wide text-fg-tertiary">
            {st}
          </div>
        ))}
        {LEVELS.map((lv) =>
          STYLES.map((st) => (
            <div key={`${lv}-${st}`} className="flex">
              <RiskBadge level={lv} styleVariant={st}>
                {LABEL[lv]}
              </RiskBadge>
            </div>
          )),
        )}
      </div>
    </div>
  ),
};

export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col gap-4">
      {LEVELS.map((lv) => (
        <div key={lv} className="flex items-center gap-4">
          {SIZES.map((sz) => (
            <RiskBadge key={sz} level={lv} styleVariant="soft" size={sz}>
              {LABEL[lv]}
            </RiskBadge>
          ))}
        </div>
      ))}
    </div>
  ),
};

export const Dots: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-8">
      {LEVELS.map((lv) => (
        <div key={lv} className="flex items-center gap-2">
          <RiskDot level={lv} aria-label={`${LABEL[lv]} risk`} />
          <span className="text-body-sm text-fg">{LABEL[lv]}</span>
        </div>
      ))}
    </div>
  ),
};

// Audit list — Soft MD in a risk column (the canonical in-context usage).
export const InContext: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => {
    const rows: { title: string; date: string; level: RiskLevel }[] = [
      { title: 'Atoms/RiskBadge', date: '04.05.2026', level: 'low' },
      { title: 'Atoms/RiskBadge', date: '15.05.2026', level: 'critical' },
      { title: 'Atoms/RiskBadge', date: '22.05.2026', level: 'medium' },
      { title: 'Atoms/RiskBadge', date: '01.06.2026', level: 'high' },
    ];
    return (
      <div className="mx-auto max-w-2xl divide-y divide-stroke-subtle rounded-lg border border-stroke-subtle bg-surface">
        {rows.map((r) => (
          <div key={r.title} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-body-sm font-semibold text-fg">{r.title}</p>
              <p className="text-caption text-fg-tertiary">{r.date}</p>
            </div>
            <RiskBadge level={r.level} styleVariant="soft">
              {LABEL[r.level]}
            </RiskBadge>
          </div>
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
      {(['solid', 'soft', 'outline', 'dot'] as const).map((sv) => (
        <div key={sv} className="flex flex-wrap items-center gap-3">
          {LEVELS.map((lv) => (
            <RiskBadge key={lv} level={lv} styleVariant={sv}>
              {LABEL[lv]}
            </RiskBadge>
          ))}
        </div>
      ))}
    </div>
  ),
};
