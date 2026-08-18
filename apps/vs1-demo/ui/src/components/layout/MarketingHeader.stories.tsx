import type { Meta, StoryObj } from '@storybook/react';
import { MarketingHeader, type MarketingHeaderProps } from './MarketingHeader';

const DESCRIPTION = `
**MarketingHeader** — the anchor-navigation header for the CompliHub360 landing pages.

- **One audience.** The provider landing and the switch between the two were removed on
  2026-08-18 — with a single audience left, a toggle and a cross-link had nothing to point at.
- **Anchors, not pages.** Menu items are in-page section links with **scroll-spy** — the anchor for
  the section currently in view is highlighted (petrol active state).
- **Responsive.** Desktop = glassmorphism bar (solid + shadow on scroll). Mobile = collapsed bar
  (logo · globe · hamburger) that **expands** into a panel: the login action above a
  **horizontally-scrollable pill row** of anchors (active pill = scroll-spy; edge-clip instead of
  visible controls).
- **Themes.** \`light\` for light pages, \`inverse\` over dark hero sections.
- Built entirely on Compass tokens. Mirrors the Figma components *Header Marketing Desktop /
  Header Marketing Mobile*.
`;

const meta = {
  title: 'Organisms/Marketing Header',
  component: MarketingHeader,
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: DESCRIPTION } },
  },
  tags: ['autodocs'],
  argTypes: {
    theme: { control: 'radio', options: ['light', 'inverse'], description: 'Light page vs. dark hero (inverse).' },
  },
} satisfies Meta<typeof MarketingHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

const ANCHORS: { id: string; label: string }[] = [
  { id: 'how-it-works', label: 'How it works' },
  { id: 'what-we-know', label: 'What we know' },
  { id: 'voices', label: 'Voices' },
  { id: 'pricing', label: 'Pricing' },
];

// Mock page with scroll-spy targets. The header is rendered `embedded` (in normal
// flow) inside a horizontally-scrollable strip so the full-width desktop bar is
// always visible in the docs column, regardless of how narrow it is.
function Demo(args: MarketingHeaderProps) {
  const sections = ANCHORS;
  return (
    <div className="min-h-screen bg-surface">
      <div className="overflow-x-auto">
        <MarketingHeader {...args} embedded />
      </div>
      <main>
        {sections.map((s, i) => (
          <section
            key={s.id}
            id={s.id}
            className={`flex min-h-[80vh] items-center justify-center ${i % 2 ? 'bg-surface-secondary' : 'bg-surface'}`}
          >
            <p className="font-serif text-[2rem] text-fg">{s.label}</p>
          </section>
        ))}
      </main>
    </div>
  );
}

export const Default: Story = {
  args: { theme: 'light' },
  render: (args) => <Demo {...args} />,
};

export const InverseOverDarkHero: Story = {
  args: { theme: 'inverse' },
  render: (args) => (
    <div className="min-h-screen bg-brand">
      <div className="overflow-x-auto">
        <MarketingHeader {...args} embedded />
      </div>
      <div className="flex h-[60vh] items-center justify-center">
        <p className="font-serif text-[2rem] text-fg-inverse">Dark hero section</p>
      </div>
    </div>
  ),
};
