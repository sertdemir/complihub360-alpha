import type { Meta, StoryObj } from '@storybook/react';
import { RiskMap, type RiskMapItem } from './RiskMap';

const DESCRIPTION = `
The wizard **Risk Map** (step 05) — an at-a-glance overview of a company's
compliance obligations, grouped & ordered by **petrol-severity**
(critical → high → medium → low). A summary header shows counts per severity;
each tile carries a **RiskBadge**, the obligation, domain · jurisdiction meta,
and an optional deadline. Set \`groupByRisk={false}\` for a single flat grid.
Risk is shown in petrol — never red. Light + dark.
`;

const meta = {
  title: 'Organisms/Risk Map',
  component: RiskMap,
  parameters: { layout: 'padded', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
} satisfies Meta<typeof RiskMap>;
export default meta;
type Story = StoryObj<typeof RiskMap>;

const ITEMS: RiskMapItem[] = [
  { domain: 'Tax & VAT', obligation: 'OSS quarterly VAT return', risk: 'critical', jurisdiction: 'EU', deadline: '30 Apr 2026' },
  { domain: 'Product safety', obligation: 'GPSR responsible-person designation', risk: 'critical', jurisdiction: 'EU', deadline: '13 Dec 2025' },
  { domain: 'GDPR', obligation: 'Records of processing activities (Art. 30)', risk: 'high', jurisdiction: 'DE', deadline: '31 Mar 2026' },
  { domain: 'EPR', obligation: 'Packaging register (LUCID) annual report', risk: 'high', jurisdiction: 'DE', deadline: '15 May 2026' },
  { domain: 'Tax & VAT', obligation: 'Intrastat dispatch declaration', risk: 'medium', jurisdiction: 'FR', deadline: '10 Feb 2026' },
  { domain: 'GDPR', obligation: 'Cookie-consent banner audit', risk: 'medium', jurisdiction: 'EU' },
  { domain: 'EPR', obligation: 'WEEE electronics take-back registration', risk: 'low', jurisdiction: 'IT', deadline: '30 Jun 2026' },
  { domain: 'Product safety', obligation: 'CE technical documentation refresh', risk: 'low', jurisdiction: 'EU' },
];

const Demo = (props: Partial<React.ComponentProps<typeof RiskMap>>) => <RiskMap {...props} items={ITEMS} />;

export const Light: Story = {
  render: (args) => <div className="bg-neutral-50 p-6">{Demo(args)}</div>,
};
export const Dark: Story = {
  parameters: { layout: 'fullscreen' },
  render: (args) => <div className="dark min-h-screen bg-[#1F2937] p-8">{Demo(args)}</div>,
};
export const Flat: Story = {
  name: 'Flat (ungrouped)',
  render: (args) => <div className="bg-neutral-50 p-6">{Demo({ ...args, groupByRisk: false })}</div>,
};
