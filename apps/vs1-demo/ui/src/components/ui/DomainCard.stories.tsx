import type { Meta, StoryObj } from '@storybook/react';
import { DomainCard } from './DomainCard';

// Compass "Domain Card" (1267:530) — eyebrow domain tag + title + status meta on a
// teal-tinted surface. Used to represent a compliance domain across Coverage,
// Dashboard, Workbench and Results.
const meta = {
  title: 'Molecules/DomainCard',
  component: DomainCard,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof DomainCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { eyebrow: 'VAT', title: 'VAT & Indirect Tax', meta: '8 active engagements · rank #3' },
  render: (args) => (
    <div className="w-[360px]">
      <DomainCard {...args} />
    </div>
  ),
};

const DOMAINS = [
  { eyebrow: 'VAT', title: 'VAT & Indirect Tax', meta: '8 active engagements · rank #3' },
  { eyebrow: 'EPR', title: 'Producer Responsibility', meta: '3 active · rank #2 (top-tier)' },
  { eyebrow: 'DAT', title: 'Data Privacy', meta: '1 active · rank #14 (improving)' },
];

const Row = () => (
  <div className="grid w-full max-w-4xl gap-3 sm:grid-cols-3">
    {DOMAINS.map((d) => (
      <DomainCard key={d.eyebrow} {...d} interactive />
    ))}
  </div>
);

// The card is teal-tinted in both themes — light = soft brand wash, dark = slate-teal.
export const Light: Story = {
  args: DOMAINS[0],
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div className="min-h-screen bg-[#eef1f4] p-10">
      <Row />
    </div>
  ),
};

export const Dark: Story = {
  args: DOMAINS[0],
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div className="dark min-h-screen bg-[#1f2937] p-10">
      <Row />
    </div>
  ),
};
