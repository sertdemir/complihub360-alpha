import type { Meta, StoryObj } from '@storybook/react';

// Foundations/Gradients — the gradient patterns used across CompliHub360 surfaces:
// the petrol brand wash (marketing dark bands), the surface-to-surface fade
// (section transitions), edge fades (tickers/carousels) and the radial brand
// glow (hero ambience). Derived from real usage, not ad-hoc.

const meta = {
  title: 'Foundations/Gradients',
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta;
export default meta;
type Story = StoryObj;

const Swatch = ({ label, sub, className, children }: { label: string; sub: string; className: string; children?: React.ReactNode }) => (
  <div>
    <div className={`relative h-32 w-full overflow-hidden rounded-2xl border border-stroke ${className}`}>{children}</div>
    <p className="mt-2 text-sm font-semibold text-fg">{label}</p>
    <p className="font-mono text-[11px] text-fg-tertiary">{sub}</p>
  </div>
);

const Demo = () => (
  <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
    <Swatch label="Brand wash" sub="from-petrol-500 → petrol-700" className="bg-gradient-to-br from-[#004d40] to-[#00231d]" />
    <Swatch label="Brand → accent" sub="petrol → gold (CTA bands)" className="bg-gradient-to-r from-[#004d40] via-[#00352b] to-[#bca033]" />
    <Swatch label="Surface fade" sub="from-surface-secondary → surface" className="bg-gradient-to-b from-surface-secondary to-surface" />
    <Swatch label="Edge fade" sub="from-surface → transparent (ticker mask)" className="bg-surface-secondary">
      <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-surface to-transparent" />
      <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-surface to-transparent" />
    </Swatch>
    <Swatch label="Radial brand glow" sub="primary-500/30 blur ambience" className="bg-surface">
      <div className="absolute -right-10 -top-12 h-44 w-56 rounded-full bg-primary-500/30 blur-[80px]" />
      <div className="absolute -bottom-12 left-4 h-40 w-40 rounded-full bg-accent-400/25 blur-[80px]" />
    </Swatch>
    <Swatch label="Subtle tint" sub="from-primary-50/60 → transparent (cards)" className="bg-surface">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50/60 to-transparent dark:from-primary-500/15" />
    </Swatch>
  </div>
);

export const Light: Story = { render: () => <div className="bg-surface p-8">{Demo()}</div> };
export const Dark: Story = { render: () => <div className="dark min-h-screen bg-[#1F2937] p-8">{Demo()}</div> };
