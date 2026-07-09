import type { Meta, StoryObj } from '@storybook/react';
import { SearchResultCard } from './SearchResultCard';

const DESCRIPTION = `
One row in a mixed global-search results list. Mirrors the Compass "Search Result
Card" set (673:188): a petrol **icon container** (kind-specific lucide glyph) on
the left, a small petrol **type-tag** pill with an inline meta line, then the
**title** and a 2-line **snippet** excerpt, with a **chevron-right** affordance on
the right. The whole card is an interactive button (hover lifts the surface).
\`type\` drives both the tag label and the icon. Light + dark.
`;

const meta = {
  title: 'Molecules/Search Result Card',
  component: SearchResultCard,
  parameters: { layout: 'padded', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
} satisfies Meta<typeof SearchResultCard>;
export default meta;
type Story = StoryObj<typeof SearchResultCard>;

// A highlighted matched term inside a snippet.
const Hi = ({ children }: { children: React.ReactNode }) => (
  <mark className="rounded-[2px] bg-brand-light px-[2px] font-medium text-fg-brand">{children}</mark>
);

const ResultList = () => (
  <div className="mx-auto flex max-w-2xl flex-col gap-3">
    <SearchResultCard
      type="audit"
      title="VAT registration review"
      snippet={<>Quarterly <Hi>VAT</Hi> registration review for the DE entity — checks thresholds, OSS eligibility and filing cadence.</>}
      meta="Tax &amp; VAT · DE · updated 3d ago"
      onClick={() => {}}
    />
    <SearchResultCard
      type="document"
      title="OSS filing guide.pdf"
      snippet={<>Step-by-step guide to the One-Stop-Shop <Hi>filing</Hi> workflow, including deadlines and supported member states.</>}
      meta="Knowledge Base · PDF · 1.2 MB"
      onClick={() => {}}
    />
    <SearchResultCard
      type="contact"
      title="Helios Tax Partners"
      snippet={<>Verified partner specialising in cross-border <Hi>VAT</Hi> and indirect-tax compliance for SaaS businesses.</>}
      meta="Partner · DE · responds in 4h"
      onClick={() => {}}
    />
    <SearchResultCard
      type="norm"
      title="§ Art. 30 GDPR — Records of processing"
      snippet={<>Each controller shall maintain a <Hi>record</Hi> of processing activities under its responsibility.</>}
      meta="Regulation · EU · GDPR"
      onClick={() => {}}
    />
  </div>
);

export const Light: Story = {
  render: () => <ResultList />,
};

export const Dark: Story = {
  render: () => <ResultList />,
  parameters: { backgrounds: { default: 'dark' } },
  decorators: [
    (Story) => (
      <div className="dark rounded-xl bg-surface p-6">
        <Story />
      </div>
    ),
  ],
};
