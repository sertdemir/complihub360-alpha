import type { Meta, StoryObj } from '@storybook/react';
import { Globe, FileText, ShieldCheck, Truck } from 'lucide-react';
import { SelectMenu } from './SelectMenu';
import { FormField } from './FormField';

const DESCRIPTION = `
The Compass custom **Select dropdown** — "Select Dropdown Open" (638:524) with
"Select Option Item" rows (637:401). A styled listbox (vs. the native \`Select\`):
hoverable/active rows, selected check, optional icon + description, full keyboard
nav (↑/↓/Home/End/Enter/Esc) and ARIA \`listbox\`/\`option\` semantics. Light + dark.
`;

const meta = {
  title: 'Molecules/Select Menu',
  component: SelectMenu,
  parameters: { layout: 'padded', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
} satisfies Meta<typeof SelectMenu>;
export default meta;
type Story = StoryObj<typeof SelectMenu>;

const DOMAINS = [
  { value: 'tax', label: 'Tax & VAT', description: 'Registration, filing, OSS', icon: <FileText size={16} /> },
  { value: 'gdpr', label: 'GDPR & Data', description: 'DPA, records, DSARs', icon: <ShieldCheck size={16} /> },
  { value: 'epr', label: 'EPR', description: 'Packaging, WEEE, batteries', icon: <Truck size={16} /> },
  { value: 'safety', label: 'Product safety', description: 'CE, GPSR', icon: <Globe size={16} />, disabled: true },
];

const COUNTRIES = [
  { value: 'de', label: 'Germany' },
  { value: 'fr', label: 'France' },
  { value: 'it', label: 'Italy' },
  { value: 'es', label: 'Spain' },
  { value: 'nl', label: 'Netherlands' },
];

const Demo = ({ open }: { open?: boolean }) => (
  <div className="max-w-sm space-y-6">
    <FormField label="Compliance domain" htmlFor="dom">
      <SelectMenu id="dom" options={DOMAINS} defaultValue="gdpr" placeholder="Choose a domain" defaultOpen={open} />
    </FormField>
    <FormField label="Country" htmlFor="ctry">
      <SelectMenu id="ctry" options={COUNTRIES} placeholder="Select country" />
    </FormField>
    <FormField label="Sizes">
      <div className="space-y-2">
        <SelectMenu options={COUNTRIES} inputSize="sm" placeholder="Small" />
        <SelectMenu options={COUNTRIES} inputSize="md" placeholder="Medium" />
        <SelectMenu options={COUNTRIES} inputSize="lg" placeholder="Large" />
      </div>
    </FormField>
    <FormField label="Error" error="Please pick a domain">
      <SelectMenu options={DOMAINS} error placeholder="Required" />
    </FormField>
    <FormField label="Disabled">
      <SelectMenu options={COUNTRIES} disabled defaultValue="de" />
    </FormField>
  </div>
);

export const Light: Story = { render: () => <div className="bg-neutral-50 p-6">{Demo({})}</div> };
export const Dark: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <div className="dark min-h-screen bg-[#1F2937] p-8">{Demo({})}</div>,
};

// Dropdown-open state (638:524) for documentation/screenshots.
export const OpenLight: Story = { render: () => <div className="min-h-[320px] bg-neutral-50 p-6">{Demo({ open: true })}</div> };
export const OpenDark: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <div className="dark min-h-[420px] bg-[#1F2937] p-8">{Demo({ open: true })}</div>,
};
