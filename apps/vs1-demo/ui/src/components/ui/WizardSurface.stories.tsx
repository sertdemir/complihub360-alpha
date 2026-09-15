import type { Meta, StoryObj } from '@storybook/react';
import { WizardSurface } from './WizardSurface';
import { Logo } from './Logo';
import { Tag } from './Tag';
import { Button } from './Button';

const DESCRIPTION = `
The Compass **Wizard Surface** (744:2 / 751:903) — the brand-defining **three-layer
petrol** doctrine: a dark petrol outer shell (topbar + stepper rail) wrapping a light
inner card with a **Plex-Serif** headline. \`stepperOrientation\` switches the rail
vertical (left)/horizontal (top). Responsive: <lg collapses to the mobile wizard
(gold progress bar + stacked full-width buttons). Light + dark.
`;

const meta = {
  title: 'Organisms/Wizard Surface',
  component: WizardSurface,
  parameters: { layout: 'padded', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
} satisfies Meta<typeof WizardSurface>;
export default meta;
type Story = StoryObj<typeof WizardSurface>;

const STEPS = [
  { label: 'Profile', description: 'Company basics' },
  { label: 'Domains', description: 'Compliance areas' },
  { label: 'Matching', description: 'Find providers' },
  { label: 'Review', description: 'Confirm & send' },
];

const Demo = () => (
  <WizardSurface
    steps={STEPS}
    current={1}
    logo={<Logo lockup="horizontal" tone="on-petrol" />}
    wizardEyebrow="MATCHING WIZARD"
    wizardTitle="Cross-border compliance setup"
    onClose={() => {}}
    eyebrow="Schritt 2 von 4"
    title="Select your compliance domains"
    description="Pick the areas where you need support. We'll match you with vetted providers for each."
    footer={
      <>
        <Button variant="ghost">Back</Button>
        <Button>Continue</Button>
      </>
    }
  >
    <div className="grid gap-3 sm:grid-cols-2">
      <Tag tone="brand">Tax &amp; VAT</Tag>
      <Tag tone="brand">GDPR</Tag>
      <Tag tone="neutral">EPR</Tag>
      <Tag tone="neutral">Product safety</Tag>
    </div>
  </WizardSurface>
);

export const Light: Story = { render: () => <div className="bg-neutral-50 p-6">{Demo()}</div> };
export const Dark: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <div className="dark min-h-screen bg-[#1F2937] p-8">{Demo()}</div>,
};
