import type { Meta, StoryObj } from '@storybook/react';
import { DashboardSection } from './DashboardSection';
import { Button } from './Button';

const DESCRIPTION = `
**DashboardSection** is a titled wrapper for grouping dashboard blocks. The header
row carries the title (+ optional description) on the left and right-aligned
**actions** (e.g. a Button or filter), separated from the content by a subtle
divider. Stack multiple sections to establish vertical rhythm. Ships **light + dark**.
`;

const meta = {
  title: 'Organisms/Dashboard Section',
  component: DashboardSection,
  parameters: { layout: 'padded', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
} satisfies Meta<typeof DashboardSection>;

export default meta;
type Story = StoryObj<typeof DashboardSection>;

const Placeholder = ({ label }: { label: string }) => (
  <div className="rounded-xl border border-stroke bg-surface p-4">
    <p className="text-[14px] font-medium text-fg">{label}</p>
    <p className="mt-1 text-sm text-fg-secondary">Last activity 2 days ago</p>
  </div>
);

const Demo = () => (
  <div className="max-w-4xl space-y-10">
    <DashboardSection
      title="Active engagements"
      description="Compliance work currently in progress across your markets."
      actions={
        <Button variant="ghost" size="sm">
          View all
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Placeholder label="VAT registration — DE" />
        <Placeholder label="Annual filing — AT" />
        <Placeholder label="Payroll review — CH" />
      </div>
    </DashboardSection>

    <DashboardSection
      title="Upcoming deadlines"
      actions={
        <Button variant="outline" size="sm">
          Filter
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Placeholder label="ESPR report — Apr 30" />
        <Placeholder label="Intrastat — May 12" />
        <Placeholder label="EC Sales List — May 20" />
      </div>
    </DashboardSection>
  </div>
);

export const Light: Story = { render: () => <div className="bg-neutral-50 p-6">{Demo()}</div> };
export const Dark: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <div className="dark min-h-screen bg-[#1F2937] p-8">{Demo()}</div>,
};
