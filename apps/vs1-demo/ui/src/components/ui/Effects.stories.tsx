import type { Meta, StoryObj } from '@storybook/react';

// Foundations/Effects — blur & transparency. Two blur families: backdrop-blur
// (glassmorphism — sticky nav, modal/drawer scrims, hero glass card) and ambient
// blur (soft brand blobs behind sections, BackgroundDepth). Plus the alpha ramp
// used for overlays and translucent surfaces.

const meta = {
  title: 'Foundations/Effects',
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta;
export default meta;
type Story = StoryObj;

const Glass =({ label, cls }: { label: string; cls: string }) => (
  <div className="relative h-28 overflow-hidden rounded-2xl border border-stroke">
    {/* colored backdrop so the blur is visible */}
    <div className="absolute inset-0 bg-gradient-to-br from-[#004d40] via-[#2f7d6e] to-[#bca033]" />
    <div className={`absolute inset-x-4 bottom-4 top-4 rounded-xl border border-white/40 ${cls}`} />
    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-mono text-[11px] font-semibold text-white drop-shadow">
      {label}
    </span>
  </div>
);

const Demo = () => (
  <div className="space-y-10">
    <section>
      <h3 className="mb-3 text-body-sm font-semibold text-fg-tertiary">Backdrop blur · glassmorphism</h3>
      <div className="grid gap-5 sm:grid-cols-3">
        <Glass label="backdrop-blur-sm" cls="bg-white/30 backdrop-blur-sm" />
        <Glass label="backdrop-blur-md" cls="bg-white/30 backdrop-blur-md" />
        <Glass label="backdrop-blur-xl ★nav" cls="bg-white/30 backdrop-blur-xl" />
      </div>
    </section>

    <section>
      <h3 className="mb-3 text-body-sm font-semibold text-fg-tertiary">Ambient blur · brand blobs</h3>
      <div className="relative h-40 overflow-hidden rounded-2xl border border-stroke bg-surface">
        <div className="absolute -left-10 top-2 h-40 w-56 rounded-full bg-primary-400/25 blur-[90px]" />
        <div className="absolute right-6 -top-8 h-44 w-44 rounded-full bg-accent-400/25 blur-[90px]" />
        <div className="absolute bottom-[-30%] left-1/3 h-48 w-72 rounded-full bg-primary-300/20 blur-[110px]" />
        <span className="absolute left-4 top-4 font-mono text-[11px] text-fg-tertiary">blur-[90–110px] · /20–/25 alpha</span>
      </div>
    </section>

    <section>
      <h3 className="mb-3 text-body-sm font-semibold text-fg-tertiary">Transparency · alpha ramp</h3>
      <div className="grid grid-cols-6 gap-3">
        {['/5', '/10', '/20', '/40', '/70', '/90'].map((a) => (
          <div key={a} className="text-center">
            <div
              className="h-16 rounded-lg border border-stroke"
              style={{ backgroundColor: `rgba(0,77,64,${Number(a.slice(1)) / 100})` }}
            />
            <p className="mt-1.5 font-mono text-[11px] text-fg-tertiary">petrol{a}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-fg-tertiary">
        Scrims use <span className="font-mono">black/50</span>; glass surfaces{' '}
        <span className="font-mono">white/30–85</span>; dark cards layer{' '}
        <span className="font-mono">white/[0.03–0.10]</span>.
      </p>
    </section>
  </div>
);

export const Light: Story = { render: () => <div className="bg-surface p-8">{Demo()}</div> };
export const Dark: Story = { render: () => <div className="dark min-h-screen bg-[#1F2937] p-8">{Demo()}</div> };
