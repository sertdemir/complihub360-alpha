import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Pagination } from './Pagination';

const DESCRIPTION = `
**Pagination** — type \`numbers\` (prev / numbered pages with ellipsis / next),
\`dots\` (dot indicators), or \`simple\` (‹ Prev / "Page X of Y" / Next ›). The active
page uses the petrol brand fill. Ships **light + dark**.
`;

const meta = {
  title: 'Molecules/Pagination',
  component: Pagination,
  parameters: { layout: 'padded', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof Pagination>;

const Demo = () => {
  const [page, setPage] = useState(3);
  return <Pagination page={page} totalPages={12} onPageChange={setPage} />;
};

const AllTypes = () => {
  const [numbersPage, setNumbersPage] = useState(3);
  const [dotsPage, setDotsPage] = useState(2);
  const [simplePage, setSimplePage] = useState(3);
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <span className="text-body-sm text-fg-secondary">Numbers</span>
        <Pagination page={numbersPage} totalPages={12} onPageChange={setNumbersPage} />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-body-sm text-fg-secondary">Dots</span>
        <Pagination type="dots" page={dotsPage} totalPages={6} onPageChange={setDotsPage} />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-body-sm text-fg-secondary">Simple</span>
        <Pagination type="simple" page={simplePage} totalPages={12} onPageChange={setSimplePage} />
      </div>
    </div>
  );
};

export const Light: Story = { render: () => <div className="bg-neutral-50 p-6"><Demo /></div> };
export const Dark: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <div className="dark min-h-screen bg-[#1F2937] p-8"><Demo /></div>,
};

export const Types: Story = { render: () => <div className="bg-neutral-50 p-6"><AllTypes /></div> };
export const TypesDark: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <div className="dark min-h-screen bg-[#1F2937] p-8"><AllTypes /></div>,
};
