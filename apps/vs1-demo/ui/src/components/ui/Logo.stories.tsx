import type { Meta, StoryObj } from '@storybook/react';
import { Logo, LogoMark, type LogoTone, type LogoLockup } from './Logo';

const meta = {
  title: 'Foundations/Logo',
  component: Logo,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
Das CompliHub360-Logo, 1:1 aus Compass (Figma-Node \`712:266\`).

Das Component-Set führt sechs Varianten über eine Property:

| Lockup | Aufbau | Maße |
| --- | --- | --- |
| \`default\` | Bildmarke + Wortmarke | 144.594 × 40.018 |
| \`bildmarke\` | nur das Symbol | 40.594 × 40.018 |
| \`wortmarke\` | nur der Schriftzug | 101 × 20.701 |

Dazu \`tone\`: \`light\` für helle Gründe, \`dark\` für dunkle.

**Farblogik** — nur die Ink-Seite kippt, Gold bleibt konstant:

- \`ink\` \`#012E27\` → \`#FFFFFF\` — Globus, "CompliHub"
- \`ring\` \`#0D3B33\` → \`#FFFFFF\` — die beiden Bögen
- \`gold\` \`#C5913B\` — "360", Claim, Linien

Die Höhe steuert \`className\` (\`h-7\`, \`h-9\`, …); die Breite folgt über \`w-auto\`.
Der Claim ist bewusst untranslatiert — er liest sich in jeder Locale gleich.
        `,
      },
    },
  },
  argTypes: {
    lockup: { control: 'select', options: ['default', 'bildmarke', 'wortmarke'] },
    tone: { control: 'inline-radio', options: ['light', 'dark'] },
    href: { control: 'text' },
  },
} satisfies Meta<typeof Logo>;

export default meta;
type Story = StoryObj<typeof meta>;

const TONE_BG: Record<LogoTone, string> = {
  light: 'bg-white',
  dark: 'bg-[#0b1620]',
};
const TONE_LABEL: Record<LogoTone, string> = {
  light: 'light — helle Gründe',
  dark: 'dark — dunkle Gründe',
};
const LOCKUPS: LogoLockup[] = ['default', 'bildmarke', 'wortmarke'];
const TONES: LogoTone[] = ['light', 'dark'];

export const Playground: Story = {
  args: { lockup: 'default', tone: 'light', href: null },
};

/** Alle sechs Varianten des Component-Sets, so wie sie in Compass liegen. */
export const AlleVarianten: Story = {
  args: { href: null },
  render: () => (
    <div className="flex flex-col gap-6">
      {TONES.map((t) => (
        <div key={t} className="flex flex-col gap-2">
          <span className="text-xs font-medium text-neutral-500">{TONE_LABEL[t]}</span>
          <div className={`flex flex-wrap items-center gap-10 rounded-lg p-8 ${TONE_BG[t]}`}>
            {LOCKUPS.map((lk) => (
              <div key={lk} className="flex flex-col items-center gap-3">
                <Logo lockup={lk} tone={t} href={null} />
                <span className={`text-[11px] ${t === 'dark' ? 'text-white/50' : 'text-neutral-400'}`}>
                  {lk}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  ),
};

/**
 * Die real verwendeten Größen. Der Globus trägt bei 22 px noch erkennbare
 * Kontinente — das ist die Untergrenze, unterhalb derer die Bildmarke zur
 * reinen Form wird.
 */
export const Groessen: Story = {
  args: { href: null },
  render: () => (
    <div className="flex flex-col gap-8 bg-white p-8">
      <div className="flex items-end gap-8">
        {['h-[22px]', 'h-7', 'h-9', 'h-10'].map((h) => (
          <div key={h} className="flex flex-col items-center gap-2">
            <LogoMark tone="light" className={`${h} w-auto`} />
            <span className="text-[11px] text-neutral-400">{h}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col items-start gap-5">
        {['h-7', 'h-9', 'h-12'].map((h) => (
          <div key={h} className="flex items-center gap-4">
            <Logo lockup="default" tone="light" href={null} className={`${h} w-auto`} />
            <span className="text-[11px] text-neutral-400">{h}</span>
          </div>
        ))}
      </div>
    </div>
  ),
};

/** Auf den Gründen, auf denen das Logo in der App tatsächlich sitzt. */
export const AufEchtenGruenden: Story = {
  args: { href: null },
  render: () => (
    <div className="flex flex-col gap-4">
      {[
        { bg: 'bg-white', tone: 'light' as LogoTone, label: 'Marketing-Header · Dashboard' },
        { bg: 'bg-[#0b1620]', tone: 'dark' as LogoTone, label: 'Auth-Screens' },
        { bg: 'bg-[#14363a]', tone: 'dark' as LogoTone, label: 'Provider-Onboarding' },
      ].map((s) => (
        <div key={s.label} className={`flex items-center gap-6 rounded-lg p-6 ${s.bg}`}>
          <Logo lockup="default" tone={s.tone} href={null} className="h-9 w-auto" />
          <span className={`text-xs ${s.tone === 'dark' ? 'text-white/60' : 'text-neutral-500'}`}>
            {s.label}
          </span>
        </div>
      ))}
    </div>
  ),
};
