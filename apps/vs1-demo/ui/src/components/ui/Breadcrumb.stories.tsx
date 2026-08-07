import type { Meta, StoryObj } from '@storybook/react';
import { Home } from 'lucide-react';
import { Breadcrumb } from './Breadcrumb';

const DESCRIPTION = `
**Breadcrumb** renders a navigation path with chevron separators and an optional leading
icon on the first item. Ships **light + dark**.
`;

const meta = {
  title: 'Molecules/Breadcrumb',
  component: Breadcrumb,
  parameters: { layout: 'padded', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
} satisfies Meta<typeof Breadcrumb>;

export default meta;
type Story = StoryObj<typeof Breadcrumb>;

const Demo = () => (
  <Breadcrumb
    items={[
      { label: 'Home', href: '#', icon: <Home size={14} /> },
      { label: 'Domains', href: '#' },
      { label: 'Tax & VAT', href: '#' },
      { label: 'Germany' },
    ]}
  />
);

export const Light: Story = { render: () => <div className="bg-neutral-50 p-6">{Demo()}</div> };
export const Dark: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <div className="dark min-h-screen bg-[#1F2937] p-8">{Demo()}</div>,
};
