import type { Meta, StoryObj } from '@storybook/react';

// Foundations/Typography — Compass type system (37 tokens · 24 styles).
// IBM Plex Serif = Display (≥32pt only). Inter = everything else.

const meta = {
  title: 'Foundations/Typography',
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta;
export default meta;
type Story = StoryObj;

function Row({ style, spec, children, serif = false }: { style: string; spec: string; children: React.ReactNode; serif?: boolean }) {
  return (
    <div className="flex flex-col gap-1 border-b border-stroke-subtle py-4 md:flex-row md:items-baseline md:gap-6">
      <div className="w-44 shrink-0">
        <p className="font-mono text-xs text-fg">{style}</p>
        <p className="font-mono text-[10px] text-fg-tertiary">{spec}</p>
      </div>
      <div className={`min-w-0 text-fg ${serif ? 'font-serif' : 'font-sans'}`}>{children}</div>
    </div>
  );
}

export const Scale: Story = {
  render: () => (
    <div className="bg-surface p-8">
      <p className="mb-2 font-sans text-sm font-semibold text-fg">Display · IBM Plex Serif (≥32pt)</p>
      <Row style="display/2xl" spec="72 / 105 / Bold" serif><span className="text-[72px] font-bold leading-[1.05] tracking-[-0.02em]">Aa</span></Row>
      <Row style="display/lg" spec="48 / 110 / Bold" serif><span className="text-[48px] font-bold leading-[1.1] tracking-[-0.01em]">From uncertainty to action</span></Row>
      <Row style="display/sm" spec="36 / 120 / Bold" serif><span className="text-[36px] font-bold leading-[1.2]">From uncertainty to action</span></Row>

      <p className="mb-2 mt-8 font-sans text-sm font-semibold text-fg">Heading · Inter</p>
      <Row style="h1" spec="32 / 130 / Bold"><span className="text-[32px] font-bold tracking-[-0.005em]">Compliance, structured</span></Row>
      <Row style="h2" spec="24 / 130 / Bold"><span className="text-[24px] font-bold">Compliance, structured</span></Row>
      <Row style="h3" spec="20 / 130 / SemiBold"><span className="text-[20px] font-semibold">Compliance, structured</span></Row>
      <Row style="h4" spec="18 / 140 / SemiBold"><span className="text-[18px] font-semibold">Compliance, structured</span></Row>

      <p className="mb-2 mt-8 font-sans text-sm font-semibold text-fg">Body · Inter</p>
      <Row style="body/lg" spec="18 / 160"><span className="text-[18px] leading-relaxed">CompliHub360 is the orchestration layer between compliance complexity and business reality.</span></Row>
      <Row style="body/md ★" spec="16 / 160"><span className="text-[16px] leading-relaxed">CompliHub360 is the orchestration layer between compliance complexity and business reality.</span></Row>
      <Row style="body/sm" spec="14 / 160"><span className="text-[14px] leading-relaxed">CompliHub360 is the orchestration layer between compliance complexity and business reality.</span></Row>

      <p className="mb-2 mt-8 font-sans text-sm font-semibold text-fg">Label & Caption · Inter</p>
      <Row style="label/md ★" spec="14 / 140 / SemiBold"><span className="text-[14px] font-semibold">Engagement Request senden</span></Row>
      <Row style="label/xs" spec="11 / +2 / SemiBold UPPER"><span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-brand">For verified partners</span></Row>
      <Row style="caption/md" spec="12 / 145"><span className="text-[12px] text-fg-tertiary">UStG §18i · last updated 2026-05</span></Row>
    </div>
  ),
};
