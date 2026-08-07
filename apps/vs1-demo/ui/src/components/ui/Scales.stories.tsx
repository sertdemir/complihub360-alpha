import type { Meta, StoryObj } from '@storybook/react';

// Foundations/Scales — Compass spacing, radius, elevation, border tokens.

const meta = {
  title: 'Foundations/Scales',
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta;
export default meta;
type Story = StoryObj;

const SPACING = [
  ['spacing/2 · xs', 4], ['spacing/3 · sm', 8], ['spacing/4', 12], ['spacing/5 · md', 16],
  ['spacing/6', 20], ['spacing/7 · lg ★card', 24], ['spacing/8 · xl', 32], ['spacing/9', 40],
  ['spacing/10 · 2xl', 48], ['spacing/11 · 3xl', 64], ['spacing/12 · 4xl', 80], ['spacing/13', 96],
] as const;

const RADIUS = [
  ['none', '0px', 'rounded-none'], ['xs', '2px', 'rounded-xs'], ['sm', '4px', 'rounded-sm'],
  ['md', '6px', 'rounded-md'], ['lg', '8px', 'rounded-lg'], ['xl', '10px', 'rounded-xl'],
  ['2xl ★', '12px', 'rounded-2xl'], ['3xl', '16px', 'rounded-3xl'], ['full', '∞', 'rounded-full'],
] as const;

const SHADOWS = [
  ['shadow/xs', 'shadow-xs'], ['shadow/sm', 'shadow-sm'], ['shadow/md ★', 'shadow-md'],
  ['shadow/lg', 'shadow-lg'], ['shadow/xl', 'shadow-xl'], ['shadow/2xl', 'shadow-2xl'], ['shadow/inner', 'shadow-inner'],
] as const;

export const Spacing: Story = {
  render: () => (
    <div className="bg-surface p-8">
      <div className="space-y-2.5">
        {SPACING.map(([label, px]) => (
          <div key={label} className="flex items-center gap-4">
            <span className="w-40 shrink-0 font-mono text-xs text-fg-tertiary">{label}</span>
            <div className="h-5 bg-brand" style={{ width: px }} />
            <span className="font-mono text-xs text-fg">{px}px</span>
          </div>
        ))}
      </div>
    </div>
  ),
};

export const Radius: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6 bg-surface p-8">
      {RADIUS.map(([label, val, cls]) => (
        <div key={label} className="text-center">
          <div className={`h-20 w-20 border-2 border-stroke-brand bg-brand-light ${cls}`} />
          <p className="mt-2 font-mono text-xs text-fg">{label}</p>
          <p className="font-mono text-[10px] text-fg-tertiary">{val}</p>
        </div>
      ))}
    </div>
  ),
};

export const Elevation: Story = {
  render: () => (
    <div className="flex flex-wrap gap-8 bg-surface-secondary p-12">
      {SHADOWS.map(([label, cls]) => (
        <div key={label} className="text-center">
          <div className={`h-20 w-28 rounded-2xl bg-surface ${cls}`} />
          <p className="mt-3 font-mono text-xs text-fg">{label}</p>
        </div>
      ))}
    </div>
  ),
};

export const Border: Story = {
  render: () => (
    <div className="space-y-8 bg-surface p-8">
      <div>
        <p className="mb-3 font-sans text-sm font-semibold text-fg">Widths</p>
        <div className="flex gap-6">
          {[['sm', 'border'], ['md ★focus', 'border-2'], ['lg', 'border-4']].map(([l, c]) => (
            <div key={l} className="text-center">
              <div className={`h-16 w-24 rounded-lg border-stroke-strong ${c}`} />
              <p className="mt-2 font-mono text-xs text-fg-tertiary">{l}</p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-3 font-sans text-sm font-semibold text-fg">Colors</p>
        <div className="flex gap-6">
          {[['subtle', 'border-stroke-subtle'], ['default', 'border-stroke-default'], ['strong', 'border-stroke-strong'], ['input', 'border-stroke-input'], ['brand', 'border-stroke-brand'], ['focus', 'border-stroke-focus']].map(([l, c]) => (
            <div key={l} className="text-center">
              <div className={`h-16 w-24 rounded-lg border-2 ${c}`} />
              <p className="mt-2 font-mono text-xs text-fg-tertiary">{l}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
};
