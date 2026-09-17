import type { Meta, StoryObj } from '@storybook/react';
import { Logo, type LogoTone, type LogoLockup } from './Logo';

const meta = {
  title: 'Foundations/Logo',
  component: Logo,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
Das CompliHub360-Logo, 1:1 aus Compass (Figma-Node \`2101:1151\`).

Das Component-Set führt zwei Properties — diese API bildet sie ab:

| \`lockup\` | Aufbau | Maße |
| --- | --- | --- |
| \`horizontal\` | Bildmarke + Wortmarke nebeneinander | 144.594 × 40.018 |
| \`stacked\` | Bildmarke über Wortmarke | 101 × 68.719 |
| \`symbol\` | nur die Bildmarke | 40.594 × 40.018 |
| \`wortmarke\` | nur der Schriftzug | 101 × 20.701 |

| \`tone\` | Wofür |
| --- | --- |
| \`on-light\` | helle Gründe — Petrol-Ink, Gold-Akzent |
| \`on-petrol\` | dunkle Marken-Gründe — weiße Ink, Gold bleibt |
| \`mono-white\` | Fotos, unruhige Gründe — alles Weiß, kein Akzent |
| \`mono-black\` | Print, einfarbige Kontexte — alles \`#0F172A\` |

Der Prop heißt \`tone\` statt \`color\`, weil das die Hauskonvention des
Code-Design-Systems ist (Badge, Alert und Stat verwenden sie ebenso). Die
**Werte** sind die aus Figma, damit Design und Code dieselbe Sprache sprechen.

Die Höhe steuert \`className\` (\`h-7\`, \`h-9\`, …), die Breite folgt über \`w-auto\`.
Der Claim ist bewusst untranslatiert — er liest sich in jeder Locale gleich.
        `,
      },
    },
  },
  argTypes: {
    lockup: { control: 'select', options: ['horizontal', 'stacked', 'symbol', 'wortmarke'] },
    tone: { control: 'select', options: ['on-light', 'on-petrol', 'mono-white', 'mono-black'] },
    href: { control: 'text' },
  },
} satisfies Meta<typeof Logo>;

export default meta;
type Story = StoryObj<typeof meta>;

const LOCKUPS: LogoLockup[] = ['horizontal', 'stacked', 'symbol', 'wortmarke'];
const TONES: LogoTone[] = ['on-light', 'on-petrol', 'mono-white', 'mono-black'];

/** Der Grund, auf dem der jeweilige Tone gedacht ist. */
const GRUND: Record<LogoTone, string> = {
  'on-light': 'bg-white',
  'on-petrol': 'bg-[#0b1620]',
  'mono-white': 'bg-[#14363a]',
  'mono-black': 'bg-white',
};
const LABEL_FARBE: Record<LogoTone, string> = {
  'on-light': 'text-neutral-400',
  'on-petrol': 'text-white/50',
  'mono-white': 'text-white/50',
  'mono-black': 'text-neutral-400',
};

export const Playground: Story = {
  args: { lockup: 'horizontal', tone: 'on-light', href: null },
};

/** Die vollständige Matrix des Component-Sets: 4 Lockups × 4 Tones. */
export const Matrix: Story = {
  args: { href: null },
  render: () => (
    <div className="grid grid-cols-4 gap-3">
      {TONES.map((t) => (
        <div key={t} className="flex flex-col gap-3">
          <span className="text-center text-xs font-medium text-neutral-500">{t}</span>
          {LOCKUPS.map((lk) => (
            <div
              key={lk}
              className={`flex h-32 flex-col items-center justify-center gap-3 rounded-lg p-4 ${GRUND[t]}`}
            >
              <Logo lockup={lk} tone={t} href={null} />
              <span className={`text-[11px] ${LABEL_FARBE[t]}`}>{lk}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  ),
};

/**
 * Die real verwendeten Größen. Bei 22 px trägt der Globus noch erkennbare
 * Kontinente — darunter wird die Bildmarke zur reinen Form.
 */
export const Groessen: Story = {
  args: { href: null },
  render: () => (
    <div className="flex flex-col gap-8 bg-white p-8">
      <div className="flex items-end gap-8">
        {['h-[22px]', 'h-7', 'h-9', 'h-10'].map((h) => (
          <div key={h} className="flex flex-col items-center gap-2">
            <Logo lockup="symbol" tone="on-light" href={null} className={h} />
            <span className="text-[11px] text-neutral-400">{h}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col items-start gap-5">
        {['h-7', 'h-9', 'h-12'].map((h) => (
          <div key={h} className="flex items-center gap-4">
            <Logo lockup="horizontal" tone="on-light" href={null} className={h} />
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
        { bg: 'bg-white', tone: 'on-light' as LogoTone, label: 'Marketing-Header · Dashboard' },
        { bg: 'bg-[#0b1620]', tone: 'on-petrol' as LogoTone, label: 'Auth-Screens' },
        { bg: 'bg-[#14363a]', tone: 'on-petrol' as LogoTone, label: 'Provider-Onboarding' },
      ].map((s) => (
        <div key={s.label} className={`flex items-center gap-6 rounded-lg p-6 ${s.bg}`}>
          <Logo lockup="horizontal" tone={s.tone} href={null} className="h-9" />
          <span className={`text-xs ${s.tone === 'on-light' ? 'text-neutral-500' : 'text-white/60'}`}>
            {s.label}
          </span>
        </div>
      ))}
    </div>
  ),
};
