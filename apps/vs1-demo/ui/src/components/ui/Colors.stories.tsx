import type { Meta, StoryObj } from '@storybook/react';

// Foundations/Colors — Compass color system (Color foundation page · 74 tokens · 6 namespaces).
// Petrol = brand anchor + risk scale (never red). Gold = scarcity accent.

const meta = {
  title: 'Foundations/Colors',
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta;
export default meta;
type Story = StoryObj;

const PETROL = ['#EBF1F0', '#D1DFDD', '#A8C2BE', '#7AA29C', '#427B72', '#004D40', '#002E26', '#00231D', '#001612', '#000B09', '#000403'];
const GOLD = ['#FDF8E6', '#FBEBBA', '#F8D882', '#F4C44A', '#E6A514', '#D4AF37', '#BCA033', '#96802A', '#6A5B1E', '#3D3411', '#1A1607'];
const NEUTRAL = ['#FAFAFA', '#F4F4F5', '#E5E7EB', '#D1D5DA', '#9CA3AF', '#6B7280', '#5F5B5B', '#374151', '#1F2937', '#0F172A', '#030712'];
const STEPS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

function Scale({ name, colors, star }: { name: string; colors: string[]; star?: number }) {
  return (
    <div className="mb-6">
      <p className="mb-2 font-sans text-sm font-semibold text-fg">{name}</p>
      <div className="flex overflow-hidden rounded-lg border border-stroke-subtle">
        {colors.map((c, i) => (
          <div key={i} className="flex-1">
            <div className="h-16" style={{ background: c }} />
            <div className="px-1 py-1.5 text-center">
              <p className="font-sans text-[10px] font-semibold text-fg">
                {STEPS[i]}{star === i ? ' ★' : ''}
              </p>
              <p className="font-sans text-[9px] uppercase text-fg-tertiary">{c.slice(1)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Token({ label, className, hex }: { label: string; className: string; hex?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`h-10 w-10 shrink-0 rounded-md border border-stroke-subtle ${className}`} />
      <div>
        <p className="font-mono text-xs text-fg">{label}</p>
        {hex && <p className="font-mono text-[10px] text-fg-tertiary">{hex}</p>}
      </div>
    </div>
  );
}

export const Primitives: Story = {
  render: () => (
    <div className="bg-surface p-8">
      <Scale name="Petrol · brand anchor + risk scale" colors={PETROL} star={5} />
      <Scale name="Gold · accent (scarcity)" colors={GOLD} star={5} />
      <Scale name="Neutral · warm" colors={NEUTRAL} star={9} />
    </div>
  ),
};

export const Semantic: Story = {
  render: () => (
    <div className="space-y-8 bg-surface p-8">
      <div>
        <p className="mb-3 font-sans text-sm font-semibold text-fg">Background</p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Token label="bg/primary" className="bg-surface" hex="#FFFFFF" />
          <Token label="bg/secondary" className="bg-surface-secondary" hex="#FAFAFA" />
          <Token label="bg/brand" className="bg-brand" hex="petrol/500" />
          <Token label="bg/accent" className="bg-brand-accent" hex="gold/500" />
        </div>
      </div>
      <div>
        <p className="mb-3 font-sans text-sm font-semibold text-fg">Text (on white)</p>
        <div className="space-y-1">
          <p className="text-fg">text/primary — the calm, structured baseline</p>
          <p className="text-fg-secondary">text/secondary — supporting copy</p>
          <p className="text-fg-tertiary">text/tertiary — captions & meta</p>
          <p className="text-fg-brand">text/brand — petrol emphasis</p>
        </div>
      </div>
      <div>
        <p className="mb-3 font-sans text-sm font-semibold text-fg">Border</p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
          {[
            ['border/subtle', 'border-stroke-subtle'],
            ['border/default', 'border-stroke-default'],
            ['border/strong', 'border-stroke-strong'],
            ['border/input', 'border-stroke-input'],
            ['border/brand', 'border-stroke-brand'],
            ['border/focus', 'border-stroke-focus'],
          ].map(([label, cls]) => (
            <div key={label} className="flex items-center gap-3">
              <div className={`h-10 w-10 shrink-0 rounded-md border-2 bg-surface ${cls}`} />
              <p className="font-mono text-xs text-fg">{label}</p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-3 font-sans text-sm font-semibold text-fg">Risk — petrol scale, never red</p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Token label="risk/low" className="bg-risk-low" />
          <Token label="risk/medium" className="bg-risk-medium" />
          <Token label="risk/high" className="bg-risk-high" />
          <Token label="risk/critical" className="bg-risk-critical" />
        </div>
      </div>
    </div>
  ),
};
