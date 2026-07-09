import type { Meta, StoryObj } from '@storybook/react';
import { Logo, type LogoTone, type LogoLockup } from './Logo';

const DESCRIPTION = `
**Logo** — the CompliHub360 brand lockup, ported 1:1 from the Compass component
*Logo* (Figma node \`712:266\`). The mark is the exact exported vector geometry
(orbit ring + node-dot, "360" numerals + degree); the wordmark is **"CompliHub"**
Inter Bold 16 and the tagline **"Compliance. Simplified."** Inter Regular 10.

- **\`lockup\`** — \`horizontal\` (mark + wordmark inline · default), \`stacked\`
  (mark over centred wordmark), or \`mark\` (symbol only).
- **\`tone\`** — the four Compass colour variants:
  - \`on-light\` — gold ring · petrol "360" · petrol wordmark · gold tagline (light surfaces)
  - \`on-petrol\` — gold ring · white "360" · white wordmark · gold tagline (petrol / dark hero)
  - \`mono-white\` — everything white (photos, busy backgrounds)
  - \`mono-black\` — everything \`#0F172A\` (print, single-colour contexts)
- **\`href\`** — wraps the lockup in an anchor (defaults to \`/\`); pass \`null\` to render inline.

Always reuse this component — never rebuild the mark from primitives.
`;

const meta = {
  title: 'Foundations/Logo',
  component: Logo,
  parameters: {
    layout: 'centered',
    docs: { description: { component: DESCRIPTION } },
  },
  tags: ['autodocs'],
  argTypes: {
    lockup: { control: 'radio', options: ['horizontal', 'stacked', 'mark'], description: 'Lockup arrangement.' },
    tone: {
      control: 'radio',
      options: ['on-light', 'on-petrol', 'mono-white', 'mono-black'],
      description: 'Colour treatment (mirrors the Compass colour variants).',
    },
    href: { control: 'text', description: 'Anchor href; null renders inline without a link.' },
  },
} satisfies Meta<typeof Logo>;

export default meta;
type Story = StoryObj<typeof meta>;

// Each tone shown on the surface it is designed for.
const TONE_BG: Record<LogoTone, string> = {
  'on-light': 'bg-white',
  'on-petrol': 'bg-brand',
  'mono-white': 'bg-neutral-900',
  'mono-black': 'bg-white',
};
const TONE_LABEL: Record<LogoTone, string> = {
  'on-light': 'On Light',
  'on-petrol': 'On Petrol',
  'mono-white': 'Mono White',
  'mono-black': 'Mono Black',
};

const TONES: LogoTone[] = ['on-light', 'on-petrol', 'mono-white', 'mono-black'];
const LOCKUPS: LogoLockup[] = ['horizontal', 'stacked', 'mark'];

export const Playground: Story = {
  args: { lockup: 'horizontal', tone: 'on-light', href: '/' },
};

export const AllVariants: Story = {
  parameters: { layout: 'fullscreen', controls: { disable: true } },
  render: () => (
    <div className="min-h-screen space-y-10 bg-surface p-8">
      {LOCKUPS.map((lk) => (
        <section key={lk}>
          <h3 className="mb-3 text-body-sm font-semibold capitalize text-fg-secondary">{lk}</h3>
          <div className="flex flex-wrap gap-4">
            {TONES.map((t) => (
              <figure key={t} className="flex flex-col items-center gap-2">
                <div
                  className={`flex h-28 w-60 items-center justify-center rounded-lg border border-stroke-subtle ${TONE_BG[t]}`}
                >
                  <Logo lockup={lk} tone={t} href={null} />
                </div>
                <figcaption className="text-[11px] font-medium uppercase tracking-wide text-fg-tertiary">
                  {TONE_LABEL[t]}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </div>
  ),
};

export const Horizontal: Story = { args: { lockup: 'horizontal', tone: 'on-light', href: null } };
export const Stacked: Story = { args: { lockup: 'stacked', tone: 'on-light', href: null } };
export const MarkOnly: Story = { args: { lockup: 'mark', tone: 'on-light', href: null } };

export const OnPetrol: Story = {
  args: { lockup: 'horizontal', tone: 'on-petrol', href: null },
  decorators: [
    (Story) => (
      <div className="rounded-lg bg-brand p-10">
        <Story />
      </div>
    ),
  ],
};
