import type { Meta, StoryObj } from '@storybook/react';
import { Footer } from './Footer';

const DESCRIPTION = `
**Footer** — marketing site footer that closes both landing pages. Petrol surface
with the inverse **stacked Logo**, gold-accented link-column headers and a bottom
legal bar (copyright + legal links). Content is prop-driven (\`columns\`, \`legal\`,
\`blurb\`, \`owner\`, \`year\`) with sensible CompliHub defaults; layout responds from a
single stacked column on mobile to a 12-col grid on desktop.
`;

const meta = {
  title: 'Organisms/Footer',
  component: Footer,
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: DESCRIPTION } },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Footer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Minimal: Story = {
  args: {
    columns: [
      { title: 'Product', links: [{ label: 'How it works', href: '#' }, { label: 'Pricing', href: '#' }] },
      { title: 'Legal', links: [{ label: 'Privacy', href: '#' }, { label: 'Terms', href: '#' }] },
    ],
    blurb: 'Compliance, simplified.',
  },
};
