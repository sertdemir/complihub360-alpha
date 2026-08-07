import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import { HomeHero } from './HomeHero';
import '../../i18n/config';

// S1 — User/Entrepreneur hero (Figma 1445:99). Light section; the right-column
// wizard preview can render its compliance (Domains) wizard in light or DARK.
// The embedded AnimatedWizard navigates on completion (useNavigate), so the
// stories need a Router context.

const meta = {
  title: 'Screens/Home Hero',
  component: HomeHero,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <MemoryRouter><Story /></MemoryRouter>],
} satisfies Meta<typeof HomeHero>;
export default meta;
type Story = StoryObj<typeof HomeHero>;

// Hero visual = an AUTO-PLAYING wizard: a fake cursor clicks fields + Continue,
// stepping through Markets → Operations → Domains and looping. (Figma 2463:2242)
export const AnimatedWizardHero: Story = { name: 'Hero · Animated wizard', render: () => <HomeHero wizard="animated" /> };

// Static visual = the REAL dark Domains wizard. Two forms: desktop + mobile.
export const DesktopWizard: Story = { name: 'Hero · Desktop wizard', render: () => <HomeHero wizard="desktop" /> };
export const MobileWizard: Story = { name: 'Hero · Mobile wizard', render: () => <HomeHero wizard="mobile" /> };

// (Legacy) compact preview-card mock — kept for reference.
export const PreviewCard: Story = { name: 'Hero · Preview card (legacy)', render: () => <HomeHero wizard="preview" /> };
