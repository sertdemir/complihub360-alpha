import type { Meta, StoryObj } from '@storybook/react';
import { MarketsStep } from './MarketsStep';
import { OperationsStep } from './OperationsStep';
import { DomainsStep } from './DomainsStep';
import { ReviewStep } from './ReviewStep';
import { RiskMapResult } from './RiskMapResult';

// The 5 compliance-wizard step screens (Screens file 1199:403) rebuilt on the
// Compass DS — mode-aware, so they render in DARK via a `.dark` ancestor.
// First screen of each step, desktop + mobile.

const meta = {
  title: 'Screens/Wizard (Dark)',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;
export default meta;
type Story = StoryObj;

const STEPS = [
  { key: 'markets', el: <MarketsStep /> },
  { key: 'operations', el: <OperationsStep /> },
  { key: 'domains', el: <DomainsStep /> },
  { key: 'review', el: <ReviewStep /> },
] as const;

// ── Desktop (dark) — each step full-width on the dark surface ──
function Desktop({ el }: { el: React.ReactNode }) {
  return <div className="dark min-h-screen bg-surface">{el}</div>;
}

// ── Mobile (dark) — each step inside a 390px device frame ──
function Mobile({ el }: { el: React.ReactNode }) {
  return (
    <div className="dark min-h-screen bg-[#0b1320] p-6">
      <div className="mx-auto w-[390px] overflow-hidden rounded-2xl border border-stroke shadow-2xl">{el}</div>
    </div>
  );
}

// ── Phone viewport (dark) — fixed 390×844, footer pinned, body clipped (matches Figma 1650:5587) ──
function Phone({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark min-h-screen bg-[#0b1320] p-6">
      <div className="mx-auto h-[844px] w-[390px] overflow-hidden rounded-[1.6rem] border border-stroke shadow-2xl">
        {children}
      </div>
    </div>
  );
}

export const MarketsDesktop: Story = { name: '01 Markets · Desktop', render: () => <Desktop el={<MarketsStep />} /> };
export const MarketsMobile: Story = { name: '01 Markets · Mobile', render: () => <Mobile el={<MarketsStep />} /> };
export const OperationsDesktop: Story = { name: '02 Operations · Desktop', render: () => <Desktop el={<OperationsStep />} /> };
export const OperationsMobile: Story = { name: '02 Operations · Mobile', render: () => <Mobile el={<OperationsStep />} /> };
export const DomainsDesktop: Story = { name: '03 Domains · Desktop', render: () => <Desktop el={<DomainsStep />} /> };
export const DomainsMobile: Story = { name: '03 Domains · Mobile', render: () => <Phone><DomainsStep className="h-full" /></Phone> };
export const ReviewDesktop: Story = { name: '04 Review · Desktop', render: () => <Desktop el={<ReviewStep />} /> };
export const ReviewMobile: Story = { name: '04 Review · Mobile', render: () => <Mobile el={<ReviewStep />} /> };
export const RiskMapDesktop: Story = { name: '05 Risk Map · Desktop', render: () => <Desktop el={<RiskMapResult />} /> };
export const RiskMapMobile: Story = { name: '05 Risk Map · Mobile', render: () => <Mobile el={<RiskMapResult />} /> };

// All four input steps stacked (dark) for a quick overview.
export const AllStepsDesktop: Story = {
  name: 'All steps · Desktop',
  render: () => (
    <div className="dark bg-surface">
      {STEPS.map((s) => (
        <div key={s.key} className="border-b border-stroke">{s.el}</div>
      ))}
    </div>
  ),
};
