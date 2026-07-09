import type { Meta, StoryObj } from '@storybook/react';

// Foundations/Grid — the responsive column grid + breakpoint scale. Content
// centers up to the container max; the 12-col grid with fluid gutters drives
// section layouts; columns collapse at each breakpoint.

const meta = {
  title: 'Foundations/Grid',
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta;
export default meta;
type Story = StoryObj;

const BREAKPOINTS = [
  ['sm', '600px', 'small tablet'],
  ['md', '768px', 'tablet'],
  ['lg', '1024px', 'laptop'],
  ['xl', '1440px', 'desktop'],
  ['2xl', '1920px', 'wide'],
] as const;

const Cell = ({ children }: { children: React.ReactNode }) => (
  <div className="grid h-12 place-items-center rounded-md bg-brand-light font-mono text-[11px] text-fg-brand ring-1 ring-inset ring-stroke-brand">
    {children}
  </div>
);

const Demo = () => (
  <div className="space-y-10">
    <section>
      <h3 className="mb-3 text-body-sm font-semibold text-fg-tertiary">12-column grid · fluid gutter</h3>
      <div className="grid grid-cols-12 gap-3">
        {Array.from({ length: 12 }, (_, i) => (
          <Cell key={i}>{i + 1}</Cell>
        ))}
      </div>
    </section>

    <section>
      <h3 className="mb-3 text-body-sm font-semibold text-fg-tertiary">Common spans (6·6 / 4·4·4 / 8·4)</h3>
      <div className="space-y-3">
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-6"><Cell>6</Cell></div>
          <div className="col-span-6"><Cell>6</Cell></div>
        </div>
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-4"><Cell>4</Cell></div>
          <div className="col-span-4"><Cell>4</Cell></div>
          <div className="col-span-4"><Cell>4</Cell></div>
        </div>
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-8"><Cell>8 · content</Cell></div>
          <div className="col-span-4"><Cell>4 · rail</Cell></div>
        </div>
      </div>
    </section>

    <section>
      <h3 className="mb-3 text-body-sm font-semibold text-fg-tertiary">Responsive columns (1 → 2 → 4)</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Cell key={i}>auto</Cell>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-fg-tertiary">Resize the canvas: 1 col under sm · 2 cols at sm · 4 cols at lg.</p>
    </section>

    <section>
      <h3 className="mb-3 text-body-sm font-semibold text-fg-tertiary">Breakpoint scale</h3>
      <div className="overflow-hidden rounded-xl border border-stroke">
        {BREAKPOINTS.map(([name, px, desc], i) => (
          <div key={name} className={`flex items-center gap-4 px-4 py-2.5 ${i % 2 ? 'bg-surface' : 'bg-surface-secondary'}`}>
            <span className="w-12 font-mono text-xs font-semibold text-fg-brand">{name}</span>
            <span className="w-20 font-mono text-xs text-fg">{px}</span>
            <span className="text-xs text-fg-secondary">{desc}</span>
          </div>
        ))}
      </div>
    </section>
  </div>
);

export const Light: Story = { render: () => <div className="bg-surface p-8">{Demo()}</div> };
export const Dark: Story = { render: () => <div className="dark min-h-screen bg-[#1F2937] p-8">{Demo()}</div> };
