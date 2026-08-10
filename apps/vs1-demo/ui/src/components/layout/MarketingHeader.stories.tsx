import type { Meta, StoryObj } from '@storybook/react';
import { MarketingHeader, type MarketingHeaderProps } from './MarketingHeader';

const DESCRIPTION = `
**MarketingHeader** — the anchor-navigation header for the CompliHub360 landing pages.

- **Two audiences.** \`entrepreneur\` (the initial landing) and \`provider\`. Each shows its own
  in-page **section anchors** plus a **cross-link** to the other audience's landing
  (For Providers ↔ For Entrepreneurs).
- **Anchors, not pages.** Menu items are in-page section links with **scroll-spy** — the anchor for
  the section currently in view is highlighted (petrol active state).
- **Responsive.** Desktop = glassmorphism bar (solid + shadow on scroll). Mobile = collapsed bar
  (logo · globe · hamburger) that **expands** into a panel: the login action above a
  **horizontally-scrollable pill row** of anchors (active pill = scroll-spy; edge-clip instead of
  visible controls).
- **Themes.** \`light\` for light pages, \`inverse\` over dark hero sections.
- Built entirely on Compass tokens. Mirrors the Figma components *Header Marketing Desktop /
  Header Marketing (Provider) Mobile*.
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
    audience: { control: 'radio', options: ['entrepreneur', 'provider'], description: 'Which landing the header serves.' },
    theme: { control: 'radio', options: ['light', 'inverse'], description: 'Light page vs. dark hero (inverse).' },
  },
} satisfies Meta<typeof MarketingHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

const ANCHORS: Record<string, { id: string; label: string }[]> = {
  entrepreneur: [
    { id: 'how-it-works', label: 'How it works' },
    { id: 'what-we-know', label: 'What we know' },
    { id: 'voices', label: 'Voices' },
    { id: 'pricing', label: 'Pricing' },
  ],
  provider: [
    { id: 'matchmaking', label: 'How matching works' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'performance', label: 'Performance' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'faq', label: 'FAQ' },
  ],
};

// Mock page with scroll-spy targets. The header is rendered `embedded` (in normal
// flow) inside a horizontally-scrollable strip so the full-width desktop bar is
// always visible in the docs column, regardless of how narrow it is.
function Demo(args: MarketingHeaderProps) {
  const sections = ANCHORS[args.audience ?? 'entrepreneur'];
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

export const Entrepreneur: Story = {
  args: { audience: 'entrepreneur', theme: 'light' },
  render: (args) => <Demo {...args} />,
};

export const Provider: Story = {
  args: { audience: 'provider', theme: 'light' },
  render: (args) => <Demo {...args} />,
};

export const InverseOverDarkHero: Story = {
  args: { audience: 'entrepreneur', theme: 'inverse' },
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
