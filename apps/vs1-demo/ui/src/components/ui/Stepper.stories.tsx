import type { Meta, StoryObj } from '@storybook/react';
import { Stepper } from './Stepper';

const DESCRIPTION = `
**Stepper** mirrors the Compass Wizard / Onboarding steps: completed = petrol + check,
active = petrol + number, upcoming = neutral outline. Supports **horizontal** and
**vertical** orientation. Ships **light + dark**.
`;

const meta = {
  title: 'Molecules/Stepper',
  component: Stepper,
  parameters: { layout: 'padded', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
} satisfies Meta<typeof Stepper>;

export default meta;
type Story = StoryObj<typeof Stepper>;

const STEPS = [
  { label: 'Markets' },
  { label: 'Operations' },
  { label: 'Domains' },
  { label: 'Risk' },
  { label: 'Review' },
];

// Step 2 (Domains) failed validation; step 5 (Review) is not yet available.
const STEPS_WITH_ERROR = [
  { label: 'Markets' },
  { label: 'Operations' },
  { label: 'Domains', state: 'error' as const },
  { label: 'Risk' },
  { label: 'Review', state: 'disabled' as const },
];

const Demo = () => (
  <div className="max-w-2xl space-y-10">
    <div>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-fg-tertiary">Horizontal</p>
      <Stepper steps={STEPS} current={2} />
    </div>
    <div>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-fg-tertiary">Error + disabled step</p>
      <Stepper steps={STEPS_WITH_ERROR} current={3} />
    </div>
    <div className="space-y-6">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-tertiary">Sizes (sm · md · lg)</p>
      {(['sm', 'md', 'lg'] as const).map((sz) => (
        <Stepper key={sz} steps={STEPS} current={2} size={sz} />
      ))}
    </div>
    <div>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-fg-tertiary">Vertical</p>
      <Stepper steps={STEPS} current={2} orientation="vertical" />
    </div>
  </div>
);

export const Light: Story = { render: () => <div className="bg-neutral-50 p-6">{Demo()}</div> };
export const Dark: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <div className="dark min-h-screen bg-[#1F2937] p-8">{Demo()}</div>,
};

// variant="inline" — Compass "Step Inline" (2273:276). Die Textzeile fuer kurze
// Ablaeufe ueber einem Blatt oder Formular.
const INLINE = [{ label: 'Anmeldung' }, { label: 'Beta-Vereinbarung' }, { label: 'Ihre Risk Map' }];
const InlineDemo = () => (
  <div className="max-w-2xl space-y-8">
    {[0, 1, 2].map((current) => (
      <div key={current}>
        <p className="mb-2 text-[11px] font-semibold text-fg-tertiary">Schritt {current + 1} aktiv</p>
        <Stepper variant="inline" steps={INLINE} current={current} aria-label="Schritte" doneLabel="erledigt" />
      </div>
    ))}
    <div className="w-[300px]">
      <p className="mb-2 text-[11px] font-semibold text-fg-tertiary">Schmal, 300 px: bricht um</p>
      <Stepper variant="inline" steps={INLINE} current={1} aria-label="Schritte" doneLabel="erledigt" />
    </div>
    <div>
      <p className="mb-2 text-[11px] font-semibold text-fg-tertiary">Fehler und gesperrt</p>
      <Stepper
        variant="inline"
        steps={[{ label: 'Anmeldung' }, { label: 'Beta-Vereinbarung', state: 'error' }, { label: 'Ihre Risk Map', state: 'disabled' }]}
        current={1}
        aria-label="Schritte"
        doneLabel="erledigt"
      />
    </div>
  </div>
);

export const Inline: Story = { name: 'Inline (Textzeile)', render: () => <div className="bg-white p-6">{InlineDemo()}</div> };
export const InlineDark: Story = {
  name: 'Inline (dark)',
  parameters: { layout: 'fullscreen' },
  render: () => <div className="dark min-h-screen bg-[#1F2937] p-8">{InlineDemo()}</div>,
};
