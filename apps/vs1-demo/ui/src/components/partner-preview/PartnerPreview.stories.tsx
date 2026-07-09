import type { Meta, StoryObj } from '@storybook/react';
import {
  StructuredRequestCard,
  PartnerInboxList,
  ActiveEngagementCard,
  CoveragePanel,
  TierSummaryPanel,
  demoPartnerData as d,
} from './index';

const DESCRIPTION = `
**Partner preview blocks** — shared, Compass-styled presentational components that
power the provider landing-page previews AND (on adoption) the real partner
dashboard. Fed by a view-model fixture (\`demoPartnerData\`). One source of truth,
on-brand, light + dark.
`;

const meta = {
  title: 'Partner Preview/Blocks',
  parameters: { layout: 'padded', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
} satisfies Meta;
export default meta;
type Story = StoryObj;

const Demo = () => (
  <div className="grid max-w-6xl gap-8 lg:grid-cols-2">
    <div className="space-y-3">
      <p className="text-body-sm font-semibold text-fg-tertiary">StructuredRequestCard (accent)</p>
      <StructuredRequestCard request={d.featuredRequest} frame="accent" />
    </div>
    <div className="space-y-3">
      <p className="text-body-sm font-semibold text-fg-tertiary">StructuredRequestCard (brand + accept)</p>
      <StructuredRequestCard request={d.featuredRequest} frame="brand" showAccept />
    </div>
    <div className="space-y-3 rounded-xl border border-stroke bg-surface p-4">
      <p className="text-body-sm font-semibold text-fg-tertiary">PartnerInboxList</p>
      <PartnerInboxList title="Inbox · 3 new" rightSlot="Filter ▾" leads={[{ id: 'f', title: d.featuredRequest.title, matchPct: 94, meta: '2 Critical · 1 High · arrived 4m ago', dimmed: false }, ...d.inboxLeads]} />
    </div>
    <div className="rounded-xl border border-stroke bg-surface p-4">
      <ActiveEngagementCard engagement={d.activeEngagement} />
    </div>
    <div className="rounded-xl border border-stroke bg-surface p-4">
      <CoveragePanel coverage={d.coverage} />
    </div>
    <div className="lg:col-span-2">
      <TierSummaryPanel tier={d.tier} />
    </div>
  </div>
);

export const Light: Story = { render: () => <div className="bg-neutral-50 p-6">{Demo()}</div> };
export const Dark: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <div className="dark min-h-screen bg-[#1F2937] p-8">{Demo()}</div>,
};
